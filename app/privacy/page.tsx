import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Privacy | Yearkeep",
  description: "How Yearkeep handles local learning records, analytics, and license checks."
};

const supportEmail = process.env.NEXT_PUBLIC_SUPPORT_EMAIL;

export default function PrivacyPage() {
  return (
    <main className="legal-page">
      <nav className="legal-nav"><a href="/" className="brand"><span className="brand-mark"><i /></span><span>Yearkeep</span></a><a href="/">Back to app</a></nav>
      <article className="legal-content">
        <p className="eyebrow">Effective July 14, 2026</p>
        <h1>Privacy, in plain language.</h1>
        <p>Yearkeep is designed so the operator does not need a copy of your family’s learning records.</p>

        <section><h2>What stays in your browser</h2><p>Learner names or nicknames, grade labels, learning notes, subjects, dates, attendance selections, and report contents are stored in your browser’s local storage. Yearkeep does not upload these records or create a cloud account.</p></section>
        <section><h2>What may be collected</h2><p>We use Vercel Web Analytics to understand aggregate page visits and feature usage. We do not intentionally include learner names, note text, subjects, report contents, license keys, or customer email addresses in analytics events.</p></section>
        <section><h2>Paid licenses</h2><p>If paid access is enabled and you activate a license, your license key and a generic browser or device label are sent directly to Lemon Squeezy for activation and periodic validation. Learning records are not included. Lemon Squeezy’s own privacy terms govern the purchase and license service.</p></section>
        <section><h2>Backups and loss</h2><p>Local storage can be erased if you clear browser data, lose a device, or change browsers. Yearkeep provides a downloadable backup. You are responsible for keeping a recent backup somewhere safe.</p></section>
        <section><h2>Children’s information</h2><p>Yearkeep is a tool for a parent or responsible adult. It does not offer child accounts. Use initials or a nickname if you prefer not to store a full name in the browser.</p></section>
        <section><h2>Your choices</h2><p>You can remove local learning data by deleting entries or clearing this site’s browser storage. Deactivating a paid license removes the local entitlement but does not delete learning records.</p></section>
        <section><h2>Questions</h2><p>{supportEmail ? <>Email <a href={`mailto:${supportEmail}`}>{supportEmail}</a>.</> : "A support contact will be listed here before paid sales open."}</p></section>
      </article>
    </main>
  );
}
