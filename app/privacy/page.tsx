import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Privacy",
  description: "How Pet Claim Desk stores and protects household claim information and documents."
};

const supportEmail = process.env.NEXT_PUBLIC_SUPPORT_EMAIL;

function Brand() {
  return <a href="/" className="brand"><span className="brand-mark" aria-hidden="true"><i /><b /></span><span>Pet Claim Desk</span></a>;
}

export default function PrivacyPage() {
  return (
    <main className="legal-page">
      <nav className="legal-nav"><Brand /><a href="/">Back to app</a></nav>
      <article className="legal-content">
        <p className="eyebrow">Effective July 15, 2026</p>
        <h1>Privacy, without the fog.</h1>
        <p>Pet Claim Desk handles invoices, veterinary records, policy details, and claim history. We treat that material as sensitive even though veterinary records generally are not human medical records covered by HIPAA.</p>

        <section>
          <h2>What this device stores</h2>
          <p>The app stores household details, pet and policy information, claim history, workflow events, and the private household session in this browser. Documents are stored in the browser&apos;s IndexedDB storage. Clearing site data, using another browser, or losing the device can remove that local copy.</p>
        </section>

        <section>
          <h2>Optional shared sync</h2>
          <p>If you turn on shared sync, household data is encrypted in your browser before it is sent to a private Vercel Blob store. Uploaded documents are also encrypted in the browser before upload. The storage service receives encrypted content, a workspace identifier, a derived authorization value, and ordinary request metadata such as an IP address and user agent. The full private household code is not intentionally sent to the server.</p>
        </section>

        <section>
          <h2>Your private household code</h2>
          <p>The code is both the key to the workspace and the material used to unlock its encrypted content. Anyone who has the complete code can read and change the shared household. We cannot recover it if every household member loses it. Share it only through a channel you trust.</p>
        </section>

        <section>
          <h2>Backups</h2>
          <p>A complete downloaded backup contains readable household data and copies of documents that the device can retrieve. The backup is portable, but it is not password-protected by Pet Claim Desk. Store it in a private, encrypted location and delete copies you no longer need.</p>
        </section>

        <section>
          <h2>Analytics and advertising</h2>
          <p>The current private household version does not include advertising trackers or product analytics. Hosting and storage providers may still maintain operational and security logs under their own terms. We do not sell claim or veterinary information.</p>
        </section>

        <section>
          <h2>Deletion and retention</h2>
          <p>You can remove the household from a device and delete individual documents in the app. Removing a device copy does not by itself delete a synchronized workspace. Self-service deletion of an entire shared workspace is not yet available; contact us if a synchronized workspace must be removed. Provider backups and security logs may persist for a limited period.</p>
        </section>

        <section>
          <h2>Use by adults</h2>
          <p>Pet Claim Desk is intended for an adult managing a household&apos;s animals and insurance claims. Do not use it to store human medical records, payment-card numbers, account passwords, or information you do not have permission to possess.</p>
        </section>

        <section>
          <h2>Questions</h2>
          <p>{supportEmail ? <>Email <a href={`mailto:${supportEmail}`}>{supportEmail}</a>.</> : "A support contact will be added before access expands beyond the private household beta."}</p>
        </section>
      </article>
    </main>
  );
}
