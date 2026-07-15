# Pet Claim Desk

Pet Claim Desk is a mobile-first household workspace for the paperwork around pet insurance. It keeps visits, policies, invoices, medical records, carrier requirements, submission evidence, deadlines, decisions, and reimbursements in one place.

The GitHub repository is still named `falseStart`; the public product is Pet Claim Desk.

## What is implemented

- Private household setup with pets and policy terms
- Visit and claim tracking from draft through payment or appeal
- Carrier-aware readiness checklists
- Invoice, receipt, SOAP-note, medical-history, lab, EOB, and correspondence uploads
- Local document storage in IndexedDB
- Optional encrypted household sync for a second phone
- Client-side document encryption before private Vercel Blob upload
- Records-request drafts and a dated evidence timeline
- Submission snapshots and confirmation-number tracking
- Reimbursement estimates and EOB comparison
- Downloadable ZIP claim packets
- Complete JSON backups containing retrievable documents
- Installable mobile PWA and offline shell
- A legacy page for exporting old Yearkeep browser records

## Product boundary

Pet Claim Desk is an organizer. It does not diagnose an animal, interpret coverage conclusively, provide insurance or legal advice, negotiate with a carrier, represent a policyholder, or automatically file a claim. The policyholder must verify every requirement, calculation, deadline, attestation, and submission with the current policy and carrier instructions.

The current build does not perform OCR or AI document interpretation. Claim and policy details are entered by the household.

## Storage model

The app works locally before shared storage is connected:

- Structured household data and the local session are stored in `localStorage`.
- Documents are stored as blobs in IndexedDB.
- A complete backup includes structured data and base64 copies of documents available to that device.

When shared sync is enabled:

- The browser encrypts structured state with AES-GCM before upload.
- The browser encrypts each document before upload.
- A private Vercel Blob store holds ciphertext and encrypted document blobs.
- A derived authorization token protects the workspace API.
- The full household code remains on household devices and is not intentionally sent to the server.

Anyone with the complete household code can decrypt and change the workspace. There is no key recovery. A downloaded backup contains readable records and should be stored in a private, encrypted location.

## Local development

```powershell
npm install
npm run dev
```

Open `http://127.0.0.1:3000`.

Verification:

```powershell
npm test
npm run typecheck
npm run build
```

Unlike the previous Yearkeep build, this is not a static export. Next.js route handlers authorize encrypted state sync and private document operations.

## Environment

Copy `.env.example` to `.env.local`:

```dotenv
NEXT_PUBLIC_SITE_URL=https://homeschool-start.vercel.app
NEXT_PUBLIC_SUPPORT_EMAIL=
BLOB_READ_WRITE_TOKEN=
BLOB_STORE_ID=
```

`NEXT_PUBLIC_SITE_URL` is used for canonical metadata, robots, and the sitemap. Set a support address before inviting outside users.

Create a **private** Vercel Blob store and connect it to the Vercel project. Vercel supplies the Blob credentials to the deployment. For local shared-sync testing, pull or copy the server-only credentials into `.env.local`.

Never put `BLOB_READ_WRITE_TOKEN`, storage credentials, encryption secrets, or household codes in a `NEXT_PUBLIC_` variable, source control, logs, or analytics.

Without Blob credentials, the app continues to work locally on one browser. Shared household sync and cloud document retrieval remain disabled.

## API routes

- `GET /api/sync/status` reports whether private Blob storage is connected.
- `GET|PUT /api/sync/[workspaceId]` reads or updates encrypted household state.
- `POST /api/documents/upload` authorizes browser-direct encrypted uploads.
- `GET|DELETE /api/documents` retrieves or removes an authorized encrypted document.

The Vercel store never receives an unencrypted invoice or veterinary document from the application. Ordinary hosting request metadata can still be processed by Vercel.

## Backups and the Yearkeep pivot

The old Yearkeep key, `hearthfolio:household:v1`, is intentionally left untouched. Visit `/legacy-yearkeep-export` from the same browser and hostname to download those records in the original `hearthfolio-backup` format. Browser storage from another hostname or device is not reachable.

The Pet Claim Desk backup marker is `pet-claim-desk-backup`, version `1`.

## Deployment

`main` is the production branch for the existing Vercel project. Before pushing:

1. Connect a private Blob store.
2. Confirm the production environment variables.
3. Run tests, typecheck, and the production build.
4. Exercise create, join, upload, download, sync-conflict, backup, restore, and deletion paths on mobile.
5. Confirm the privacy and terms pages match the deployed behavior.

The private household beta is not a security certification. Before broad public use, add a formal threat review, abuse controls, workspace deletion, retention procedures, monitoring that excludes sensitive content, and appropriate commercial hosting and legal review.
