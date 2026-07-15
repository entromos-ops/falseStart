"use client";

import {
  type ChangeEvent,
  type FormEvent,
  type ReactNode,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState
} from "react";
import { CARRIER_PROFILES, carrierProfile, DOCUMENT_LABELS } from "@/lib/claimdesk/carriers";
import {
  actionTasks,
  addDays,
  addEvent,
  amountToCents,
  centsToInput,
  claimDocuments,
  claimEvents,
  claimReadiness,
  createExampleWorkspace,
  createWorkspace,
  effectiveClaimStatus,
  estimateReimbursement,
  fileSizeLabel,
  formatDate,
  formatMoney,
  makeId,
  maskPolicyNumber,
  memberName,
  mergeStates,
  nowIso,
  outstandingSubmittedCents,
  safeFilename,
  statusLabel,
  statusTone,
  todayLocal,
  touchState
} from "@/lib/claimdesk/engine";
import {
  createWorkspaceCredentials,
  formatShareCode,
  parseShareCode
} from "@/lib/claimdesk/crypto";
import {
  clearLocalDocuments,
  clearLocalState,
  createPortableBackup,
  deleteLocalDocument,
  getLocalDocument,
  loadLocalState,
  loadSession,
  parsePortableBackup,
  putLocalDocument,
  restorePortableDocuments,
  saveLocalState,
  saveSession
} from "@/lib/claimdesk/repository";
import {
  deleteCloudDocument,
  decryptConflict,
  downloadCloudDocument,
  getCloudStatus,
  pullCloudState,
  pushCloudState,
  SyncConflictError,
  uploadCloudDocument
} from "@/lib/claimdesk/sync-client";
import type {
  Claim,
  ClaimDeskState,
  ClaimStatus,
  Clinic,
  DocumentKind,
  DocumentRecord,
  EobReview,
  Id,
  LocalSession,
  Pet,
  Policy,
  Species,
  SubmissionSnapshot
} from "@/lib/claimdesk/types";

type AppTab = "today" | "claims" | "pets" | "settings";
type Sheet =
  | { type: "new-claim" }
  | { type: "add-documents"; claimId: Id }
  | { type: "records-request"; claimId: Id }
  | { type: "submission"; claimId: Id }
  | { type: "eob"; claimId: Id }
  | { type: "add-pet" }
  | { type: "add-policy"; petId: Id; policyId: Id }
  | { type: "edit-policy"; policyId: Id }
  | null;

type SubmissionInput = Omit<SubmissionSnapshot, "id" | "documentIds" | "documents" | "actorId">;

interface PendingDocument {
  id: string;
  file: File;
  kind: DocumentKind;
}

interface SetupCreateInput {
  householdName: string;
  memberName: string;
  petName: string;
  species: Species;
  breed: string;
  carrierKey: string;
  carrierName: string;
  policyNumber: string;
  reimbursementPercent: number;
  deductibleDollars: string;
}

const DOCUMENT_OPTIONS = Object.entries(DOCUMENT_LABELS) as Array<[DocumentKind, string]>;
const MAX_DOCUMENT_BYTES = 50 * 1024 * 1024;
const MAX_UPLOAD_BATCH_BYTES = 150 * 1024 * 1024;
const MAX_PACKET_BYTES = 75 * 1024 * 1024;
const MONEY_PATTERN = "[0-9]+([.][0-9]{1,2})?";

function newPolicyForPet(petId: Id, policyId: Id): Policy {
  const timestamp = nowIso();
  const profile = carrierProfile("fetch");
  return {
    id: policyId,
    petId,
    carrierKey: profile.key,
    carrierName: profile.name,
    reimbursementPercent: 80,
    deductibleType: "annual",
    deductibleCents: 50_000,
    deductibleRemainingCents: 50_000,
    annualLimitCents: null,
    annualPaidCents: 0,
    filingWindowDays: profile.filingWindowDays,
    appealWindowDays: profile.appealWindowDays,
    examFeeTreatment: "unknown",
    termsConfirmed: false,
    createdAt: timestamp,
    updatedAt: timestamp
  };
}

function downloadBlob(filename: string, blob: Blob) {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 1_000);
}

function Brand({ compact = false }: { compact?: boolean }) {
  return (
    <span className={compact ? "brand brand--compact" : "brand"}>
      <span className="brand-mark" aria-hidden="true"><i /><b /></span>
      <span>Pet Claim Desk</span>
    </span>
  );
}

function PetAvatar({ pet, small = false }: { pet?: Pet; small?: boolean }) {
  return (
    <span className={small ? "pet-avatar pet-avatar--small" : "pet-avatar"} aria-hidden="true">
      {pet?.species === "cat" ? "C" : pet?.species === "other" ? "P" : "D"}
    </span>
  );
}

function StatusBadge({ status }: { status: ClaimStatus }) {
  const effective = status;
  return <span className={`status-badge status-badge--${statusTone(effective)}`}><i />{statusLabel(effective)}</span>;
}

function Modal({ children, onClose, labelledBy, wide = false }: {
  children: ReactNode;
  onClose: () => void;
  labelledBy: string;
  wide?: boolean;
}) {
  const dialogRef = useRef<HTMLElement>(null);
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;
  useEffect(() => {
    const previous = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const priorOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const dialog = dialogRef.current;
    const focusable = () => Array.from(dialog?.querySelectorAll<HTMLElement>("button:not([disabled]), a[href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex='-1'])") ?? []);
    window.setTimeout(() => (focusable()[0] ?? dialog)?.focus(), 0);
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        onCloseRef.current();
        return;
      }
      if (event.key !== "Tab") return;
      const items = focusable();
      if (!items.length) return;
      const first = items[0];
      const last = items.at(-1)!;
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = priorOverflow;
      previous?.focus();
    };
  }, []);
  return (
    <div className="modal-backdrop" role="presentation">
      <section
        ref={dialogRef}
        className={wide ? "sheet sheet--wide" : "sheet"}
        role="dialog"
        aria-modal="true"
        aria-labelledby={labelledBy}
        tabIndex={-1}
      >
        <button className="icon-button sheet-close" onClick={onClose} aria-label="Close">×</button>
        {children}
      </section>
    </div>
  );
}

function Setup({
  cloudConfigured,
  onCreate,
  onJoin,
  onExample
}: {
  cloudConfigured: boolean;
  onCreate: (input: SetupCreateInput) => Promise<void>;
  onJoin: (code: string, name: string) => Promise<void>;
  onExample: () => void;
}) {
  const [mode, setMode] = useState<"welcome" | "create" | "join">("welcome");
  const [step, setStep] = useState(1);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [form, setForm] = useState({
    householdName: "Our household",
    memberName: "",
    petName: "",
    species: "dog" as Species,
    breed: "",
    carrierKey: "fetch",
    carrierName: "",
    policyNumber: "",
    reimbursementPercent: 80,
    deductibleDollars: "500"
  });
  const [joinCode, setJoinCode] = useState("");
  const [joinName, setJoinName] = useState("");

  const submitCreate = async (event: FormEvent) => {
    event.preventDefault();
    if (step < 3) {
      setStep((value) => value + 1);
      return;
    }
    setBusy(true);
    setError("");
    try {
      await onCreate(form);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not create the household.");
      setBusy(false);
    }
  };

  const submitJoin = async (event: FormEvent) => {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      await onJoin(joinCode, joinName);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not join that household.");
      setBusy(false);
    }
  };

  if (mode === "welcome") {
    return (
      <main className="welcome-shell">
        <header className="welcome-nav"><Brand /><span className="welcome-beta">Private household beta</span></header>
        <section className="welcome-grid">
          <div className="welcome-copy">
            <p className="eyebrow">The paperwork side of pet care</p>
            <h1>Keep every claim from falling through the cracks.</h1>
            <p className="welcome-lede">
              Bills, SOAP notes, deadlines, submissions, and reimbursements—organized around the next thing your family needs to do.
            </p>
            <div className="welcome-actions">
              <button className="primary-button primary-button--large" onClick={() => setMode("create")}>Set up our household</button>
              <button className="secondary-button secondary-button--large" onClick={() => setMode("join")}>Join with a household code</button>
            </div>
            <button className="quiet-link" onClick={onExample}>Explore with example data</button>
            <div className="trust-row" aria-label="Privacy details">
              <span><i>✓</i> No insurer password</span>
              <span><i>✓</i> Encrypted sharing</span>
              <span><i>✓</i> Portable backup</span>
            </div>
          </div>
          <div className="welcome-preview" aria-label="Example claim action queue">
            <div className="preview-heading"><span>Wednesday, July 15</span><strong>Two things need your attention.</strong></div>
            <div className="preview-task preview-task--attention">
              <span>BAILEY · JULY 10</span>
              <strong>SOAP notes are still missing</strong>
              <p>Your invoice and lab report are saved.</p>
              <button tabIndex={-1}>Request records</button>
            </div>
            <div className="preview-task">
              <span>BAILEY · JUNE 3</span>
              <strong>Fetch has had this claim for 12 days</strong>
              <p>No action is required yet.</p>
            </div>
            <div className="preview-total"><span>Waiting on reimbursement</span><strong>$1,284.75</strong></div>
          </div>
        </section>
        <footer className="welcome-footer">
          <span>This tool organizes records and estimates. It does not determine coverage or provide medical or legal advice.</span>
          <nav><a href="/privacy">Privacy</a><a href="/terms">Terms</a></nav>
        </footer>
      </main>
    );
  }

  if (mode === "join") {
    return (
      <main className="setup-shell">
        <button className="back-link" onClick={() => setMode("welcome")}>← Back</button>
        <section className="setup-card">
          <Brand />
          <p className="eyebrow">Join your household</p>
          <h1>Continue from this phone.</h1>
          <p>Paste the private code from the family member who created the household. The code unlocks the encrypted shared workspace.</p>
          {!cloudConfigured && <div className="notice notice--attention"><strong>Shared sync is not connected yet.</strong><span>The household owner needs to connect private storage before another phone can join.</span></div>}
          <form onSubmit={submitJoin} className="stack-form">
            <label><span>Your name</span><input value={joinName} onChange={(event) => setJoinName(event.target.value)} placeholder="Jamie" required autoFocus /></label>
            <label><span>Household code</span><textarea value={joinCode} onChange={(event) => setJoinCode(event.target.value)} placeholder="PCD1-…" rows={3} required /></label>
            {error && <p className="form-error" role="alert">{error}</p>}
            <button className="primary-button primary-button--full" disabled={busy || !cloudConfigured}>{busy ? "Joining…" : "Join household"}</button>
          </form>
        </section>
      </main>
    );
  }

  const selectedProfile = carrierProfile(form.carrierKey);
  return (
    <main className="setup-shell">
      <button className="back-link" onClick={() => step === 1 ? setMode("welcome") : setStep((value) => value - 1)}>← Back</button>
      <section className="setup-card">
        <div className="setup-progress" aria-label={`Step ${step} of 3`}><i className={step >= 1 ? "active" : ""} /><i className={step >= 2 ? "active" : ""} /><i className={step >= 3 ? "active" : ""} /></div>
        <p className="eyebrow">Step {step} of 3</p>
        <form onSubmit={submitCreate} className="stack-form">
          {step === 1 && <>
            <h1>Create the household desk.</h1>
            <p>You and your wife can use your own names. Every claim action records who did it.</p>
            <label><span>Your name</span><input value={form.memberName} onChange={(event) => setForm({ ...form, memberName: event.target.value })} placeholder="Alex" autoFocus required /></label>
            <label><span>Household name</span><input value={form.householdName} onChange={(event) => setForm({ ...form, householdName: event.target.value })} placeholder="Our household" required /></label>
          </>}
          {step === 2 && <>
            <h1>Add the pet you’re filing for.</h1>
            <p>Start with one. You can add every other pet later.</p>
            <label><span>Pet name</span><input value={form.petName} onChange={(event) => setForm({ ...form, petName: event.target.value })} placeholder="Bailey" autoFocus required /></label>
            <div className="field-row">
              <label><span>Species</span><select value={form.species} onChange={(event) => setForm({ ...form, species: event.target.value as Species })}><option value="dog">Dog</option><option value="cat">Cat</option><option value="other">Other</option></select></label>
              <label><span>Breed <em>optional</em></span><input value={form.breed} onChange={(event) => setForm({ ...form, breed: event.target.value })} placeholder="Mixed breed" /></label>
            </div>
          </>}
          {step === 3 && <>
            <h1>Add the policy basics.</h1>
            <p>These settings produce estimates only. Confirm them against the issued policy when you have it.</p>
            <label><span>Insurance carrier</span><select value={form.carrierKey} onChange={(event) => setForm({ ...form, carrierKey: event.target.value })}>{CARRIER_PROFILES.map((profile) => <option key={profile.key} value={profile.key}>{profile.name}</option>)}</select></label>
            {form.carrierKey === "other" && <label><span>Carrier name</span><input value={form.carrierName} onChange={(event) => setForm({ ...form, carrierName: event.target.value })} placeholder="Insurance company" required /></label>}
            <label><span>Policy number <em>optional</em></span><input value={form.policyNumber} onChange={(event) => setForm({ ...form, policyNumber: event.target.value })} placeholder="Last four is enough for now" /></label>
            <div className="field-row">
              <label><span>Reimbursement</span><div className="input-suffix"><input type="number" min="0" max="100" value={form.reimbursementPercent} onChange={(event) => setForm({ ...form, reimbursementPercent: Number(event.target.value) })} required /><b>%</b></div></label>
              <label><span>Annual deductible</span><div className="input-prefix"><b>$</b><input inputMode="decimal" pattern={MONEY_PATTERN} value={form.deductibleDollars} onChange={(event) => setForm({ ...form, deductibleDollars: event.target.value })} required /></div></label>
            </div>
            <div className="notice"><strong>Starting checklist</strong><span>{selectedProfile.guidance} Confirm the {selectedProfile.filingWindowDays}-day filing suggestion against your policy.</span></div>
          </>}
          {error && <p className="form-error" role="alert">{error}</p>}
          <button className="primary-button primary-button--full" disabled={busy}>{busy ? "Creating…" : step === 3 ? "Open our claim desk" : "Continue"}</button>
        </form>
      </section>
    </main>
  );
}

