import { carrierProfile, DOCUMENT_LABELS } from "./carriers";
import type {
  Claim,
  ClaimDeskState,
  ClaimEvent,
  ClaimStatus,
  Clinic,
  Cents,
  DocumentKind,
  DocumentRecord,
  Id,
  LocalDate,
  Member,
  Pet,
  Policy,
  Species
} from "./types";

export const STATE_STORAGE_KEY = "petclaimdesk:state:v1";
export const SESSION_STORAGE_KEY = "petclaimdesk:session:v1";
export const BACKUP_FORMAT = "pet-claim-desk-backup";

export function makeId(prefix = "id"): Id {
  const value = typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  return `${prefix}_${value}`;
}

export function nowIso(): string {
  return new Date().toISOString();
}

export function todayLocal(): LocalDate {
  const now = new Date();
  const offset = now.getTimezoneOffset() * 60_000;
  return new Date(now.getTime() - offset).toISOString().slice(0, 10);
}

export function addDays(date: LocalDate, days: number): LocalDate {
  const [year, month, day] = date.split("-").map(Number);
  const value = new Date(Date.UTC(year, month - 1, day));
  value.setUTCDate(value.getUTCDate() + days);
  return value.toISOString().slice(0, 10);
}

export function daysBetween(from: LocalDate, to: LocalDate): number {
  const start = Date.parse(`${from}T00:00:00Z`);
  const end = Date.parse(`${to}T00:00:00Z`);
  return Math.round((end - start) / 86_400_000);
}

export function formatDate(date?: LocalDate, options?: Intl.DateTimeFormatOptions): string {
  if (!date) return "Not set";
  const [year, month, day] = date.split("-").map(Number);
  return new Intl.DateTimeFormat("en-US", options ?? {
    month: "short",
    day: "numeric",
    year: "numeric"
  }).format(new Date(year, month - 1, day));
}

export function formatMoney(cents: Cents | undefined): string {
  if (typeof cents !== "number" || !Number.isFinite(cents)) return "—";
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD"
  }).format(cents / 100);
}

export function amountToCents(value: string): Cents {
  const normalized = value.replace(/[$,\s]/g, "");
  if (!normalized) return 0;
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? Math.max(0, Math.round(parsed * 100)) : 0;
}

export function centsToInput(cents: Cents | undefined): string {
  return typeof cents === "number" ? (cents / 100).toFixed(2) : "";
}

interface CreateWorkspaceInput {
  workspaceId: string;
  householdName: string;
  memberName: string;
  petName: string;
  species: Species;
  breed?: string;
  carrierKey: string;
  carrierName?: string;
  policyNumber?: string;
  reimbursementPercent: number;
  deductibleCents: Cents;
  filingWindowDays?: number;
}

export function createWorkspace(input: CreateWorkspaceInput): {
  state: ClaimDeskState;
  memberId: Id;
} {
  const createdAt = nowIso();
  const memberId = makeId("member");
  const petId = makeId("pet");
  const profile = carrierProfile(input.carrierKey);
  const state: ClaimDeskState = {
    schemaVersion: 1,
    workspaceId: input.workspaceId,
    household: {
      id: makeId("household"),
      name: input.householdName.trim() || "Our household",
      createdAt,
      updatedAt: createdAt
    },
    members: [{
      id: memberId,
      name: input.memberName.trim() || "Me",
      createdAt,
      updatedAt: createdAt
    }],
    pets: [{
      id: petId,
      name: input.petName.trim(),
      species: input.species,
      breed: input.breed?.trim() || undefined,
      createdAt,
      updatedAt: createdAt
    }],
    policies: [{
      id: makeId("policy"),
      petId,
      carrierKey: profile.key,
      carrierName: input.carrierName?.trim() || profile.name,
      policyNumber: input.policyNumber?.trim() || undefined,
      reimbursementPercent: clampPercent(input.reimbursementPercent),
      deductibleType: "annual",
      deductibleCents: input.deductibleCents,
      deductibleRemainingCents: input.deductibleCents,
      annualLimitCents: null,
      annualPaidCents: 0,
      filingWindowDays: input.filingWindowDays || profile.filingWindowDays,
      appealWindowDays: profile.appealWindowDays,
      examFeeTreatment: "unknown",
      termsConfirmed: false,
      createdAt,
      updatedAt: createdAt
    }],
    clinics: [],
    claims: [],
    documents: [],
    documentDeletions: [],
    events: [],
    createdAt,
    updatedAt: createdAt
  };
  return { state, memberId };
}

