import { describe, expect, it } from "vitest";
import {
  SESSION_STORAGE_KEY,
  STATE_STORAGE_KEY,
  actionTasks,
  addDays,
  claimReadiness,
  createExampleWorkspace,
  daysBetween,
  effectiveClaimStatus,
  estimateReimbursement,
  mergeStates,
  outstandingSubmittedCents,
  parseState,
  safeFilename
} from "@/lib/claimdesk/engine";
import type {
  ClaimDeskState,
  DocumentKind,
  DocumentRecord
} from "@/lib/claimdesk/types";

const WORKSPACE_ID = "abcdefghijklmnopqrstuv";
const FIXED_INSTANT = "2026-07-15T18:00:00.000Z";

function seeded(): ClaimDeskState {
  return createExampleWorkspace(WORKSPACE_ID).state;
}

function activeClaim(state: ClaimDeskState) {
  const claim = state.claims.find((item) => item.id === "claim_july10");
  if (!claim) throw new Error("The example workspace is missing its active claim.");
  return claim;
}

function addDocument(
  state: ClaimDeskState,
  kind: DocumentKind,
  id = `doc_${kind}`
): ClaimDeskState {
  const claim = activeClaim(state);
  const document: DocumentRecord = {
    id,
    claimId: claim.id,
    kind,
    originalName: `${kind}.pdf`,
    mimeType: "application/pdf",
    sizeBytes: 1234,
    storage: "local",
    localBlobId: id,
    uploadedBy: state.members[0].id,
    createdAt: FIXED_INSTANT,
    updatedAt: FIXED_INSTANT
  };
  return { ...state, documents: [...state.documents, document] };
}

describe("claim packet readiness", () => {
  it("keeps a claim in draft until every blocking packet item is present", () => {
    let state = seeded();
    const claim = activeClaim(state);

    const initial = claimReadiness(state, claim);
    expect(initial.filter((item) => item.blocking && item.state !== "complete").map((item) => item.id)).toEqual([
      "soap"
    ]);
    expect(effectiveClaimStatus(state, claim)).toBe("draft");

    state = addDocument(state, "soap-notes");
    expect(claimReadiness(state, claim).filter((item) => item.blocking && item.state !== "complete")).toEqual([]);
    expect(effectiveClaimStatus(state, claim)).toBe("ready");
  });

  it("requires medical history for a carrier's first accident or illness claim", () => {
    let state = addDocument(seeded(), "soap-notes");
    const claim = activeClaim(state);
    claim.firstAccidentIllnessClaim = true;

    expect(claimReadiness(state, claim).find((item) => item.id === "history")).toMatchObject({
      state: "missing",
      blocking: true,
      kind: "medical-history"
    });

    state = addDocument(state, "medical-history");
    expect(claimReadiness(state, claim).find((item) => item.id === "history")?.state).toBe("complete");
  });

  it("applies carrier-specific proof-of-payment and claim-form requirements", () => {
    let state = addDocument(seeded(), "soap-notes");
    const claim = activeClaim(state);
    state = {
      ...state,
      policies: state.policies.map((policy) =>
        policy.id === claim.policyId ? { ...policy, carrierKey: "metlife", carrierName: "MetLife" } : policy
      ),
      documents: state.documents.filter((document) => document.kind !== "receipt")
    };

    const metlife = claimReadiness(state, claim);
    expect(metlife.find((item) => item.id === "receipt")).toMatchObject({ state: "complete", blocking: false });
    expect(metlife.find((item) => item.id === "claim-form")).toMatchObject({ state: "missing", blocking: true });

    state = addDocument(state, "claim-form");
    expect(effectiveClaimStatus(state, claim)).toBe("ready");
  });

  it("requires a lab or imaging report only when diagnostics were performed", () => {
    let state = seeded();
    const claim = activeClaim(state);
    state = { ...state, documents: state.documents.filter((document) => document.kind !== "lab-result") };

    expect(claimReadiness(state, claim).find((item) => item.id === "diagnostics")).toMatchObject({
      state: "missing",
      blocking: true
    });

    claim.diagnosticsPerformed = false;
    expect(claimReadiness(state, claim).find((item) => item.id === "diagnostics")).toMatchObject({
      state: "complete",
      blocking: false
    });
  });

  it("does not rewrite an insurer-controlled status from packet readiness", () => {
    const state = seeded();
    const claim = { ...activeClaim(state), status: "under-review" as const };
    expect(effectiveClaimStatus(state, claim)).toBe("under-review");
  });
});

describe("reimbursement estimates", () => {
  it("applies the remaining deductible before reimbursement", () => {
    const state = seeded();
    const claim = { ...activeClaim(state), eligibleCents: 100_000 };
    const configured = {
      ...state,
      policies: state.policies.map((policy) => ({
        ...policy,
        deductibleRemainingCents: 25_000,
        reimbursementPercent: 90,
        annualLimitCents: null,
        annualPaidCents: 0,
        termsConfirmed: true
      }))
    };

    expect(estimateReimbursement(configured, claim)).toMatchObject({
      eligibleCents: 100_000,
      deductibleAppliedCents: 25_000,
      estimatedCents: 67_500
    });
  });

  it("uses the billed amount when an eligible amount has not been entered", () => {
    const state = seeded();
    const claim = { ...activeClaim(state), billedCents: 10_000, eligibleCents: undefined };
    const estimate = estimateReimbursement(state, claim);

    expect(estimate).toMatchObject({ eligibleCents: 10_000, estimatedCents: 8_000 });
  });

  it("caps reimbursement at the remaining annual benefit", () => {
    const state = seeded();
    const claim = { ...activeClaim(state), eligibleCents: 100_000 };
    const configured = {
      ...state,
      policies: state.policies.map((policy) => ({
        ...policy,
        deductibleRemainingCents: 0,
        reimbursementPercent: 90,
        annualLimitCents: 30_000,
        annualPaidCents: 25_000
      }))
    };

    expect(estimateReimbursement(configured, claim)?.estimatedCents).toBe(5_000);
  });

  it("returns no estimate when the claim has no matching policy", () => {
    const state = seeded();
    expect(estimateReimbursement(state, { ...activeClaim(state), policyId: "policy_missing" })).toBeNull();
  });

  it("does not mutate the confirmed policy balance", () => {
    const state = seeded();
    const before = structuredClone(state.policies[0]);
    estimateReimbursement(state, activeClaim(state));
    expect(state.policies[0]).toEqual(before);
  });

  it("totals expected reimbursement rather than submitted invoice balances", () => {
    const state = seeded();
    expect(outstandingSubmittedCents(state)).toBe(96_000);
  });
});

