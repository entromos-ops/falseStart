import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Terms | Hearthfolio",
  description: "Terms for using Hearthfolio's homeschool record-keeping software."
};

const supportEmail = process.env.NEXT_PUBLIC_SUPPORT_EMAIL;

export default function TermsPage() {
  return (
    <main className="legal-page">
      <nav className="legal-nav"><a href="/" className="brand"><span className="brand-mark"><i /></span><span>Hearthfolio</span></a><a href="/">Back to app</a></nav>
      <article className="legal-content">
        <p className="eyebrow">Effective July 13, 2026</p>
        <h1>Terms of use.</h1>
        <p>These terms apply when you use Hearthfolio. By using the product, you agree to them.</p>

        <section><h2>A record-keeping tool</h2><p>Hearthfolio organizes information you enter. It does not provide legal advice, interpret homeschool requirements, certify attendance, assess academic mastery, create official grades, or guarantee that a report will satisfy any authority. Requirements vary. You are responsible for verifying and meeting the rules that apply to your household.</p></section>
        <section><h2>Your records and backups</h2><p>You are responsible for the accuracy of your entries and for maintaining backups. Browser storage can be cleared or lost. The product is provided without cloud backup or multi-device sync.</p></section>
        <section><h2>Free and paid use</h2><p>The free plan may limit new entries, learners, archives, and report printing. Existing local records remain readable if a free limit is reached or a paid plan ends. A paid license is for one household and may have a reasonable device activation limit.</p></section>
        <section><h2>Billing</h2><p>When paid sales are available, the displayed plan renews annually until canceled. The checkout page will identify the merchant of record, taxes, renewal date, cancellation method, and applicable refund terms before purchase. Do not purchase unless those details are acceptable to you.</p></section>
        <section><h2>Acceptable use</h2><p>Do not misuse the license system, interfere with the product, use it unlawfully, or redistribute paid access. You may export, print, and share reports made from your own household records.</p></section>
        <section><h2>Availability and warranty</h2><p>Hearthfolio is provided “as is” and may change. To the extent allowed by law, we disclaim implied warranties and are not liable for lost records, missed requirements, indirect damages, or decisions made from the software. Nothing here excludes rights that cannot legally be excluded.</p></section>
        <section><h2>Changes</h2><p>Material changes will be reflected by updating the effective date. Continued use after a change means you accept the revised terms.</p></section>
        <section><h2>Questions</h2><p>{supportEmail ? <>Email <a href={`mailto:${supportEmail}`}>{supportEmail}</a>.</> : "A support contact will be listed here before paid sales open."}</p></section>
      </article>
    </main>
  );
}