export function createExampleWorkspace(workspaceId: string): {
  state: ClaimDeskState;
  memberId: Id;
} {
  const createdAt = nowIso();
  const alexId = "member_alex";
  const jamieId = "member_jamie";
  const baileyId = "pet_bailey";
  const misoId = "pet_miso";
  const policyId = "policy_fetch";
  const clinicId = "clinic_aspen";
  const activeClaimId = "claim_july10";
  const submittedClaimId = "claim_june3";

  const members: Member[] = [
    { id: alexId, name: "Alex", createdAt, updatedAt: createdAt },
    { id: jamieId, name: "Jamie", createdAt, updatedAt: createdAt }
  ];
  const pets: Pet[] = [
    { id: baileyId, name: "Bailey", species: "dog", breed: "Mixed breed", birthDate: "2019-04-18", createdAt, updatedAt: createdAt },
    { id: misoId, name: "Miso", species: "cat", breed: "Domestic shorthair", birthDate: "2021-09-03", createdAt, updatedAt: createdAt }
  ];
  const policy: Policy = {
    id: policyId,
    petId: baileyId,
    carrierKey: "fetch",
    carrierName: "Fetch",
    policyNumber: "4821",
    startsOn: "2026-02-01",
    renewsOn: "2027-02-01",
    reimbursementPercent: 80,
    deductibleType: "annual",
    deductibleCents: 50_000,
    deductibleRemainingCents: 0,
    annualLimitCents: null,
    annualPaidCents: 0,
    filingWindowDays: 90,
    appealWindowDays: 90,
    examFeeTreatment: "excluded",
    termsConfirmed: true,
    createdAt,
    updatedAt: createdAt
  };
  const clinic: Clinic = {
    id: clinicId,
    name: "Aspen Creek Veterinary",
    email: "records@example-vet.test",
    createdAt,
    updatedAt: createdAt
  };
  const claims: Claim[] = [
    {
      id: activeClaimId,
      petId: baileyId,
      policyId,
      clinicId,
      visitDate: "2026-07-10",
      reason: "Gastrointestinal follow-up",
      invoiceNumber: "INV-31682",
      billedCents: 84_236,
      eligibleCents: 76_436,
      status: "draft",
      firstAccidentIllnessClaim: false,
      diagnosticsPerformed: true,
      paidInFull: true,
      filingDeadline: "2026-10-08",
      createdBy: jamieId,
      createdAt,
      updatedAt: createdAt
    },
    {
      id: submittedClaimId,
      petId: baileyId,
      policyId,
      clinicId,
      visitDate: "2026-06-03",
      reason: "Emergency visit",
      invoiceNumber: "ER-18402",
      billedCents: 128_475,
      eligibleCents: 120_000,
      status: "under-review",
      firstAccidentIllnessClaim: false,
      diagnosticsPerformed: true,
      paidInFull: true,
      filingDeadline: "2026-09-01",
      carrierClaimNumber: "FC-918274",
      submission: {
        id: "submission_june5",
        channel: "app",
        submittedAt: "2026-06-05T16:20:00.000Z",
        confirmationNumber: "FC-918274",
        documentIds: [],
        documents: [],
        actorId: alexId
      },
      createdBy: alexId,
      createdAt,
      updatedAt: createdAt
    }
  ];
  const documents: DocumentRecord[] = [
    exampleDocument("doc_invoice", activeClaimId, "invoice", "Bailey_Jul10_Invoice.pdf", jamieId, createdAt),
    exampleDocument("doc_receipt", activeClaimId, "receipt", "Bailey_Jul10_Receipt.pdf", jamieId, createdAt),
    exampleDocument("doc_lab", activeClaimId, "lab-result", "Bailey_Jul10_Labs.pdf", jamieId, createdAt)
  ];
  const events: ClaimEvent[] = [
    eventFor(activeClaimId, "document-added", "Jamie saved the laboratory report.", jamieId, "2026-07-15T15:42:00.000Z"),
    eventFor(activeClaimId, "records-requested", "Alex requested complete SOAP notes from Aspen Creek Veterinary.", alexId, "2026-07-14T18:10:00.000Z"),
    eventFor(activeClaimId, "claim-created", "Jamie created this visit and claim workspace.", jamieId, "2026-07-10T21:04:00.000Z"),
    eventFor(submittedClaimId, "claim-submitted", "Alex submitted the claim through the Fetch app.", alexId, "2026-06-05T16:20:00.000Z")
  ];

  return {
    memberId: alexId,
    state: {
      schemaVersion: 1,
      workspaceId,
      household: { id: "household_example", name: "Example household", createdAt, updatedAt: createdAt },
      members,
      pets,
      policies: [policy],
      clinics: [clinic],
      claims,
      documents,
      documentDeletions: [],
      events,
      exampleMode: true,
      createdAt,
      updatedAt: createdAt
    }
  };
}