describe("date-only deadlines", () => {
  it("handles leap days, year boundaries, and negative offsets in UTC", () => {
    expect(addDays("2024-02-28", 1)).toBe("2024-02-29");
    expect(addDays("2024-02-29", 1)).toBe("2024-03-01");
    expect(addDays("2026-12-31", 1)).toBe("2027-01-01");
    expect(addDays("2026-01-01", -1)).toBe("2025-12-31");
  });

  it("calculates calendar-day distance without daylight-saving drift", () => {
    expect(daysBetween("2026-03-07", "2026-03-10")).toBe(3);
    expect(daysBetween("2026-11-01", "2026-11-02")).toBe(1);
    expect(daysBetween("2026-07-15", "2026-07-10")).toBe(-5);
  });

  it("prioritizes a missing-document task when the filing deadline is close", () => {
    const state = seeded();
    const claim = activeClaim(state);
    claim.filingDeadline = "2026-07-25";

    const task = actionTasks(state, "2026-07-15").find((item) => item.claimId === claim.id);
    expect(task).toMatchObject({ priority: 0, action: "documents" });
    expect(task?.detail).toContain("10 days left");
  });
});

describe("state parsing and merge", () => {
  it("round-trips a valid household and rejects unrelated legacy state", () => {
    const state = seeded();
    expect(parseState(JSON.parse(JSON.stringify(state)))).toEqual(state);
    expect(() => parseState({ schemaVersion: 1, activeSchoolYearId: "year_old" })).toThrow("Unsupported household data version");
    expect(() => parseState({ ...state, schemaVersion: 2 })).toThrow("Unsupported household data version");
  });

  it("merges by stable id and keeps the newest version of each record", () => {
    const local = seeded();
    const remote = structuredClone(local);
    local.pets[0] = { ...local.pets[0], name: "Bailey local", updatedAt: "2026-07-16T10:00:00.000Z" };
    remote.pets[0] = { ...remote.pets[0], name: "Bailey remote", updatedAt: "2026-07-16T09:00:00.000Z" };
    remote.members.push({
      id: "member_casey",
      name: "Casey",
      createdAt: "2026-07-16T11:00:00.000Z",
      updatedAt: "2026-07-16T11:00:00.000Z"
    });

    const merged = mergeStates(local, remote);
    expect(merged.pets.find((pet) => pet.id === local.pets[0].id)?.name).toBe("Bailey local");
    expect(merged.members.map((member) => member.id)).toContain("member_casey");
  });

  it("refuses to merge different household workspaces", () => {
    const local = seeded();
    const remote = { ...seeded(), workspaceId: "zyxwvutsrqponmlkjihgfe" };
    expect(() => mergeStates(local, remote)).toThrow("same workspace");
  });

  it("keeps a deleted document removed when a stale device still has the record", () => {
    const local = seeded();
    const remote = structuredClone(local);
    const deleted = local.documents[0];
    local.documents = local.documents.filter((document) => document.id !== deleted.id);
    local.documentDeletions = [{
      id: deleted.id,
      deletedAt: "2026-07-16T12:00:00.000Z",
      updatedAt: "2026-07-16T12:00:00.000Z"
    }];

    const merged = mergeStates(local, remote);
    expect(merged.documents.some((document) => document.id === deleted.id)).toBe(false);
    expect(merged.documentDeletions).toContainEqual(expect.objectContaining({ id: deleted.id }));
  });

  it("adds an empty deletion ledger when parsing a pre-tombstone version-one state", () => {
    const { documentDeletions: _omitted, ...legacyV1 } = seeded();
    expect(parseState(legacyV1).documentDeletions).toEqual([]);
  });
});

describe("safe filenames and storage separation", () => {
  it("uses product-specific storage keys instead of overwriting Yearkeep records", () => {
    expect(STATE_STORAGE_KEY).toBe("petclaimdesk:state:v1");
    expect(SESSION_STORAGE_KEY).toBe("petclaimdesk:session:v1");
    expect(STATE_STORAGE_KEY).not.toContain("hearthfolio");
  });

  it("removes separators and punctuation, supplies a fallback, and limits length", () => {
    expect(safeFilename("Bailey / July 10: invoice?.pdf")).toBe("Bailey_July_10_invoice_.pdf");
    expect(safeFilename("***")).toBe("document");
    expect(safeFilename("x".repeat(200))).toHaveLength(90);
  });

  it("does not preserve a leading dot-segment from an untrusted filename", () => {
    expect(safeFilename("../../private/claim.pdf")).not.toMatch(/^\.+/);
  });
});
