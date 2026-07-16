import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Terms",
  description: "Terms for the SpotGrid podcast sponsorship inventory beta."
};

const supportEmail = process.env.NEXT_PUBLIC_SUPPORT_EMAIL;

function Brand() {
  return <a href="/" className="brand"><span className="brand-mark" aria-hidden="true">SG</span><span>SpotGrid</span></a>;
}

export default function TermsPage() {
  return (
    <main className="legal-page">
      <nav className="legal-nav"><Brand /><a href="/">Back to app</a></nav>
      <article className="legal-content">
        <p className="eyebrow">Effective July 16, 2026</p>
        <h1>Terms for this beta.</h1>
        <p>SpotGrid is an early operations tool for planning host-read podcast sponsorships. It is not an ad server, marketplace, attribution system, accounting system, or legal representative.</p>

        <section>
          <h2>Verify every commitment</h2>
          <p>You are responsible for confirming inventory availability, sponsor exclusivity, insertion orders, copy approvals, delivery obligations, invoices, and any make-good terms before making commitments to advertisers.</p>
        </section>

        <section>
          <h2>Planning data</h2>
          <p>Conflict checks and reports are operational aids. They may be incomplete if your data is incomplete, imported incorrectly, or stored in another tool. Do not rely on SpotGrid as the sole source for binding commercial commitments.</p>
        </section>

        <section>
          <h2>Acceptable use</h2>
          <p>Do not attempt unauthorized access, upload unlawful material, interfere with the service, overload the service, or use the product to mislead advertisers, creators, agencies, or buyers.</p>
        </section>

        <section>
          <h2>Availability and warranty</h2>
          <p>The beta is provided &quot;as is&quot; and may change or stop. To the extent allowed by law, we disclaim implied warranties and are not liable for missed sponsorship obligations, lost data, lost revenue, provider outages, or indirect damages.</p>
        </section>

        <section>
          <h2>Questions</h2>
          <p>{supportEmail ? <>Email <a href={`mailto:${supportEmail}`}>{supportEmail}</a>.</> : "A support contact will be added before access expands beyond the private beta."}</p>
        </section>
      </article>
    </main>
  );
}