function exampleDocument(id: Id, claimId: Id, kind: DocumentKind, name: string, actorId: Id, createdAt: string): DocumentRecord {
  return {
    id,
    claimId,
    kind,
    originalName: name,
    mimeType: "application/pdf",
    sizeBytes: 0,
    storage: "local",
    uploadedBy: actorId,
    createdAt,
    updatedAt: createdAt
  };
}

export interface ReadinessItem {
  id: string;
  label: string;
  state: "complete" | "missing" | "needs-review" | "not-applicable";
  blocking: boolean;
  kind?: DocumentKind;
  note: string;
}

export function claimReadiness(state: ClaimDeskState, claim: Claim): ReadinessItem[] {
  const policy = state.policies.find((item) => item.id === claim.policyId);
  const profile = carrierProfile(policy?.carrierKey ?? "other");
  const documents = state.documents.filter((document) => document.claimId === claim.id);
  const has = (...kinds: DocumentKind[]) => documents.some((document) => kinds.includes(document.kind));
  const item = (
    id: string,
    label: string,
    complete: boolean,
    blocking: boolean,
    kind: DocumentKind | undefined,
    note: string
  ): ReadinessItem => ({ id, label, state: complete ? "complete" : "missing", blocking, kind, note });

  const result: ReadinessItem[] = [
    item("invoice", DOCUMENT_LABELS.invoice, has("invoice"), true, "invoice", "Include every invoice page with line items and totals."),
    item("receipt", DOCUMENT_LABELS.receipt, has("receipt") || (!profile.proofOfPayment && claim.paidInFull), profile.proofOfPayment, "receipt", profile.proofOfPayment ? "This carrier commonly requires proof that the balance was paid." : "Useful if the invoice does not show a zero balance."),
    item("soap", DOCUMENT_LABELS["soap-notes"], has("soap-notes"), true, "soap-notes", "The clinical record should explain the reason for the billed care."),
    item("diagnostics", "Diagnostics referenced in the visit", !claim.diagnosticsPerformed || has("lab-result", "imaging"), claim.diagnosticsPerformed, "lab-result", "Attach the finalized lab or imaging report when diagnostics were performed."),
    item("history", DOCUMENT_LABELS["medical-history"], !claim.firstAccidentIllnessClaim || !profile.firstClaimHistory || has("medical-history"), claim.firstAccidentIllnessClaim && profile.firstClaimHistory, "medical-history", "First claims may require the prior medical-history window in the policy."),
    item("claim-form", DOCUMENT_LABELS["claim-form"], !profile.claimForm || has("claim-form"), profile.claimForm, "claim-form", "The carrier publishes a claim-form workflow; confirm whether the portal replaces it."),
    {
      id: "policy",
      label: "Policy terms and deadline confirmed",
      state: policy?.termsConfirmed ? "complete" : "needs-review",
      blocking: false,
      note: "Carrier defaults are only a starting point. Your issued policy controls."
    }
  ];
  return result;
}

export function effectiveClaimStatus(state: ClaimDeskState, claim: Claim): ClaimStatus {
  if (claim.status !== "draft" && claim.status !== "ready") return claim.status;
  const blockingMissing = claimReadiness(state, claim).some((item) => item.blocking && item.state !== "complete");
  return blockingMissing ? "draft" : "ready";
}

export interface ReimbursementEstimate {
  eligibleCents: Cents;
  deductibleAppliedCents: Cents;
  estimatedCents: Cents;
  assumptions: string[];
}

export function estimateReimbursement(state: ClaimDeskState, claim: Claim): ReimbursementEstimate | null {
  const policy = state.policies.find((item) => item.id === claim.policyId);
  if (!policy) return null;
  const eligibleCents = Math.max(0, claim.eligibleCents ?? claim.billedCents);
  const deductibleAppliedCents = Math.min(eligibleCents, Math.max(0, policy.deductibleRemainingCents));
  const reimbursableBase = Math.max(0, eligibleCents - deductibleAppliedCents);
  let estimatedCents = Math.round(reimbursableBase * clampPercent(policy.reimbursementPercent) / 100);
  if (policy.annualLimitCents !== null) {
    estimatedCents = Math.min(estimatedCents, Math.max(0, policy.annualLimitCents - policy.annualPaidCents));
  }
  const assumptions = [
    `Uses ${formatMoney(eligibleCents)} as the estimated eligible amount.`,
    `Applies ${formatMoney(deductibleAppliedCents)} of the recorded remaining deductible.`,
    `Uses the confirmed ${policy.reimbursementPercent}% reimbursement setting.`
  ];
  if (!policy.termsConfirmed) assumptions.push("Policy settings still need confirmation against the issued policy.");
  return { eligibleCents, deductibleAppliedCents, estimatedCents, assumptions };
}