export default function ClaimDeskApp() {
  const [state, setState] = useState<ClaimDeskState | null>(null);
  const [session, setSession] = useState<LocalSession | null>(null);
  const [booted, setBooted] = useState(false);
  const [tab, setTab] = useState<AppTab>("today");
  const [selectedClaimId, setSelectedClaimId] = useState<Id | null>(null);
  const [sheet, setSheet] = useState<Sheet>(null);
  const [cloudConfigured, setCloudConfigured] = useState(false);
  const [syncState, setSyncState] = useState<"local" | "syncing" | "synced" | "offline">("local");
  const [toast, setToast] = useState("");
  const [syncEpoch, setSyncEpoch] = useState(0);
  const syncInFlight = useRef(false);
  const syncPending = useRef(false);
  const sessionRef = useRef<LocalSession | null>(null);
  const stateRef = useRef<ClaimDeskState | null>(null);
  const importRef = useRef<HTMLInputElement>(null);
  stateRef.current = state;

  const showToast = useCallback((message: string) => {
    setToast(message);
    window.setTimeout(() => setToast(""), 3_200);
  }, []);

  useEffect(() => {
    const localState = loadLocalState();
    const localSession = loadSession();
    sessionRef.current = localSession;
    setState(localState);
    setSession(localSession);
    setBooted(true);
    void getCloudStatus().then(({ configured }) => setCloudConfigured(configured));
    if ("serviceWorker" in navigator) void navigator.serviceWorker.register("/sw.js").catch(() => undefined);
    if (navigator.storage?.persist) void navigator.storage.persist().catch(() => undefined);
  }, []);

  const updateSession = useCallback((next: LocalSession) => {
    sessionRef.current = next;
    setSession(next);
    saveSession(next);
  }, []);

  const synchronize = useCallback(async (snapshot: ClaimDeskState, activeSession: LocalSession, announce = false) => {
    if (!activeSession.syncEnabled) return;
    if (syncInFlight.current) {
      syncPending.current = true;
      return;
    }
    syncInFlight.current = true;
    syncPending.current = false;
    setSyncState("syncing");
    try {
      let revision: number;
      let pushedStateUpdatedAt = snapshot.updatedAt;
      try {
        revision = await pushCloudState(snapshot, activeSession);
      } catch (error) {
        if (!(error instanceof SyncConflictError)) throw error;
        const remote = await decryptConflict(error, activeSession.rootSecret);
        const merged = mergeStates(snapshot, remote);
        saveLocalState(merged);
        setState(merged);
        pushedStateUpdatedAt = merged.updatedAt;
        revision = await pushCloudState(merged, { ...activeSession, syncRevision: error.revision });
      }
      const next = { ...activeSession, syncRevision: revision, lastSyncedAt: nowIso(), lastSyncedStateUpdatedAt: pushedStateUpdatedAt };
      updateSession(next);
      setSyncState("synced");
      const deletionSource = stateRef.current?.workspaceId === snapshot.workspaceId ? stateRef.current : snapshot;
      const deletedPaths: string[] = [];
      for (const deletion of (deletionSource?.documentDeletions ?? []).filter((item) => item.blobPathname && !item.cloudDeletedAt).slice(0, 6)) {
        try {
          await deleteCloudDocument(deletion.blobPathname!, next);
          deletedPaths.push(deletion.blobPathname!);
        } catch {
          // The encrypted tombstone remains queued for the next sync attempt.
        }
      }
      if (deletedPaths.length) {
        const cleanedAt = nowIso();
        setState((current) => current ? touchState({
          ...current,
          documentDeletions: current.documentDeletions.map((item) => deletedPaths.includes(item.blobPathname ?? "")
            ? { ...item, cloudDeletedAt: cleanedAt, updatedAt: cleanedAt }
            : item)
        }) : current);
      }
      if (announce) showToast("Household synced.");
    } catch {
      setSyncState("offline");
      if (announce) showToast("Saved on this device. Shared sync will retry.");
    } finally {
      syncInFlight.current = false;
      if (syncPending.current || (stateRef.current && stateRef.current.updatedAt !== snapshot.updatedAt)) {
        syncPending.current = false;
        setSyncEpoch((value) => value + 1);
      }
    }
  }, [showToast, updateSession]);

  useEffect(() => {
    if (!booted || !state) return;
    saveLocalState(state);
    const activeSession = sessionRef.current;
    if (!activeSession?.syncEnabled) return;
    if (activeSession.lastSyncedStateUpdatedAt === state.updatedAt) return;
    const timer = window.setTimeout(() => void synchronize(state, activeSession), 900);
    return () => window.clearTimeout(timer);
  }, [booted, state, syncEpoch, synchronize]);

  useEffect(() => {
    if (!booted || !state || !session?.syncEnabled || !cloudConfigured) return;
    let cancelled = false;
    void pullCloudState(session).then(({ state: remote, revision }) => {
      if (cancelled) return;
      const merged = mergeStates(state, remote);
      const remoteWasUnchanged = JSON.stringify(merged) === JSON.stringify(remote);
      saveLocalState(merged);
      setState(merged);
      updateSession({
        ...session,
        syncRevision: revision,
        lastSyncedAt: nowIso(),
        lastSyncedStateUpdatedAt: remoteWasUnchanged ? merged.updatedAt : undefined
      });
      setSyncState("synced");
    }).catch(() => setSyncState("offline"));
    return () => { cancelled = true; };
    // Run only once when a persisted shared session boots.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [booted, cloudConfigured]);

  const mutate = useCallback((recipe: (current: ClaimDeskState) => ClaimDeskState) => {
    setState((current) => current ? touchState(recipe(current)) : current);
  }, []);

  const createHousehold = async (input: SetupCreateInput) => {
    const credentials = createWorkspaceCredentials();
    const created = createWorkspace({
      workspaceId: credentials.workspaceId,
      householdName: input.householdName,
      memberName: input.memberName,
      petName: input.petName,
      species: input.species,
      breed: input.breed,
      carrierKey: input.carrierKey,
      carrierName: input.carrierName,
      policyNumber: input.policyNumber,
      reimbursementPercent: input.reimbursementPercent,
      deductibleCents: amountToCents(input.deductibleDollars)
    });
    let nextSession: LocalSession = {
      schemaVersion: 1,
      workspaceId: credentials.workspaceId,
      rootSecret: credentials.rootSecret,
      memberId: created.memberId,
      syncEnabled: cloudConfigured,
      syncRevision: 0
    };
    saveLocalState(created.state);
    saveSession(nextSession);
    sessionRef.current = nextSession;
    setState(created.state);
    setSession(nextSession);
    if (cloudConfigured) {
      const revision = await pushCloudState(created.state, nextSession);
      nextSession = { ...nextSession, syncRevision: revision, lastSyncedAt: nowIso(), lastSyncedStateUpdatedAt: created.state.updatedAt };
      updateSession(nextSession);
      setSyncState("synced");
    }
  };

  const joinHousehold = async (code: string, name: string) => {
    if (!cloudConfigured) throw new Error("Shared household storage is not connected yet.");
    const parsed = parseShareCode(code);
    const temporary: LocalSession = {
      schemaVersion: 1,
      workspaceId: parsed.workspaceId,
      rootSecret: parsed.rootSecret,
      memberId: "pending",
      syncEnabled: true,
      syncRevision: 0
    };
    const pulled = await pullCloudState(temporary);
    const memberId = makeId("member");
    const timestamp = nowIso();
    const joined = touchState({
      ...pulled.state,
      members: [...pulled.state.members, { id: memberId, name: name.trim(), createdAt: timestamp, updatedAt: timestamp }]
    });
    const nextSession = { ...temporary, memberId, syncRevision: pulled.revision };
    const revision = await pushCloudState(joined, nextSession);
    const savedSession = { ...nextSession, syncRevision: revision, lastSyncedAt: nowIso(), lastSyncedStateUpdatedAt: joined.updatedAt };
    saveLocalState(joined);
    saveSession(savedSession);
    sessionRef.current = savedSession;
    setState(joined);
    setSession(savedSession);
    setSyncState("synced");
  };

  const openExample = () => {
    const credentials = createWorkspaceCredentials();
    const created = createExampleWorkspace(credentials.workspaceId);
    const exampleSession: LocalSession = {
      schemaVersion: 1,
      workspaceId: credentials.workspaceId,
      rootSecret: credentials.rootSecret,
      memberId: created.memberId,
      syncEnabled: false,
      syncRevision: 0
    };
    saveLocalState(created.state);
    saveSession(exampleSession);
    sessionRef.current = exampleSession;
    setState(created.state);
    setSession(exampleSession);
  };

  const readDocument = useCallback(async (record: DocumentRecord): Promise<Blob | null> => {
    const local = record.localBlobId ? await getLocalDocument(record.localBlobId) : await getLocalDocument(record.id);
    if (local) return local;
    if (record.storage === "cloud" && record.blobPathname && record.encryptionIv && session) {
      const blob = await downloadCloudDocument(record.blobPathname, record.encryptionIv, record.mimeType, session);
      await putLocalDocument(record.id, blob);
      return blob;
    }
    return null;
  }, [session]);

  const storeFiles = useCallback(async (claimId: Id, files: PendingDocument[], actorId: Id): Promise<DocumentRecord[]> => {
    if (!session) return [];
    const oversized = files.find((pending) => pending.file.size > MAX_DOCUMENT_BYTES);
    if (oversized) throw new Error(`${oversized.file.name} is larger than the 50 MB beta limit.`);
    const batchBytes = files.reduce((total, pending) => total + pending.file.size, 0);
    if (batchBytes > MAX_UPLOAD_BATCH_BYTES) throw new Error("Add fewer files at once. The mobile upload limit is 150 MB per batch.");
    const stored: DocumentRecord[] = [];
    for (const pending of files) {
      const timestamp = nowIso();
      await putLocalDocument(pending.id, pending.file);
      let record: DocumentRecord = {
        id: pending.id,
        claimId,
        kind: pending.kind,
        originalName: pending.file.name,
        mimeType: pending.file.type || "application/octet-stream",
        sizeBytes: pending.file.size,
        storage: "local",
        localBlobId: pending.id,
        uploadedBy: actorId,
        createdAt: timestamp,
        updatedAt: timestamp
      };
      if (session.syncEnabled && cloudConfigured) {
        try {
          const cloud = await uploadCloudDocument(pending.file, pending.id, session);
          record = { ...record, storage: "cloud", blobPathname: cloud.pathname, encryptionIv: cloud.iv };
        } catch {
          showToast(`${pending.file.name} is stored on this device; cloud upload will need retrying.`);
        }
      }
      stored.push(record);
    }
    return stored;
  }, [cloudConfigured, session, showToast]);

  const saveNewClaim = async (form: NewClaimFormValue, pending: PendingDocument[]) => {
    if (!state || !session) return;
    const policy = state.policies.find((item) => item.petId === form.petId);
    if (!policy) throw new Error("Add an insurance policy for this pet first.");
    const timestamp = nowIso();
    const claimId = makeId("claim");
    let clinic = state.clinics.find((item) => item.name.trim().toLowerCase() === form.clinicName.trim().toLowerCase());
    if (!clinic) {
      clinic = {
        id: makeId("clinic"),
        name: form.clinicName.trim(),
        email: form.clinicEmail.trim() || undefined,
        createdAt: timestamp,
        updatedAt: timestamp
      };
    } else if (form.clinicEmail.trim() && clinic.email !== form.clinicEmail.trim()) {
      clinic = { ...clinic, email: form.clinicEmail.trim(), updatedAt: timestamp };
    }
    const claim: Claim = {
      id: claimId,
      petId: form.petId,
      policyId: policy.id,
      clinicId: clinic.id,
      visitDate: form.visitDate,
      reason: form.reason.trim(),
      invoiceNumber: form.invoiceNumber.trim() || undefined,
      billedCents: amountToCents(form.billedAmount),
      eligibleCents: form.eligibleAmount.trim() ? amountToCents(form.eligibleAmount) : undefined,
      status: "draft",
      firstAccidentIllnessClaim: form.firstClaim,
      diagnosticsPerformed: form.diagnostics,
      paidInFull: form.paidInFull,
      filingDeadline: addDays(form.visitDate, policy.filingWindowDays),
      notes: form.notes.trim() || undefined,
      createdBy: session.memberId,
      createdAt: timestamp,
      updatedAt: timestamp
    };
    const documents = await storeFiles(claimId, pending, session.memberId);
    const createdEvent = {
      id: makeId("event"), claimId, kind: "claim-created" as const,
      note: `${memberName(state, session.memberId)} created this visit and claim workspace.`,
      actorId: session.memberId, createdAt: timestamp, updatedAt: timestamp
    };
    const documentEvents = documents.map((document) => ({
      id: makeId("event"), claimId, kind: "document-added" as const,
      note: `${memberName(state, session.memberId)} added ${DOCUMENT_LABELS[document.kind].toLowerCase()}.`,
      actorId: session.memberId, createdAt: timestamp, updatedAt: timestamp
    }));
    mutate((current) => ({
      ...current,
      clinics: current.clinics.some((item) => item.id === clinic!.id)
        ? current.clinics.map((item) => item.id === clinic!.id ? clinic! : item)
        : [...current.clinics, clinic!],
      claims: [claim, ...current.claims],
      documents: [...documents, ...current.documents],
      events: [...documentEvents, createdEvent, ...current.events]
    }));
    setSheet(null);
    setSelectedClaimId(claimId);
    showToast("Visit saved. The readiness check is updated.");
  };

  const addDocuments = async (claimId: Id, pending: PendingDocument[]) => {
    if (!state || !session) return;
    const documents = await storeFiles(claimId, pending, session.memberId);
    const timestamp = nowIso();
    mutate((current) => ({
      ...current,
      documents: [...documents, ...current.documents],
      events: [
        ...documents.map((document) => ({
          id: makeId("event"), claimId, kind: "document-added" as const,
          note: `${memberName(current, session.memberId)} added ${DOCUMENT_LABELS[document.kind].toLowerCase()}.`,
          actorId: session.memberId, createdAt: timestamp, updatedAt: timestamp
        })),
        ...current.events
      ]
    }));
    setSheet(null);
    showToast(`${documents.length} ${documents.length === 1 ? "document" : "documents"} saved.`);
  };

  const openDocument = async (record: DocumentRecord) => {
    const viewer = window.open("about:blank", "_blank");
    if (viewer) viewer.opener = null;
    try {
      const blob = await readDocument(record);
      if (!blob) {
        viewer?.close();
        showToast(state?.exampleMode ? "Example documents are labels only." : "This document is not available on this device.");
        return;
      }
      const url = URL.createObjectURL(blob);
      if (viewer) viewer.location.replace(url);
      else downloadBlob(record.originalName, blob);
      window.setTimeout(() => URL.revokeObjectURL(url), 60_000);
    } catch (error) {
      viewer?.close();
      showToast(error instanceof Error ? error.message : "Could not open that document.");
    }
  };

  const removeDocument = async (record: DocumentRecord) => {
    if (state?.claims.some((claim) => claim.submission?.documentIds.includes(record.id))) {
      showToast("That file is part of a recorded submission and cannot be removed.");
      return;
    }
    if (!window.confirm(`Remove ${record.originalName}? The activity history will still show that a document was added.`)) return;
    if (record.localBlobId) await deleteLocalDocument(record.localBlobId).catch(() => undefined);
    const deletedAt = nowIso();
    let cloudDeletedAt: string | undefined;
    if (record.storage === "cloud" && record.blobPathname && session) {
      try {
        await deleteCloudDocument(record.blobPathname, session);
        cloudDeletedAt = nowIso();
      } catch {
        showToast("The record is removed; encrypted cloud cleanup will retry on the next sync.");
      }
    }
    mutate((current) => ({
      ...addEvent(current, record.claimId, "note", `${memberName(current, session?.memberId ?? "")} removed ${DOCUMENT_LABELS[record.kind].toLowerCase()}.`, session?.memberId ?? "", deletedAt),
      documents: current.documents.filter((item) => item.id !== record.id),
      documentDeletions: [
        { id: record.id, deletedAt, updatedAt: cloudDeletedAt ?? deletedAt, blobPathname: record.blobPathname, cloudDeletedAt },
        ...(current.documentDeletions ?? []).filter((item) => item.id !== record.id)
      ]
    }));
    showToast("Document removed.");
  };

  const logRecordsRequest = (claim: Claim) => {
    if (!state || !session) return;
    mutate((current) => addEvent(
      current,
      claim.id,
      "records-requested",
      `${memberName(current, session.memberId)} requested complete records from ${current.clinics.find((item) => item.id === claim.clinicId)?.name ?? "the clinic"}.`,
      session.memberId
    ));
    setSheet(null);
    showToast("Records request logged.");
  };

  const saveSubmission = (claimId: Id, submission: SubmissionInput) => {
    if (!state || !session) return;
    const timestamp = nowIso();
    mutate((current) => ({
      ...addEvent(current, claimId, "claim-submitted", `${memberName(current, session.memberId)} marked the claim submitted by ${submission.channel}.`, session.memberId, submission.submittedAt),
      claims: current.claims.map((claim) => claim.id === claimId ? {
        ...claim,
        status: "submitted",
        carrierClaimNumber: submission.confirmationNumber || claim.carrierClaimNumber,
        submission: {
          id: makeId("submission"),
          ...submission,
          documentIds: current.documents.filter((document) => document.claimId === claimId).map((document) => document.id),
          documents: current.documents.filter((document) => document.claimId === claimId).map((document) => ({
            documentId: document.id,
            originalName: document.originalName,
            kind: document.kind,
            sizeBytes: document.sizeBytes,
            uploadedAt: document.createdAt
          })),
          actorId: session.memberId
        },
        updatedAt: timestamp
      } : claim)
    }));
    setSheet(null);
    showToast("Submission snapshot saved.");
  };

  const saveEob = (claimId: Id, eob: EobReview) => {
    if (!state || !session) return;
    const timestamp = nowIso();
    mutate((current) => {
      const existingClaim = current.claims.find((claim) => claim.id === claimId);
      const previousEob = existingClaim?.eob;
      const policyId = existingClaim?.policyId;
      return {
      ...addEvent(current, claimId, "decision-received", `${memberName(current, session.memberId)} recorded a ${eob.decision} decision for ${formatMoney(eob.reimbursedCents)}.`, session.memberId),
      claims: current.claims.map((claim) => claim.id === claimId ? {
        ...claim,
        status: eob.decision === "paid" ? "paid" : eob.decision === "partial" ? "partially-paid" : "denied",
        eob,
        updatedAt: timestamp
      } : claim),
      policies: current.policies.map((policy) => policy.id === policyId ? {
        ...policy,
        deductibleRemainingCents: Math.max(0, Math.min(
          policy.deductibleCents,
          policy.deductibleRemainingCents + (previousEob?.deductibleAppliedCents ?? 0) - eob.deductibleAppliedCents
        )),
        annualPaidCents: Math.max(0, policy.annualPaidCents - (previousEob?.reimbursedCents ?? 0) + eob.reimbursedCents),
        updatedAt: timestamp
      } : policy)
    }; });
    setSheet(null);
    showToast("EOB review saved.");
  };

  const updateClaimStatus = (claimId: Id, status: ClaimStatus) => {
    if (!state || !session) return;
    const timestamp = nowIso();
    mutate((current) => ({
      ...addEvent(current, claimId, "status-changed", `${memberName(current, session.memberId)} changed the status to ${statusLabel(status)}.`, session.memberId),
      claims: current.claims.map((claim) => claim.id === claimId ? { ...claim, status, updatedAt: timestamp } : claim)
    }));
  };

  const buildClaimPacket = async (claim: Claim) => {
    if (!state) return;
    const packetRecords = claimDocuments(state, claim.id);
    const packetBytes = packetRecords.reduce((total, record) => total + record.sizeBytes, 0);
    if (packetBytes > MAX_PACKET_BYTES) {
      showToast("This packet is over the 75 MB mobile limit. Download the original files individually instead.");
      return;
    }
    showToast("Building the packet…");
    try {
      const JSZip = (await import("jszip")).default;
      const zip = new JSZip();
      const pet = state.pets.find((item) => item.id === claim.petId);
      const policy = state.policies.find((item) => item.id === claim.policyId);
      const clinic = state.clinics.find((item) => item.id === claim.clinicId);
      const readiness = claimReadiness(state, claim);
      const cover = [
      "PET CLAIM DESK — OWNER-PREPARED CLAIM INDEX",
      "",
      `Pet: ${pet?.name ?? "Unknown"}`,
      `Carrier: ${policy?.carrierName ?? "Unknown"}`,
      `Policy: ${maskPolicyNumber(policy?.policyNumber)}`,
      `Service date: ${formatDate(claim.visitDate)}`,
      `Clinic: ${clinic?.name ?? "Not added"}`,
      `Reason: ${claim.reason}`,
      `Invoice total: ${formatMoney(claim.billedCents)}`,
      `Filing deadline recorded: ${formatDate(claim.filingDeadline)}`,
      "",
      "READINESS",
      ...readiness.map((item) => `${item.state === "complete" ? "[x]" : "[ ]"} ${item.label} — ${item.note}`),
      "",
      "This index was prepared by the policyholder using Pet Claim Desk. Confirm all requirements and attestations directly with the insurer."
      ].join("\r\n");
      zip.file("00_Claim_Index.txt", cover);
      let fileIndex = 1;
      for (const record of packetRecords) {
        const blob = await readDocument(record);
        if (!blob) continue;
        const number = String(fileIndex).padStart(2, "0");
        zip.file(`${number}_${safeFilename(DOCUMENT_LABELS[record.kind])}_${safeFilename(record.originalName)}`, blob);
        fileIndex += 1;
      }
      const packet = await zip.generateAsync({ type: "blob" });
      downloadBlob(`${safeFilename(pet?.name ?? "Pet")}_${claim.visitDate}_Claim_Packet.zip`, packet);
      showToast("Claim packet downloaded.");
    } catch {
      showToast("The packet could not be built on this device. Try fewer files or download them individually.");
    }
  };

  const addPetAndPolicy = (value: AddPetValue) => {
    if (!state) return;
    const timestamp = nowIso();
    const petId = makeId("pet");
    const profile = carrierProfile(value.carrierKey);
    const pet: Pet = { id: petId, name: value.name.trim(), species: value.species, breed: value.breed.trim() || undefined, createdAt: timestamp, updatedAt: timestamp };
    const policy: Policy = {
      id: makeId("policy"), petId, carrierKey: profile.key, carrierName: value.carrierName.trim() || profile.name,
      policyNumber: value.policyNumber.trim() || undefined, reimbursementPercent: value.reimbursementPercent,
      deductibleType: "annual", deductibleCents: amountToCents(value.deductible), deductibleRemainingCents: amountToCents(value.deductible),
      annualLimitCents: null, annualPaidCents: 0, filingWindowDays: profile.filingWindowDays, appealWindowDays: profile.appealWindowDays,
      examFeeTreatment: "unknown", termsConfirmed: false, createdAt: timestamp, updatedAt: timestamp
    };
    mutate((current) => ({ ...current, pets: [...current.pets, pet], policies: [...current.policies, policy] }));
    setSheet(null);
    showToast(`${pet.name} added.`);
  };

  const savePolicy = (policy: Policy) => {
    const timestamp = nowIso();
    mutate((current) => {
      const previous = current.policies.find((item) => item.id === policy.id);
      const filingWindowChanged = previous?.filingWindowDays !== policy.filingWindowDays;
      return {
        ...current,
        policies: current.policies.map((item) => item.id === policy.id ? { ...policy, updatedAt: timestamp } : item),
        claims: filingWindowChanged ? current.claims.map((claim) => claim.policyId === policy.id && !claim.submission
          ? { ...claim, filingDeadline: addDays(claim.visitDate, policy.filingWindowDays), updatedAt: timestamp }
          : claim) : current.claims
      };
    });
    setSheet(null);
    showToast("Policy settings updated.");
  };

  const saveNewPolicy = (policy: Policy) => {
    mutate((current) => ({ ...current, policies: [...current.policies, { ...policy, updatedAt: nowIso() }] }));
    setSheet(null);
    showToast("Insurance settings added.");
  };

  const uploadDeviceOnlyDocuments = async (activeState: ClaimDeskState, activeSession: LocalSession, announce = true) => {
    const localRecords = activeState.documents.filter((document) => document.storage === "local");
    if (!localRecords.length) {
      if (announce) showToast("Every available document already has an encrypted shared copy.");
      return;
    }
    const uploaded = new Map<Id, { pathname: string; iv: string }>();
    let unavailable = 0;
    for (const record of localRecords) {
      const blob = await readDocument(record);
      if (!blob) {
        unavailable += 1;
        continue;
      }
      try {
        uploaded.set(record.id, await uploadCloudDocument(blob, record.id, activeSession));
      } catch {
        unavailable += 1;
      }
    }
    if (uploaded.size) {
      const uploadedAt = nowIso();
      mutate((current) => ({
        ...current,
        documents: current.documents.map((item) => {
          const cloud = uploaded.get(item.id);
          return cloud ? { ...item, storage: "cloud", blobPathname: cloud.pathname, encryptionIv: cloud.iv, updatedAt: uploadedAt } : item;
        })
      }));
    }
    if (announce) {
      showToast(unavailable
        ? `${uploaded.size} shared; ${unavailable} still need a retry from the device holding the originals.`
        : `${uploaded.size} encrypted document ${uploaded.size === 1 ? "copy" : "copies"} shared.`);
    }
  };

  const enableSharedSync = async () => {
    if (!state || !session) return;
    const status = await getCloudStatus();
    setCloudConfigured(status.configured);
    if (!status.configured) {
      showToast("Private cloud storage is not connected yet.");
      return;
    }
    let nextSession = { ...session, syncEnabled: true, syncRevision: 0 };
    const revision = await pushCloudState(state, nextSession);
    nextSession = { ...nextSession, syncRevision: revision, lastSyncedAt: nowIso(), lastSyncedStateUpdatedAt: state.updatedAt };
    updateSession(nextSession);
    setSyncState("synced");
    await uploadDeviceOnlyDocuments(state, nextSession, false);
    showToast("Shared household sync is on.");
  };

  const exportBackup = async () => {
    if (!state) return;
    showToast("Preparing the complete backup…");
    const backup = await createPortableBackup(state, async (id) => {
      const record = state.documents.find((document) => document.id === id);
      return record ? readDocument(record) : null;
    });
    downloadBlob(`pet-claim-desk-${todayLocal()}.json`, new Blob([JSON.stringify(backup)], { type: "application/json" }));
    showToast(backup.omittedDocumentIds.length
      ? `Backup downloaded, but ${backup.omittedDocumentIds.length} unavailable ${backup.omittedDocumentIds.length === 1 ? "document was" : "documents were"} omitted.`
      : "Complete backup downloaded.");
  };

  const importBackup = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    if (!window.confirm("Restore this backup on this device? Your current local household will be replaced.")) return;
    try {
      const backup = parsePortableBackup(await file.text());
      const restored = await restorePortableDocuments(backup);
      const credentials = createWorkspaceCredentials();
      const memberId = restored.members[0]?.id ?? makeId("member");
      const nextState = { ...restored, workspaceId: credentials.workspaceId, updatedAt: nowIso() };
      const nextSession: LocalSession = { schemaVersion: 1, workspaceId: credentials.workspaceId, rootSecret: credentials.rootSecret, memberId, syncEnabled: false, syncRevision: 0 };
      saveLocalState(nextState);
      saveSession(nextSession);
      sessionRef.current = nextSession;
      setState(nextState);
      setSession(nextSession);
      setTab("today");
      setSelectedClaimId(null);
      showToast("Backup restored on this device.");
    } catch (error) {
      showToast(error instanceof Error ? error.message : "Could not restore that backup.");
    }
  };

  const resetHousehold = async () => {
    if (!window.confirm("Remove this household from this device? Download a backup first if you may need the records.")) return;
    if (!window.confirm("This is the final confirmation. Remove the local claims and document copies?")) return;
    clearLocalState();
    await clearLocalDocuments().catch(() => undefined);
    sessionRef.current = null;
    setState(null);
    setSession(null);
    setSelectedClaimId(null);
    setTab("today");
  };

  if (!booted) return <main className="loading-screen"><Brand /><span>Opening the household desk…</span></main>;
  if (!state || !session) return <Setup cloudConfigured={cloudConfigured} onCreate={createHousehold} onJoin={joinHousehold} onExample={openExample} />;

  const selectedClaim = selectedClaimId ? state.claims.find((claim) => claim.id === selectedClaimId) : undefined;
  const currentMember = state.members.find((member) => member.id === session.memberId) ?? state.members[0];

  return (
    <div className="app-shell">
      <header className="app-topbar">
        <button className="brand-button" onClick={() => { setTab("today"); setSelectedClaimId(null); }}><Brand compact /></button>
        <div className="topbar-right">
          {state.exampleMode && <span className="example-chip">Example data</span>}
          <span className={`sync-chip sync-chip--${syncState}`} title={session.syncEnabled ? "Encrypted shared household" : "Stored on this device"}><i />{session.syncEnabled ? (syncState === "syncing" ? "Syncing" : syncState === "offline" ? "Saved locally" : "Shared") : "This device"}</span>
          <span className="member-avatar" title={currentMember?.name}>{currentMember?.name.slice(0, 1).toUpperCase()}</span>
        </div>
      </header>

      <main className="app-main">
        {selectedClaim ? (
          <ClaimDetail
            state={state}
            claim={selectedClaim}
            onBack={() => setSelectedClaimId(null)}
            onAddDocuments={() => setSheet({ type: "add-documents", claimId: selectedClaim.id })}
            onRequestRecords={() => setSheet({ type: "records-request", claimId: selectedClaim.id })}
            onSubmit={() => setSheet({ type: "submission", claimId: selectedClaim.id })}
            onEob={() => setSheet({ type: "eob", claimId: selectedClaim.id })}
            onBuildPacket={() => void buildClaimPacket(selectedClaim)}
            onOpenDocument={(record) => void openDocument(record)}
            onRemoveDocument={(record) => void removeDocument(record)}
            onStatus={(status) => updateClaimStatus(selectedClaim.id, status)}
          />
        ) : tab === "today" ? (
          <TodayView state={state} onOpenClaim={setSelectedClaimId} onAddVisit={() => setSheet({ type: "new-claim" })} />
        ) : tab === "claims" ? (
          <ClaimsView state={state} onOpenClaim={setSelectedClaimId} onAddVisit={() => setSheet({ type: "new-claim" })} />
        ) : tab === "pets" ? (
          <PetsView state={state} onAddPet={() => setSheet({ type: "add-pet" })} onAddPolicy={(petId) => setSheet({ type: "add-policy", petId, policyId: makeId("policy") })} onEditPolicy={(policyId) => setSheet({ type: "edit-policy", policyId })} onOpenClaim={setSelectedClaimId} />
        ) : (
          <SettingsView
            state={state}
            session={session}
            cloudConfigured={cloudConfigured}
            syncState={syncState}
            onEnableSync={() => void enableSharedSync()}
            onSync={() => void synchronize(state, session, true)}
            onRetryDocuments={() => void uploadDeviceOnlyDocuments(state, session)}
            onExport={() => void exportBackup()}
            onImport={() => importRef.current?.click()}
            onReset={() => void resetHousehold()}
            onToast={showToast}
          />
        )}
      </main>

      {!selectedClaim && <nav className="bottom-nav" aria-label="Main navigation">
        <button className={tab === "today" ? "active" : ""} onClick={() => setTab("today")}><i>⌂</i><span>Today</span></button>
        <button className={tab === "claims" ? "active" : ""} onClick={() => setTab("claims")}><i>▤</i><span>Claims</span></button>
        <button className={tab === "pets" ? "active" : ""} onClick={() => setTab("pets")}><i>●</i><span>Pets</span></button>
        <button className={tab === "settings" ? "active" : ""} onClick={() => setTab("settings")}><i>⚙</i><span>Settings</span></button>
      </nav>}

      <input ref={importRef} className="sr-only" type="file" accept="application/json,.json" onChange={importBackup} />
      <div className={toast ? "toast toast--visible" : "toast"} role="status" aria-live="polite">{toast}</div>

      {sheet?.type === "new-claim" && <NewClaimSheet state={state} onClose={() => setSheet(null)} onSave={saveNewClaim} />}
      {sheet?.type === "add-documents" && <AddDocumentsSheet onClose={() => setSheet(null)} onSave={(pending) => addDocuments(sheet.claimId, pending)} />}
      {sheet?.type === "records-request" && <RecordsRequestSheet state={state} claimId={sheet.claimId} onClose={() => setSheet(null)} onLog={logRecordsRequest} />}
      {sheet?.type === "submission" && <SubmissionSheet claim={state.claims.find((item) => item.id === sheet.claimId)!} onClose={() => setSheet(null)} onSave={(submission) => saveSubmission(sheet.claimId, submission)} />}
      {sheet?.type === "eob" && <EobSheet state={state} claim={state.claims.find((item) => item.id === sheet.claimId)!} onClose={() => setSheet(null)} onSave={(eob) => saveEob(sheet.claimId, eob)} />}
      {sheet?.type === "add-pet" && <AddPetSheet onClose={() => setSheet(null)} onSave={addPetAndPolicy} />}
      {sheet?.type === "add-policy" && <PolicySheet policy={newPolicyForPet(sheet.petId, sheet.policyId)} onClose={() => setSheet(null)} onSave={saveNewPolicy} />}
      {sheet?.type === "edit-policy" && <PolicySheet policy={state.policies.find((item) => item.id === sheet.policyId)!} onClose={() => setSheet(null)} onSave={savePolicy} />}
    </div>
  );
}

function TodayView({ state, onOpenClaim, onAddVisit }: { state: ClaimDeskState; onOpenClaim: (id: Id) => void; onAddVisit: () => void }) {
  const tasks = actionTasks(state);
  const outstanding = outstandingSubmittedCents(state);
  const recent = [...state.events].sort((a, b) => b.createdAt.localeCompare(a.createdAt)).slice(0, 4);
  return (
    <div className="page-stack today-page">
      <header className="page-heading page-heading--split">
        <div><p>{formatDate(todayLocal(), { weekday: "long", month: "long", day: "numeric" })}</p><h1>{tasks.length ? `${tasks.length === 1 ? "One thing needs" : `${tasks.length} things need`} your attention.` : "The claim desk is clear."}</h1></div>
        <button className="primary-button desktop-action" onClick={onAddVisit}>+ Add vet visit</button>
      </header>

      {tasks.length ? <section className="task-list" aria-label="Claims needing attention">
        {tasks.slice(0, 4).map((task) => <button key={task.id} className={task.priority === 0 ? "task-card task-card--urgent" : "task-card"} onClick={() => onOpenClaim(task.claimId)}>
          <div><span className="task-eyebrow">{task.eyebrow}</span><strong>{task.title}</strong><p>{task.detail}</p></div><span className="task-arrow">→</span>
        </button>)}
      </section> : <section className="clear-state"><span className="clear-mark">✓</span><div><h2>Nothing needs chasing today.</h2><p>Add the next vet visit while the documents are still easy to find.</p></div></section>}

      <button className="mobile-add-button" onClick={onAddVisit}>+ Add vet visit</button>

      <section className="money-strip">
        <div><span>Estimated reimbursement pending</span><strong>{formatMoney(outstanding)}</strong><small>{state.claims.filter((claim) => ["submitted", "needs-information", "under-review", "appeal-submitted"].includes(claim.status)).length} active submitted claims · estimate only</small></div>
        <div><span>Claims recorded</span><strong>{state.claims.length}</strong><small>across {state.pets.length} {state.pets.length === 1 ? "pet" : "pets"}</small></div>
      </section>

      <section className="activity-section">
        <div className="section-heading"><div><p className="eyebrow">Evidence ledger</p><h2>Recent activity</h2></div></div>
        {recent.length ? <div className="timeline timeline--compact">{recent.map((event) => <div key={event.id} className="timeline-row"><i /><div><strong>{event.note}</strong><span>{formatDate(event.createdAt.slice(0, 10))}</span></div></div>)}</div> : <p className="empty-copy">Claim requests, uploads, submissions, and decisions will appear here.</p>}
      </section>
    </div>
  );
}

function ClaimsView({ state, onOpenClaim, onAddVisit }: { state: ClaimDeskState; onOpenClaim: (id: Id) => void; onAddVisit: () => void }) {
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<"active" | "waiting" | "complete" | "all">("active");
  const claims = state.claims.filter((claim) => {
    const status = effectiveClaimStatus(state, claim);
    const pet = state.pets.find((item) => item.id === claim.petId);
    const matches = `${pet?.name ?? ""} ${claim.reason} ${claim.carrierClaimNumber ?? ""}`.toLowerCase().includes(query.toLowerCase());
    if (!matches) return false;
    if (filter === "all") return true;
    if (filter === "active") return ["draft", "ready", "needs-information", "partially-paid", "denied", "appeal-preparing"].includes(status);
    if (filter === "waiting") return ["submitted", "under-review", "appeal-submitted"].includes(status);
    return ["paid", "closed"].includes(status);
  }).sort((a, b) => b.visitDate.localeCompare(a.visitDate));
  return (
    <div className="page-stack">
      <header className="page-heading page-heading--split"><div><p>Household claims</p><h1>Every visit, packet, and decision.</h1></div><button className="primary-button desktop-action" onClick={onAddVisit}>+ Add vet visit</button></header>
      <div className="claim-tools"><label className="search-field"><span className="sr-only">Search claims</span><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search pet, visit, or claim number" /><i>⌕</i></label><div className="segmented">{(["active", "waiting", "complete", "all"] as const).map((value) => <button key={value} className={filter === value ? "active" : ""} onClick={() => setFilter(value)}>{value[0].toUpperCase() + value.slice(1)}</button>)}</div></div>
      {claims.length ? <div className="claim-list">{claims.map((claim) => {
        const pet = state.pets.find((item) => item.id === claim.petId);
        const clinic = state.clinics.find((item) => item.id === claim.clinicId);
        const effective = effectiveClaimStatus(state, claim);
        return <button key={claim.id} className="claim-row" onClick={() => onOpenClaim(claim.id)}><PetAvatar pet={pet} /><div className="claim-row-main"><div><strong>{pet?.name}</strong><StatusBadge status={effective} /></div><h2>{claim.reason}</h2><p>{formatDate(claim.visitDate)} · {clinic?.name ?? "Clinic not added"}</p></div><div className="claim-row-money"><strong>{formatMoney(claim.billedCents)}</strong><span>→</span></div></button>;
      })}</div> : <section className="empty-state"><span>▤</span><h2>No claims in this view.</h2><p>Add a vet visit or change the filter.</p><button className="primary-button" onClick={onAddVisit}>Add vet visit</button></section>}
      <button className="mobile-add-button" onClick={onAddVisit}>+ Add vet visit</button>
    </div>
  );
}

function ClaimDetail({ state, claim, onBack, onAddDocuments, onRequestRecords, onSubmit, onEob, onBuildPacket, onOpenDocument, onRemoveDocument, onStatus }: {
  state: ClaimDeskState;
  claim: Claim;
  onBack: () => void;
  onAddDocuments: () => void;
  onRequestRecords: () => void;
  onSubmit: () => void;
  onEob: () => void;
  onBuildPacket: () => void;
  onOpenDocument: (document: DocumentRecord) => void;
  onRemoveDocument: (document: DocumentRecord) => void;
  onStatus: (status: ClaimStatus) => void;
}) {
  const pet = state.pets.find((item) => item.id === claim.petId);
  const policy = state.policies.find((item) => item.id === claim.policyId);
  const clinic = state.clinics.find((item) => item.id === claim.clinicId);
  const documents = claimDocuments(state, claim.id);
  const events = claimEvents(state, claim.id);
  const readiness = claimReadiness(state, claim);
  const effective = effectiveClaimStatus(state, claim);
  const missing = readiness.filter((item) => item.blocking && item.state !== "complete");
  const estimate = estimateReimbursement(state, claim);
  const variance = claim.eob && estimate ? claim.eob.reimbursedCents - estimate.estimatedCents : null;
  return (
    <div className="claim-detail">
      <button className="back-link detail-back" onClick={onBack}>← Back</button>
      <header className="claim-hero">
        <div className="claim-identity"><PetAvatar pet={pet} /><div><span>{pet?.name}</span><h1>{claim.reason}</h1><p>{formatDate(claim.visitDate)} · {clinic?.name ?? "Clinic not added"}</p></div></div>
        <StatusBadge status={effective} />
      </header>
      <section className={missing.length ? "next-action next-action--attention" : "next-action next-action--ready"}>
        <div><p className="eyebrow">Next useful step</p><h2>{missing.length ? (missing.length === 1 ? `${missing[0].label} is required before this packet is ready.` : `${missing.length} items are still needed for this packet.`) : effective === "ready" ? "Review the complete packet and submit it." : ["submitted", "under-review"].includes(effective) ? "The insurer has the claim. Keep the confirmation and watch for requests." : "Add the insurer decision when it arrives."}</h2></div>
        {missing.some((item) => item.kind === "soap-notes" || item.kind === "medical-history") ? <button className="primary-button" onClick={onRequestRecords}>Request records</button> : missing.length ? <button className="primary-button" onClick={onAddDocuments}>Add documents</button> : effective === "ready" ? <button className="primary-button" onClick={onBuildPacket}>Build claim packet</button> : <button className="secondary-button" onClick={onEob}>Add EOB</button>}
      </section>

      <div className="claim-detail-grid">
        <div className="claim-detail-main">
          <section className="detail-section">
            <div className="section-heading"><div><p className="eyebrow">Carrier readiness</p><h2>{readiness.filter((item) => item.state === "complete").length} of {readiness.length} checks complete</h2></div><button className="text-button" onClick={onAddDocuments}>+ Add files</button></div>
            <div className="readiness-list">{readiness.map((item) => <button key={item.id} className={`readiness-row readiness-row--${item.state}`} onClick={item.state === "complete" ? undefined : item.kind === "soap-notes" || item.kind === "medical-history" ? onRequestRecords : onAddDocuments}><span className="readiness-check">{item.state === "complete" ? "✓" : item.state === "needs-review" ? "!" : "○"}</span><div><strong>{item.label}</strong><p>{item.note}</p></div>{item.state !== "complete" && <span>→</span>}</button>)}</div>
            <div className="carrier-note"><strong>{policy?.carrierName ?? "Carrier"} guidance</strong><span>{carrierProfile(policy?.carrierKey ?? "other").guidance}</span><a href={carrierProfile(policy?.carrierKey ?? "other").sourceUrl || undefined} target="_blank" rel="noreferrer">View official instructions ↗</a></div>
          </section>

          <section className="detail-section">
            <div className="section-heading"><div><p className="eyebrow">Original evidence</p><h2>Documents</h2></div><button className="text-button" onClick={onAddDocuments}>+ Add</button></div>
            {documents.length ? <div className="document-list">{documents.map((document) => <div className="document-row" key={document.id}><button className="document-open" onClick={() => onOpenDocument(document)}><span className="document-icon">{document.mimeType.includes("pdf") ? "PDF" : "FILE"}</span><div><strong>{DOCUMENT_LABELS[document.kind]}</strong><p>{document.originalName} · {fileSizeLabel(document.sizeBytes)}</p><small>Added by {memberName(state, document.uploadedBy)} · {document.storage === "cloud" ? "Encrypted shared copy" : "This device only"}</small></div></button><button className="icon-button" onClick={() => onRemoveDocument(document)} aria-label={`Remove ${document.originalName}`}>⋯</button></div>)}</div> : <p className="empty-copy">No documents have been attached yet.</p>}
          </section>

          {claim.submission && <section className="detail-section submission-snapshot"><div className="section-heading"><div><p className="eyebrow">Frozen evidence list</p><h2>Submission snapshot</h2></div></div><p>Recorded {new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit" }).format(new Date(claim.submission.submittedAt))}. Later uploads do not change this list.</p>{(claim.submission.documents ?? []).length ? <ul>{claim.submission.documents.map((document) => <li key={document.documentId}><strong>{DOCUMENT_LABELS[document.kind]}</strong><span>{document.originalName} · {fileSizeLabel(document.sizeBytes)}</span></li>)}</ul> : <p className="empty-copy">No document files were attached when this submission was recorded.</p>}</section>}

          <section className="detail-section">
            <div className="section-heading"><div><p className="eyebrow">Evidence ledger</p><h2>Activity</h2></div></div>
            {events.length ? <div className="timeline">{events.map((event) => <div key={event.id} className="timeline-row"><i /><div><strong>{event.note}</strong><span>{new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit" }).format(new Date(event.createdAt))}</span></div></div>)}</div> : <p className="empty-copy">No claim activity yet.</p>}
          </section>
        </div>

        <aside className="claim-summary">
          <section><p className="eyebrow">Money check</p><div className="summary-money"><span>Invoice</span><strong>{formatMoney(claim.billedCents)}</strong></div><div className="summary-money"><span>Estimated reimbursement</span><strong>{formatMoney(estimate?.estimatedCents)}</strong></div>{claim.eob && <><div className="summary-rule" /><div className="summary-money"><span>Insurer paid</span><strong>{formatMoney(claim.eob.reimbursedCents)}</strong></div>{variance !== null && <p className={variance < 0 ? "variance variance--low" : "variance"}>{variance === 0 ? "Looks consistent with the current estimate." : `${formatMoney(Math.abs(variance))} ${variance < 0 ? "below" : "above"} the estimate. Review the EOB and policy.`}</p>}</>}<small>Estimate only. The insurer makes the coverage decision.</small></section>
          <section><p className="eyebrow">Claim details</p><dl><div><dt>Carrier</dt><dd>{policy?.carrierName}</dd></div><div><dt>Policy</dt><dd>{maskPolicyNumber(policy?.policyNumber)}</dd></div><div><dt>File by</dt><dd>{formatDate(claim.filingDeadline)}</dd></div><div><dt>Claim number</dt><dd>{claim.carrierClaimNumber ?? "Not assigned"}</dd></div><div><dt>Submitted</dt><dd>{claim.submission ? formatDate(claim.submission.submittedAt.slice(0, 10)) : "Not yet"}</dd></div></dl></section>
          <section className="claim-actions"><button className="secondary-button secondary-button--full" onClick={onBuildPacket}>Download packet</button>{!claim.submission && <button className="primary-button primary-button--full" onClick={onSubmit}>Mark submitted</button>}<button className="text-button" onClick={onEob}>Add or review EOB</button><label><span>Update status</span><select value={claim.status} onChange={(event) => onStatus(event.target.value as ClaimStatus)}>{(["draft", "ready", "submitted", "needs-information", "under-review", "paid", "partially-paid", "denied", "appeal-preparing", "appeal-submitted", "closed"] as ClaimStatus[]).map((status) => <option key={status} value={status}>{statusLabel(status)}</option>)}</select></label></section>
        </aside>
      </div>
    </div>
  );
}

function PetsView({ state, onAddPet, onAddPolicy, onEditPolicy, onOpenClaim }: { state: ClaimDeskState; onAddPet: () => void; onAddPolicy: (id: Id) => void; onEditPolicy: (id: Id) => void; onOpenClaim: (id: Id) => void }) {
  return <div className="page-stack"><header className="page-heading page-heading--split"><div><p>Household pets</p><h1>Policies stay attached to the right pet.</h1></div><button className="primary-button desktop-action" onClick={onAddPet}>+ Add pet</button></header><div className="pet-grid">{state.pets.map((pet) => {
    const policy = state.policies.find((item) => item.petId === pet.id);
    const claims = state.claims.filter((claim) => claim.petId === pet.id).sort((a, b) => b.visitDate.localeCompare(a.visitDate));
    return <article className="pet-card" key={pet.id}><div className="pet-card-heading"><PetAvatar pet={pet} /><div><h2>{pet.name}</h2><p>{pet.breed || pet.species}</p></div></div><div className="policy-summary"><span>Insurance</span><strong>{policy?.carrierName ?? "No policy"}</strong>{policy ? <><small>{maskPolicyNumber(policy.policyNumber)} · {policy.reimbursementPercent}% after deductible</small><button className="text-button" onClick={() => onEditPolicy(policy.id)}>Review policy settings</button></> : <><small>Add insurance before starting a claim for this pet.</small><button className="text-button" onClick={() => onAddPolicy(pet.id)}>Add insurance settings</button></>}</div><div className="pet-claims"><span>{claims.length} recorded {claims.length === 1 ? "claim" : "claims"}</span>{claims.slice(0, 3).map((claim) => <button key={claim.id} onClick={() => onOpenClaim(claim.id)}><div><strong>{claim.reason}</strong><small>{formatDate(claim.visitDate)}</small></div><span>{formatMoney(claim.billedCents)} →</span></button>)}</div></article>;
  })}</div><button className="mobile-add-button" onClick={onAddPet}>+ Add pet</button></div>;
}

function SettingsView({ state, session, cloudConfigured, syncState, onEnableSync, onSync, onRetryDocuments, onExport, onImport, onReset, onToast }: {
  state: ClaimDeskState; session: LocalSession; cloudConfigured: boolean; syncState: string;
  onEnableSync: () => void; onSync: () => void; onRetryDocuments: () => void; onExport: () => void; onImport: () => void; onReset: () => void; onToast: (message: string) => void;
}) {
  const copyCode = async () => {
    await navigator.clipboard.writeText(formatShareCode(session.workspaceId, session.rootSecret));
    onToast("Private household code copied.");
  };
  const legacyExists = typeof window !== "undefined" && Boolean(window.localStorage.getItem("hearthfolio:household:v1"));
  return <div className="page-stack settings-page"><header className="page-heading"><p>Household settings</p><h1>Privacy, sharing, and backups.</h1></header>
    <section className="settings-section"><div className="section-heading"><div><p className="eyebrow">Household access</p><h2>{session.syncEnabled ? "Encrypted sharing is on" : "This household is on one device"}</h2></div><span className={`large-sync-state large-sync-state--${syncState}`}><i />{syncState}</span></div>
      {session.syncEnabled ? <><p>Household details are encrypted before leaving the browser. Anyone with the full private code can open and edit this household, so share it only with your wife.</p><details className="share-code-reveal"><summary>Reveal private household code</summary><div className="share-code"><code>{formatShareCode(session.workspaceId, session.rootSecret)}</code><button className="secondary-button" onClick={() => void copyCode()}>Copy code</button></div></details><div className="button-row"><button className="text-button" onClick={onSync}>Sync now</button>{state.documents.some((document) => document.storage === "local") && <button className="text-button" onClick={onRetryDocuments}>Retry device-only documents</button>}</div></> : <><p>{cloudConfigured ? "Private storage is available. Turn on sync to continue the same claims from another phone." : "Claims and documents are stored in this browser. Private Vercel storage must be connected before another phone can join."}</p><button className="primary-button" onClick={onEnableSync}>{cloudConfigured ? "Turn on shared sync" : "Recheck shared storage"}</button></>}
    </section>
    <section className="settings-section"><p className="eyebrow">Household members</p><h2>{state.members.length} {state.members.length === 1 ? "person" : "people"}</h2><div className="member-list">{state.members.map((member) => <div key={member.id}><span className="member-avatar">{member.name.slice(0, 1).toUpperCase()}</span><div><strong>{member.name}</strong><small>{member.id === session.memberId ? "This device" : "Household member"}</small></div></div>)}</div></section>
    <section className="settings-section"><p className="eyebrow">Backup and portability</p><h2>Keep a copy you control.</h2><p>The complete backup includes household data and every document this device can retrieve. Store it somewhere private.</p><div className="button-row"><button className="primary-button" onClick={onExport}>Download complete backup</button><button className="secondary-button" onClick={onImport}>Restore backup</button></div>{legacyExists && <a className="legacy-link" href="/legacy-yearkeep-export">Export old Yearkeep records before clearing them →</a>}</section>
    <section className="settings-section"><p className="eyebrow">Important boundaries</p><h2>This is your filing desk—not an insurer, vet, or law firm.</h2><ul className="boundary-list"><li>Reimbursement numbers are estimates.</li><li>Carrier defaults must be confirmed against the issued policy.</li><li>The app does not diagnose, change medical records, or submit legal attestations for you.</li><li>Never store an insurer password here.</li></ul><div className="legal-links"><a href="/privacy">Privacy</a><a href="/terms">Terms</a></div></section>
    <section className="settings-section settings-section--danger"><p className="eyebrow">Remove from this device</p><h2>Start over</h2><p>Export first. Removing the household clears the local state and local document copies.</p><button className="danger-button" onClick={onReset}>Remove local household</button></section>
  </div>;
}

interface NewClaimFormValue {
  petId: Id;
  visitDate: string;
  clinicName: string;
  clinicEmail: string;
  reason: string;
  invoiceNumber: string;
  billedAmount: string;
  eligibleAmount: string;
  firstClaim: boolean;
  diagnostics: boolean;
  paidInFull: boolean;
  notes: string;
}

function PendingFiles({ files, onRemove }: { files: PendingDocument[]; onRemove: (id: string) => void }) {
  return files.length ? <div className="pending-files">{files.map((item) => <div key={item.id}><span className="document-icon">{item.file.type.includes("pdf") ? "PDF" : "FILE"}</span><div><strong>{DOCUMENT_LABELS[item.kind]}</strong><small>{item.file.name} · {fileSizeLabel(item.file.size)}</small></div><button type="button" className="icon-button" onClick={() => onRemove(item.id)} aria-label={`Remove ${item.file.name}`}>×</button></div>)}</div> : null;
}

function FilePicker({ kind, onKind, onFiles }: { kind: DocumentKind; onKind: (kind: DocumentKind) => void; onFiles: (files: FileList) => void }) {
  const choose = (event: ChangeEvent<HTMLInputElement>) => {
    if (event.target.files) onFiles(event.target.files);
    event.target.value = "";
  };
  return <div className="file-picker"><label><span>Document type</span><select value={kind} onChange={(event) => onKind(event.target.value as DocumentKind)}>{DOCUMENT_OPTIONS.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label><div className="upload-options"><label className="upload-button"><input type="file" multiple accept="image/*,.heic,.heif" capture="environment" onChange={choose} /><span>Take photos</span><small>Use the rear camera</small></label><label className="upload-button"><input type="file" multiple accept="application/pdf,image/*,.heic,.heif" onChange={choose} /><span>Choose files</span><small>PDF, photo, or scan · 50 MB each</small></label></div></div>;
}

function NewClaimSheet({ state, onClose, onSave }: { state: ClaimDeskState; onClose: () => void; onSave: (form: NewClaimFormValue, files: PendingDocument[]) => Promise<void> }) {
  const [step, setStep] = useState(1);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [kind, setKind] = useState<DocumentKind>("invoice");
  const [files, setFiles] = useState<PendingDocument[]>([]);
  const [form, setForm] = useState<NewClaimFormValue>({ petId: state.pets[0]?.id ?? "", visitDate: todayLocal(), clinicName: "", clinicEmail: "", reason: "", invoiceNumber: "", billedAmount: "", eligibleAmount: "", firstClaim: false, diagnostics: false, paidInFull: true, notes: "" });
  const addFiles = (list: FileList) => setFiles((current) => [...current, ...Array.from(list).map((file) => ({ id: makeId("document"), file, kind }))]);
  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (step < 3) { setStep((value) => value + 1); return; }
    setBusy(true); setError("");
    try { await onSave(form, files); } catch (caught) { setError(caught instanceof Error ? caught.message : "Could not save this visit."); setBusy(false); }
  };
  const policy = state.policies.find((item) => item.petId === form.petId);
  return <Modal onClose={onClose} labelledBy="new-claim-title" wide><div className="sheet-header"><p className="eyebrow">New vet visit · Step {step} of 3</p><h1 id="new-claim-title">{step === 1 ? "What happened?" : step === 2 ? "Save the paperwork while it’s handy." : "Confirm the claim basics."}</h1></div><div className="setup-progress"><i className="active" /><i className={step >= 2 ? "active" : ""} /><i className={step >= 3 ? "active" : ""} /></div><form onSubmit={submit} className="stack-form sheet-form">
    {step === 1 && <><label><span>Pet</span><select value={form.petId} onChange={(event) => setForm({ ...form, petId: event.target.value })}>{state.pets.map((pet) => { const insured = state.policies.some((item) => item.petId === pet.id); return <option key={pet.id} value={pet.id} disabled={!insured}>{pet.name}{insured ? "" : " — add insurance first"}</option>; })}</select></label><div className="field-row"><label><span>Visit date</span><input type="date" value={form.visitDate} onChange={(event) => setForm({ ...form, visitDate: event.target.value })} required /></label><label><span>Invoice total</span><div className="input-prefix"><b>$</b><input inputMode="decimal" pattern={MONEY_PATTERN} value={form.billedAmount} onChange={(event) => setForm({ ...form, billedAmount: event.target.value })} placeholder="842.36" required /></div></label></div><label><span>Clinic</span><input value={form.clinicName} onChange={(event) => setForm({ ...form, clinicName: event.target.value })} placeholder="Aspen Creek Veterinary" required /></label><label><span>Clinic records email <em>optional</em></span><input type="email" value={form.clinicEmail} onChange={(event) => setForm({ ...form, clinicEmail: event.target.value })} placeholder="records@clinic.com" /></label><label><span>Reason for visit</span><input value={form.reason} onChange={(event) => setForm({ ...form, reason: event.target.value })} placeholder="Gastrointestinal follow-up" required /></label></>}
    {step === 2 && <><div className="capture-guidance"><span>Include every page</span><p>Make sure the clinic, date, line items, total, and payment status are visible. The original file stays unchanged.</p></div><FilePicker kind={kind} onKind={setKind} onFiles={addFiles} /><PendingFiles files={files} onRemove={(id) => setFiles((current) => current.filter((item) => item.id !== id))} /><button type="button" className="quiet-link" onClick={() => setStep(3)}>I’ll add the files later</button></>}
    {step === 3 && <><div className="field-row"><label><span>Invoice number <em>optional</em></span><input value={form.invoiceNumber} onChange={(event) => setForm({ ...form, invoiceNumber: event.target.value })} placeholder="INV-31682" /></label><label><span>Estimated eligible amount <em>optional</em></span><div className="input-prefix"><b>$</b><input inputMode="decimal" pattern={MONEY_PATTERN} value={form.eligibleAmount} onChange={(event) => setForm({ ...form, eligibleAmount: event.target.value })} placeholder={form.billedAmount || "0.00"} /></div></label></div><div className="check-group"><label><input type="checkbox" checked={form.paidInFull} onChange={(event) => setForm({ ...form, paidInFull: event.target.checked })} /><span><strong>Invoice is paid in full</strong><small>Uncheck if a balance or payment plan remains.</small></span></label><label><input type="checkbox" checked={form.diagnostics} onChange={(event) => setForm({ ...form, diagnostics: event.target.checked })} /><span><strong>Labs or imaging were performed</strong><small>The readiness check will look for the finalized report.</small></span></label><label><input type="checkbox" checked={form.firstClaim} onChange={(event) => setForm({ ...form, firstClaim: event.target.checked })} /><span><strong>This is the first accident/illness claim</strong><small>The carrier may review prior medical history.</small></span></label></div><label><span>Private note <em>optional</em></span><textarea value={form.notes} onChange={(event) => setForm({ ...form, notes: event.target.value })} placeholder="What we discussed, who we spoke with, or what still needs checking" rows={3} /></label><div className="notice"><strong>Suggested file-by date</strong><span>{formatDate(addDays(form.visitDate, policy?.filingWindowDays ?? 90))}. Confirm this against the issued policy.</span></div></>}
    {error && <p className="form-error" role="alert">{error}</p>}<div className="sheet-actions">{step > 1 && <button type="button" className="secondary-button" onClick={() => setStep((value) => value - 1)}>Back</button>}<button className="primary-button" disabled={busy}>{busy ? "Saving originals…" : step === 3 ? "Save visit and check readiness" : "Continue"}</button></div>
  </form></Modal>;
}

function AddDocumentsSheet({ onClose, onSave }: { onClose: () => void; onSave: (files: PendingDocument[]) => Promise<void> }) {
  const [kind, setKind] = useState<DocumentKind>("soap-notes");
  const [files, setFiles] = useState<PendingDocument[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  return <Modal onClose={onClose} labelledBy="add-documents-title"><div className="sheet-header"><p className="eyebrow">Original evidence</p><h1 id="add-documents-title">Add claim documents.</h1><p>Label each group accurately. The app keeps the original file unchanged.</p></div><FilePicker kind={kind} onKind={setKind} onFiles={(list) => setFiles((current) => [...current, ...Array.from(list).map((file) => ({ id: makeId("document"), file, kind }))])} /><PendingFiles files={files} onRemove={(id) => setFiles((current) => current.filter((item) => item.id !== id))} />{error && <p className="form-error" role="alert">{error}</p>}<button className="primary-button primary-button--full" disabled={!files.length || busy} onClick={() => { setBusy(true); setError(""); void onSave(files).catch((caught) => { setError(caught instanceof Error ? caught.message : "Could not save the files."); setBusy(false); }); }}>{busy ? "Saving…" : `Save ${files.length || ""} ${files.length === 1 ? "document" : "documents"}`}</button></Modal>;
}

function RecordsRequestSheet({ state, claimId, onClose, onLog }: { state: ClaimDeskState; claimId: Id; onClose: () => void; onLog: (claim: Claim) => void }) {
  const claim = state.claims.find((item) => item.id === claimId)!;
  const pet = state.pets.find((item) => item.id === claim.petId);
  const clinic = state.clinics.find((item) => item.id === claim.clinicId);
  const missing = claimReadiness(state, claim).filter((item) => item.state !== "complete" && ["soap-notes", "medical-history", "lab-result"].includes(item.kind ?? ""));
  const requested = missing.map((item) => item.label.toLowerCase()).join(", ") || "complete SOAP/chart notes and associated test results";
  const subject = `Records request for ${pet?.name ?? "our pet"} — ${formatDate(claim.visitDate)}`;
  const body = `Hello,\n\nCould you please send the ${requested} for ${pet?.name ?? "our pet"}’s ${formatDate(claim.visitDate)} visit? Please include every page and any finalized diagnostic reports.\n\nThank you`;
  const mailto = clinic?.email ? `mailto:${clinic.email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}` : `mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  return <Modal onClose={onClose} labelledBy="records-title"><div className="sheet-header"><p className="eyebrow">Missing records</p><h1 id="records-title">Request the exact files.</h1><p>Opening email does not mark this sent. Log it only after you actually send it.</p></div><div className="email-preview"><span>To: {clinic?.email ?? "Add the clinic’s email"}</span><span>Subject: {subject}</span><pre>{body}</pre></div><div className="sheet-actions sheet-actions--stack"><a className="primary-button" href={mailto}>Open email</a><button className="secondary-button" onClick={() => void navigator.clipboard.writeText(`${subject}\n\n${body}`)}>Copy request</button></div><button className="text-button text-button--center" onClick={() => onLog(claim)}>I sent it—log the request</button></Modal>;
}

function SubmissionSheet({ claim, onClose, onSave }: { claim: Claim; onClose: () => void; onSave: (submission: SubmissionInput) => void }) {
  const [channel, setChannel] = useState<SubmissionSnapshot["channel"]>("portal");
  const [date, setDate] = useState(todayLocal());
  const [confirmation, setConfirmation] = useState("");
  return <Modal onClose={onClose} labelledBy="submission-title"><div className="sheet-header"><p className="eyebrow">Immutable submission snapshot</p><h1 id="submission-title">Did you submit the claim?</h1><p>Only save this after the insurer app, portal, or email confirms the submission.</p></div><form className="stack-form" onSubmit={(event) => { event.preventDefault(); onSave({ channel, submittedAt: `${date}T12:00:00.000Z`, confirmationNumber: confirmation.trim() || undefined }); }}><label><span>Submission channel</span><select value={channel} onChange={(event) => setChannel(event.target.value as SubmissionSnapshot["channel"])}><option value="portal">Insurer portal</option><option value="app">Insurer app</option><option value="email">Email</option><option value="fax">Fax</option><option value="mail">Mail</option><option value="other">Other</option></select></label><label><span>Date submitted</span><input type="date" value={date} onChange={(event) => setDate(event.target.value)} required /></label><label><span>Claim or confirmation number <em>optional</em></span><input value={confirmation} onChange={(event) => setConfirmation(event.target.value)} placeholder={claim.carrierClaimNumber || "FC-918274"} /></label><div className="notice"><strong>What gets frozen</strong><span>The app records the documents attached right now. Later changes will not rewrite what was originally submitted.</span></div><button className="primary-button primary-button--full">Save submission snapshot</button></form></Modal>;
}

function EobSheet({ state, claim, onClose, onSave }: { state: ClaimDeskState; claim: Claim; onClose: () => void; onSave: (eob: EobReview) => void }) {
  const estimate = estimateReimbursement(state, claim);
  const policy = state.policies.find((item) => item.id === claim.policyId);
  const [decision, setDecision] = useState<EobReview["decision"]>(claim.eob?.decision ?? "paid");
  const [date, setDate] = useState(claim.eob?.decidedOn ?? todayLocal());
  const [billed, setBilled] = useState(centsToInput(claim.eob?.billedCents ?? claim.billedCents));
  const [eligible, setEligible] = useState(centsToInput(claim.eob?.eligibleCents ?? estimate?.eligibleCents));
  const [deductible, setDeductible] = useState(centsToInput(claim.eob?.deductibleAppliedCents ?? estimate?.deductibleAppliedCents));
  const [paid, setPaid] = useState(centsToInput(claim.eob?.reimbursedCents));
  const [notes, setNotes] = useState(claim.eob?.notes ?? "");
  const paidCents = amountToCents(paid);
  const enteredEligibleCents = amountToCents(eligible);
  const enteredDeductibleCents = Math.min(enteredEligibleCents, amountToCents(deductible));
  let expectedFromEobInputs = Math.round(Math.max(0, enteredEligibleCents - enteredDeductibleCents) * (policy?.reimbursementPercent ?? 0) / 100);
  if (policy?.annualLimitCents !== null && policy?.annualLimitCents !== undefined) {
    const available = Math.max(0, policy.annualLimitCents - policy.annualPaidCents + (claim.eob?.reimbursedCents ?? 0));
    expectedFromEobInputs = Math.min(expectedFromEobInputs, available);
  }
  const difference = paidCents - expectedFromEobInputs;
  return <Modal onClose={onClose} labelledBy="eob-title" wide><div className="sheet-header"><p className="eyebrow">Decision check</p><h1 id="eob-title">Compare the EOB with the estimate.</h1><p>Enter what the insurer actually decided. This does not change or override the EOB.</p></div><form className="stack-form sheet-form" onSubmit={(event) => { event.preventDefault(); onSave({ decision, decidedOn: date, billedCents: amountToCents(billed), eligibleCents: enteredEligibleCents, deductibleAppliedCents: enteredDeductibleCents, reimbursedCents: paidCents, notes: notes.trim() || undefined }); }}><div className="field-row"><label><span>Decision</span><select value={decision} onChange={(event) => setDecision(event.target.value as EobReview["decision"])}><option value="paid">Paid</option><option value="partial">Partially paid</option><option value="denied">Denied</option></select></label><label><span>Decision date</span><input type="date" value={date} onChange={(event) => setDate(event.target.value)} required /></label></div><div className="field-row field-row--money"><label><span>EOB billed</span><div className="input-prefix"><b>$</b><input value={billed} onChange={(event) => setBilled(event.target.value)} inputMode="decimal" pattern={MONEY_PATTERN} required /></div></label><label><span>Eligible</span><div className="input-prefix"><b>$</b><input value={eligible} onChange={(event) => setEligible(event.target.value)} inputMode="decimal" pattern={MONEY_PATTERN} required /></div></label><label><span>Deductible applied</span><div className="input-prefix"><b>$</b><input value={deductible} onChange={(event) => setDeductible(event.target.value)} inputMode="decimal" pattern={MONEY_PATTERN} required /></div></label><label><span>Insurer paid</span><div className="input-prefix"><b>$</b><input value={paid} onChange={(event) => setPaid(event.target.value)} inputMode="decimal" pattern={MONEY_PATTERN} required /></div></label></div><div className={difference < 0 ? "comparison comparison--review" : "comparison"}><div><span>Expected from EOB inputs</span><strong>{formatMoney(expectedFromEobInputs)}</strong></div><div><span>Recorded payment</span><strong>{formatMoney(paidCents)}</strong></div><p>{!paid ? "Enter the payment to compare it." : difference === 0 ? "Looks consistent with the current policy settings." : `${formatMoney(Math.abs(difference))} ${difference < 0 ? "below" : "above"} the policy-based calculation. Review the line items and policy source.`}</p></div><label><span>Review note <em>optional</em></span><textarea value={notes} onChange={(event) => setNotes(event.target.value)} rows={3} placeholder="Unmatched line, exclusion stated, or follow-up needed" /></label><button className="primary-button primary-button--full">Save EOB review</button></form></Modal>;
}

interface AddPetValue { name: string; species: Species; breed: string; carrierKey: string; carrierName: string; policyNumber: string; reimbursementPercent: number; deductible: string }
function AddPetSheet({ onClose, onSave }: { onClose: () => void; onSave: (value: AddPetValue) => void }) {
  const [value, setValue] = useState<AddPetValue>({ name: "", species: "dog", breed: "", carrierKey: "fetch", carrierName: "", policyNumber: "", reimbursementPercent: 80, deductible: "500" });
  return <Modal onClose={onClose} labelledBy="add-pet-title"><div className="sheet-header"><p className="eyebrow">Household pet</p><h1 id="add-pet-title">Add another pet.</h1></div><form className="stack-form" onSubmit={(event) => { event.preventDefault(); onSave(value); }}><label><span>Pet name</span><input value={value.name} onChange={(event) => setValue({ ...value, name: event.target.value })} autoFocus required /></label><div className="field-row"><label><span>Species</span><select value={value.species} onChange={(event) => setValue({ ...value, species: event.target.value as Species })}><option value="dog">Dog</option><option value="cat">Cat</option><option value="other">Other</option></select></label><label><span>Breed <em>optional</em></span><input value={value.breed} onChange={(event) => setValue({ ...value, breed: event.target.value })} /></label></div><label><span>Carrier</span><select value={value.carrierKey} onChange={(event) => setValue({ ...value, carrierKey: event.target.value })}>{CARRIER_PROFILES.map((profile) => <option key={profile.key} value={profile.key}>{profile.name}</option>)}</select></label>{value.carrierKey === "other" && <label><span>Carrier name</span><input value={value.carrierName} onChange={(event) => setValue({ ...value, carrierName: event.target.value })} required /></label>}<label><span>Policy number <em>optional</em></span><input value={value.policyNumber} onChange={(event) => setValue({ ...value, policyNumber: event.target.value })} /></label><div className="field-row"><label><span>Reimbursement</span><div className="input-suffix"><input type="number" min="0" max="100" value={value.reimbursementPercent} onChange={(event) => setValue({ ...value, reimbursementPercent: Number(event.target.value) })} required /><b>%</b></div></label><label><span>Deductible</span><div className="input-prefix"><b>$</b><input value={value.deductible} onChange={(event) => setValue({ ...value, deductible: event.target.value })} inputMode="decimal" pattern={MONEY_PATTERN} required /></div></label></div><button className="primary-button primary-button--full">Add pet and policy</button></form></Modal>;
}

interface PolicyEditState extends Policy {
  deductible: string;
  deductibleRemaining: string;
  annualLimit: string;
}

function PolicySheet({ policy, onClose, onSave }: { policy: Policy; onClose: () => void; onSave: (policy: Policy) => void }) {
  const [value, setValue] = useState<PolicyEditState>({
    ...policy,
    deductible: centsToInput(policy.deductibleCents),
    deductibleRemaining: centsToInput(policy.deductibleRemainingCents),
    annualLimit: policy.annualLimitCents === null ? "" : centsToInput(policy.annualLimitCents)
  });
  const update = (changes: Partial<PolicyEditState>) => setValue((current) => ({ ...current, ...changes, termsConfirmed: false }));
  const submit = (event: FormEvent) => {
    event.preventDefault();
    const { deductible, deductibleRemaining, annualLimit, ...stored } = value;
    onSave({
      ...stored,
      deductibleCents: amountToCents(deductible),
      deductibleRemainingCents: amountToCents(deductibleRemaining),
      annualLimitCents: annualLimit ? amountToCents(annualLimit) : null
    });
  };
  return <Modal onClose={onClose} labelledBy="policy-title" wide><div className="sheet-header"><p className="eyebrow">Policy source of truth</p><h1 id="policy-title">Review the settings used for estimates.</h1><p>Use the issued policy or current declarations page. Carrier website defaults are not enough.</p></div><form className="stack-form sheet-form" onSubmit={submit}><div className="field-row"><label><span>Carrier</span><select value={value.carrierKey} onChange={(event) => { const profile = carrierProfile(event.target.value); update({ carrierKey: profile.key, carrierName: profile.name, filingWindowDays: profile.filingWindowDays, appealWindowDays: profile.appealWindowDays }); }}>{CARRIER_PROFILES.map((profile) => <option key={profile.key} value={profile.key}>{profile.name}</option>)}</select></label><label><span>Policy number</span><input value={value.policyNumber ?? ""} onChange={(event) => update({ policyNumber: event.target.value })} /></label></div>{value.carrierKey === "other" && <label><span>Carrier name</span><input value={value.carrierName} onChange={(event) => update({ carrierName: event.target.value })} required /></label>}<div className="field-row field-row--money"><label><span>Reimbursement %</span><input type="number" min="0" max="100" value={value.reimbursementPercent} onChange={(event) => update({ reimbursementPercent: Number(event.target.value) })} required /></label><label><span>Deductible</span><div className="input-prefix"><b>$</b><input value={value.deductible} onChange={(event) => update({ deductible: event.target.value })} inputMode="decimal" pattern={MONEY_PATTERN} required /></div></label><label><span>Deductible remaining</span><div className="input-prefix"><b>$</b><input value={value.deductibleRemaining} onChange={(event) => update({ deductibleRemaining: event.target.value })} inputMode="decimal" pattern={MONEY_PATTERN} required /></div></label><label><span>Annual payout limit</span><div className="input-prefix"><b>$</b><input value={value.annualLimit} onChange={(event) => update({ annualLimit: event.target.value })} inputMode="decimal" pattern={MONEY_PATTERN} placeholder="Unlimited" /></div></label></div><div className="field-row"><label><span>Filing window in days</span><input type="number" min="1" max="730" value={value.filingWindowDays} onChange={(event) => update({ filingWindowDays: Number(event.target.value) })} required /></label><label><span>Appeal window in days</span><input type="number" min="1" max="730" value={value.appealWindowDays} onChange={(event) => update({ appealWindowDays: Number(event.target.value) })} required /></label></div><label className="confirmation-check"><input type="checkbox" checked={value.termsConfirmed} onChange={(event) => setValue((current) => ({ ...current, termsConfirmed: event.target.checked }))} /><span><strong>I checked these values against the issued policy.</strong><small>Editing any value clears this confirmation. The app still labels every reimbursement as an estimate.</small></span></label><button className="primary-button primary-button--full">Save policy settings</button></form></Modal>;
}
