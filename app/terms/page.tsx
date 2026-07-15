import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Terms",
  description: "Terms for the Pet Claim Desk private pet insurance claim organizer."
};

const supportEmail = process.env.NEXT_PUBLIC_SUPPORT_EMAIL;

function Brand() {
  return <a href="/" className="brand"><span className="brand-mark" aria-hidden="true"><i /><b /></span><span>Pet Claim Desk</span></a>;
}

export default function TermsPage() {
  return (
    <main className="legal-page">
      <nav className="legal-nav"><Brand /><a href="/">Back to app</a></nav>
      <article className="legal-content">
        <p className="eyebrow">Effective July 15, 2026</p>
        <h1>Terms for this private beta.</h1>
        <p>These terms apply when you use Pet Claim Desk. The product is currently an early household tool, not an insurance or veterinary service.</p>

        <section>
          <h2>An organizer, not a representative</h2>
          <p>Pet Claim Desk helps you organize information, prepare files, record communications, and review calculations. It does not sell insurance, provide legal, medical, tax, or insurance advice, determine coverage, diagnose an animal, negotiate a settlement, represent you, or submit a claim unless you personally complete the carrier&apos;s required submission.</p>
        </section>

        <section>
          <h2>Verify every submission</h2>
          <p>Carrier requirements, policy terms, filing windows, appeal windows, deductibles, limits, and reimbursement methods vary and can change. Check the current policy and carrier instructions. Estimates and readiness checks may be incomplete or wrong and are not promises of payment.</p>
        </section>

        <section>
          <h2>Your records and authority</h2>
          <p>You are responsible for the accuracy of information you enter and for confirming that uploaded records belong to the correct pet and claim. Upload only material you own or are authorized to use. Do not alter veterinary records or use the product to mislead a clinic or insurer.</p>
        </section>

        <section>
          <h2>Private code and household access</h2>
          <p>Keep the complete household code confidential. Anyone with it can access and change the encrypted shared workspace. You are responsible for household members you give it to. There is no password-reset or key-recovery service.</p>
        </section>

        <section>
          <h2>Storage and backups</h2>
          <p>Local browser data can be erased and shared storage can be interrupted. Maintain a recent complete backup in a secure place. A downloaded backup can contain unencrypted invoices and veterinary documents, so handle it accordingly.</p>
        </section>

        <section>
          <h2>Acceptable use</h2>
          <p>Do not attempt unauthorized access, upload malware or unlawful material, interfere with the service, probe another household&apos;s workspace, overload the service, or use the product to commit fraud. We may limit access when reasonably necessary to protect users, the service, or its providers.</p>
        </section>

        <section>
          <h2>Availability and warranty</h2>
          <p>The beta is provided &quot;as is&quot; and may change or stop. To the extent allowed by law, we disclaim implied warranties and are not liable for missed deadlines, claim outcomes, lost records, lost private codes, provider outages, or indirect damages. Nothing in these terms limits rights or liability that cannot legally be limited.</p>
        </section>

        <section>
          <h2>Changes</h2>
          <p>We may revise these terms as the product changes. Material updates will be reflected by a new effective date. Stop using the product if revised terms are unacceptable.</p>
        </section>

        <section>
          <h2>Questions</h2>
          <p>{supportEmail ? <>Email <a href={`mailto:${supportEmail}`}>{supportEmail}</a>.</> : "A support contact will be added before access expands beyond the private household beta."}</p>
        </section>
      </article>
    </main>
  );
}