export interface ActionTask {
  id: string;
  claimId: Id;
  priority: number;
  eyebrow: string;
  title: string;
  detail: string;
  action: "documents" | "submit" | "follow-up" | "review";
}

export function actionTasks(state: ClaimDeskState, today = todayLocal()): ActionTask[] {
  const tasks: ActionTask[] = [];
  for (const claim of state.claims) {
    const pet = state.pets.find((item) => item.id === claim.petId);
    const status = effectiveClaimStatus(state, claim);
    const readiness = claimReadiness(state, claim);
    const missing = readiness.filter((item) => item.blocking && item.state !== "complete");
    const deadlineDays = claim.filingDeadline ? daysBetween(today, claim.filingDeadline) : null;

    if (status === "draft" && missing.length) {
      tasks.push({
        id: `${claim.id}:documents`,
        claimId: claim.id,
        priority: deadlineDays !== null && deadlineDays <= 14 ? 0 : 1,
        eyebrow: `${pet?.name ?? "Pet"} · ${formatDate(claim.visitDate, { month: "short", day: "numeric" })}`,
        title: missing.length === 1 ? `${missing[0].label} is still missing` : `${missing.length} claim items are still missing`,
        detail: claim.filingDeadline ? `File by ${formatDate(claim.filingDeadline)}${deadlineDays !== null && deadlineDays >= 0 ? ` · ${deadlineDays} days left` : ""}` : "Complete the packet before submitting.",
        action: "documents"
      });
      continue;
    }
    if (status === "ready") {
      tasks.push({
        id: `${claim.id}:ready`,
        claimId: claim.id,
        priority: 1,
        eyebrow: `${pet?.name ?? "Pet"} · ${formatDate(claim.visitDate, { month: "short", day: "numeric" })}`,
        title: "The claim packet is ready to submit",
        detail: claim.filingDeadline ? `File by ${formatDate(claim.filingDeadline)}` : "Review the packet and open the insurer portal.",
        action: "submit"
      });
      continue;
    }
    if (status === "needs-information") {
      tasks.push({
        id: `${claim.id}:info`,
        claimId: claim.id,
        priority: 0,
        eyebrow: `${pet?.name ?? "Pet"} · insurer request`,
        title: "The insurer needs more information",
        detail: "Open the activity ledger and attach the requested records.",
        action: "documents"
      });
      continue;
    }
    if (["partially-paid", "denied", "appeal-preparing"].includes(status)) {
      tasks.push({
        id: `${claim.id}:review`,
        claimId: claim.id,
        priority: 1,
        eyebrow: `${pet?.name ?? "Pet"} · decision received`,
        title: status === "denied" ? "Review the denial and appeal window" : "The reimbursement needs review",
        detail: claim.eob ? `Decision dated ${formatDate(claim.eob.decidedOn)}.` : "Add the EOB to compare the decision with your policy settings.",
        action: "review"
      });
    }
  }
  return tasks.sort((a, b) => a.priority - b.priority || a.title.localeCompare(b.title));
}

export function outstandingSubmittedCents(state: ClaimDeskState): Cents {
  return state.claims
    .filter((claim) => ["submitted", "needs-information", "under-review", "appeal-submitted"].includes(claim.status))
    .reduce((total, claim) => total + Math.max(0, estimateReimbursement(state, claim)?.estimatedCents ?? 0), 0);
}

export function statusLabel(status: ClaimStatus): string {
  const labels: Record<ClaimStatus, string> = {
    draft: "Needs documents",
    ready: "Ready",
    submitted: "Submitted",
    "needs-information": "Needs information",
    "under-review": "Processing",
    paid: "Paid",
    "partially-paid": "Partially paid",
    denied: "Denied",
    "appeal-preparing": "Appeal preparing",
    "appeal-submitted": "Appeal submitted",
    closed: "Closed"
  };
  return labels[status];
}

export function statusTone(status: ClaimStatus): "attention" | "ready" | "waiting" | "complete" | "danger" {
  if (["draft", "needs-information", "appeal-preparing"].includes(status)) return "attention";
  if (status === "ready") return "ready";
  if (["submitted", "under-review", "appeal-submitted"].includes(status)) return "waiting";
  if (status === "denied") return "danger";
  return "complete";
}

