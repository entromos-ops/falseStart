export type Id = string;
export type LocalDate = string;
export type IsoInstant = string;
export type Cents = number;

export type Species = "dog" | "cat" | "other";

export type ClaimStatus =
  | "draft"
  | "ready"
  | "submitted"
  | "needs-information"
  | "under-review"
  | "paid"
  | "partially-paid"
  | "denied"
  | "appeal-preparing"
  | "appeal-submitted"
  | "closed";

export type DocumentKind =
  | "invoice"
  | "receipt"
  | "soap-notes"
  | "medical-history"
  | "lab-result"
  | "imaging"
  | "discharge-notes"
  | "policy"
  | "claim-form"
  | "submission-confirmation"
  | "information-request"
  | "eob"
  | "denial"
  | "appeal"
  | "correspondence"
  | "other";

export type EventKind =
  | "claim-created"
  | "document-added"
  | "records-requested"
  | "records-received"
  | "claim-submitted"
  | "status-changed"
  | "decision-received"
  | "payment-received"
  | "appeal-submitted"
  | "note";

export interface Household {
  id: Id;
  name: string;
  createdAt: IsoInstant;
  updatedAt: IsoInstant;
}

export interface Member {
  id: Id;
  name: string;
  createdAt: IsoInstant;
  updatedAt: IsoInstant;
}

export interface Pet {
  id: Id;
  name: string;
  species: Species;
  breed?: string;
  birthDate?: LocalDate;
  createdAt: IsoInstant;
  updatedAt: IsoInstant;
}

export interface Policy {
  id: Id;
  petId: Id;
  carrierKey: string;
  carrierName: string;
  policyNumber?: string;
  startsOn?: LocalDate;
  renewsOn?: LocalDate;
  reimbursementPercent: number;
  deductibleType: "annual" | "per-condition" | "per-incident";
  deductibleCents: Cents;
  deductibleRemainingCents: Cents;
  annualLimitCents: Cents | null;
  annualPaidCents: Cents;
  filingWindowDays: number;
  appealWindowDays: number;
  examFeeTreatment: "covered" | "excluded" | "unknown";
  termsConfirmed: boolean;
  createdAt: IsoInstant;
  updatedAt: IsoInstant;
}

export interface Clinic {
  id: Id;
  name: string;
  email?: string;
  phone?: string;
  createdAt: IsoInstant;
  updatedAt: IsoInstant;
}

export interface SubmissionSnapshot {
  id: Id;
  channel: "portal" | "app" | "email" | "fax" | "mail" | "other";
  submittedAt: IsoInstant;
  confirmationNumber?: string;
  documentIds: Id[];
  documents: Array<{
    documentId: Id;
    originalName: string;
    kind: DocumentKind;
    sizeBytes: number;
    uploadedAt: IsoInstant;
  }>;
  actorId: Id;
}

export interface EobReview {
  decision: "paid" | "partial" | "denied";
  decidedOn: LocalDate;
  billedCents: Cents;
  eligibleCents: Cents;
  deductibleAppliedCents: Cents;
  reimbursedCents: Cents;
  notes?: string;
}

export interface Claim {
  id: Id;
  petId: Id;
  policyId: Id;
  clinicId?: Id;
  visitDate: LocalDate;
  reason: string;
  invoiceNumber?: string;
  billedCents: Cents;
  eligibleCents?: Cents;
  status: ClaimStatus;
  firstAccidentIllnessClaim: boolean;
  diagnosticsPerformed: boolean;
  paidInFull: boolean;
  filingDeadline?: LocalDate;
  carrierClaimNumber?: string;
  submission?: SubmissionSnapshot;
  eob?: EobReview;
  notes?: string;
  createdBy: Id;
  createdAt: IsoInstant;
  updatedAt: IsoInstant;
}

export interface DocumentRecord {
  id: Id;
  claimId: Id;
  kind: DocumentKind;
  originalName: string;
  mimeType: string;
  sizeBytes: number;
  storage: "local" | "cloud";
  localBlobId?: string;
  blobPathname?: string;
  encryptionIv?: string;
  uploadedBy: Id;
  createdAt: IsoInstant;
  updatedAt: IsoInstant;
}

export interface ClaimEvent {
  id: Id;
  claimId: Id;
  kind: EventKind;
  note: string;
  actorId: Id;
  createdAt: IsoInstant;
  updatedAt: IsoInstant;
}

export interface ClaimDeskState {
  schemaVersion: 1;
  workspaceId: string;
  household: Household;
  members: Member[];
  pets: Pet[];
  policies: Policy[];
  clinics: Clinic[];
  claims: Claim[];
  documents: DocumentRecord[];
  documentDeletions: Array<{
    id: Id;
    deletedAt: IsoInstant;
    updatedAt: IsoInstant;
    blobPathname?: string;
    cloudDeletedAt?: IsoInstant;
  }>;
  events: ClaimEvent[];
  exampleMode?: boolean;
  createdAt: IsoInstant;
  updatedAt: IsoInstant;
}

export interface LocalSession {
  schemaVersion: 1;
  workspaceId: string;
  rootSecret: string;
  memberId: Id;
  syncEnabled: boolean;
  syncRevision: number;
  lastSyncedAt?: IsoInstant;
  lastSyncedStateUpdatedAt?: IsoInstant;
}

export interface PortableDocument {
  documentId: Id;
  mimeType: string;
  base64: string;
}

export interface PortableBackup {
  format: "pet-claim-desk-backup";
  version: 1;
  exportedAt: IsoInstant;
  state: ClaimDeskState;
  documents: PortableDocument[];
  omittedDocumentIds: Id[];
}
