import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Privacy",
  description: "How SpotGrid handles podcast advertising inventory data."
};

const supportEmail = process.env.NEXT_PUBLIC_SUPPORT_EMAIL;

function Brand() {
  return <a href="/" className="brand"><span className="brand-mark" aria-hidden="true">SG</span><span>SpotGrid</span></a>;
}

export default function PrivacyPage() {
  return (
    <main className="legal-page">
      <nav className="legal-nav"><Brand /><a href="/">Back to app</a></nav>
      <article className="legal-content">
        <p className="eyebrow">Effective July 16, 2026</p>
        <h1>Privacy for the current beta.</h1>
        <p>SpotGrid is currently a browser-first planning tool for podcast sponsorship inventory. It is built to track commercial workflow data, not private listener data or audio files.</p>

        <section>
          <h2>What this version stores</h2>
          <p>The app stores shows, episodes, sponsor names, categories, slot status, values, owners, due dates, notes, and imported CSV rows in this browser&apos;s local storage. Clearing site data or using another browser can remove that copy.</p>
        </section>

        <section>
          <h2>What this version does not do</h2>
          <p>The current build does not host audio, insert ads dynamically, record calls, collect listener analytics, process payments, or send sponsor data to a third-party CRM. It also does not include advertising trackers or product analytics.</p>
        </section>

        <section>
          <h2>CSV import and export</h2>
          <p>CSV files are processed in the browser. An exported CSV can contain sponsor commitments, pricing, and internal notes, so store and share it like a commercial operations document.</p>
        </section>

        <section>
          <h2>Hosting logs</h2>
          <p>The site is hosted on Vercel. Hosting providers may process ordinary operational metadata such as IP address, user agent, request path, and timestamps for security and reliability.</p>
        </section>

        <section>
          <h2>Questions</h2>
          <p>{supportEmail ? <>Email <a href={`mailto:${supportEmail}`}>{supportEmail}</a>.</> : "A support contact will be added before access expands beyond the private beta."}</p>
        </section>
      </article>
    </main>
  );
}