export function claimDocuments(state: ClaimDeskState, claimId: Id): DocumentRecord[] {
  return state.documents.filter((document) => document.claimId === claimId);
}

export function claimEvents(state: ClaimDeskState, claimId: Id): ClaimEvent[] {
  return state.events
    .filter((event) => event.claimId === claimId)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export function addEvent(
  state: ClaimDeskState,
  claimId: Id,
  kind: ClaimEvent["kind"],
  note: string,
  actorId: Id,
  occurredAt = nowIso()
): ClaimDeskState {
  return touchState({
    ...state,
    events: [eventFor(claimId, kind, note, actorId, occurredAt), ...state.events]
  });
}

function eventFor(claimId: Id, kind: ClaimEvent["kind"], note: string, actorId: Id, occurredAt: string): ClaimEvent {
  return {
    id: makeId("event"),
    claimId,
    kind,
    note,
    actorId,
    createdAt: occurredAt,
    updatedAt: occurredAt
  };
}

export function touchState(state: ClaimDeskState): ClaimDeskState {
  return { ...state, updatedAt: nowIso() };
}

export function maskPolicyNumber(value?: string): string {
  if (!value) return "Not added";
  const visible = value.replace(/\s/g, "").slice(-4);
  return `•••• ${visible}`;
}

export function safeFilename(value: string): string {
  return value
    .normalize("NFKD")
    .replace(/[^a-zA-Z0-9._-]+/g, "_")
    .replace(/_+/g, "_")
    .replace(/^[._-]+|[._-]+$/g, "")
    .slice(0, 90) || "document";
}

export function mergeStates(local: ClaimDeskState, remote: ClaimDeskState): ClaimDeskState {
  if (local.workspaceId !== remote.workspaceId) throw new Error("These household records do not belong to the same workspace.");
  const chooseNewest = <T extends { id: Id; updatedAt: string }>(left: T[], right: T[]): T[] => {
    const values = new Map<Id, T>();
    for (const item of [...left, ...right]) {
      const existing = values.get(item.id);
      if (!existing || item.updatedAt.localeCompare(existing.updatedAt) > 0) values.set(item.id, item);
    }
    return Array.from(values.values());
  };
  const documentDeletions = chooseNewest(local.documentDeletions ?? [], remote.documentDeletions ?? []);
  const deletionByDocument = new Map(documentDeletions.map((item) => [item.id, item.deletedAt]));
  const documents = chooseNewest(local.documents, remote.documents).filter((document) => {
    const deletedAt = deletionByDocument.get(document.id);
    return !deletedAt || document.updatedAt.localeCompare(deletedAt) > 0;
  });
  return {
    ...remote,
    household: local.household.updatedAt.localeCompare(remote.household.updatedAt) > 0 ? local.household : remote.household,
    members: chooseNewest(local.members, remote.members),
    pets: chooseNewest(local.pets, remote.pets),
    policies: chooseNewest(local.policies, remote.policies),
    clinics: chooseNewest(local.clinics, remote.clinics),
    claims: chooseNewest(local.claims, remote.claims),
    documents,
    documentDeletions,
    events: chooseNewest(local.events, remote.events),
    exampleMode: local.exampleMode || remote.exampleMode,
    updatedAt: local.updatedAt.localeCompare(remote.updatedAt) > 0 ? local.updatedAt : remote.updatedAt
  };
}

export function parseState(raw: unknown): ClaimDeskState {
  if (!raw || typeof raw !== "object") throw new Error("This file does not contain a Pet Claim Desk household.");
  const state = raw as Partial<ClaimDeskState>;
  if (state.schemaVersion !== 1 || typeof state.workspaceId !== "string") throw new Error("Unsupported household data version.");
  if (!state.household || !Array.isArray(state.members) || !Array.isArray(state.pets) || !Array.isArray(state.policies)) {
    throw new Error("The household backup is incomplete.");
  }
  if (!Array.isArray(state.clinics) || !Array.isArray(state.claims) || !Array.isArray(state.documents) || !Array.isArray(state.events)) {
    throw new Error("The claims data is incomplete.");
  }
  return {
    ...state,
    documentDeletions: Array.isArray(state.documentDeletions) ? state.documentDeletions : []
  } as ClaimDeskState;
}

export function memberName(state: ClaimDeskState, id: Id): string {
  return state.members.find((member) => member.id === id)?.name ?? "Household member";
}

export function fileSizeLabel(bytes: number): string {
  if (!bytes) return "Example file";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function clampPercent(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.min(100, Math.max(0, Math.round(value)));
}
