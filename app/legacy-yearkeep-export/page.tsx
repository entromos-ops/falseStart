"use client";

import { useEffect, useState } from "react";

const LEGACY_STORAGE_KEY = "hearthfolio:household:v1";

type LegacyStatus = "checking" | "available" | "empty";

function download(filename: string, value: string, type: string) {
  const url = URL.createObjectURL(new Blob([value], { type }));
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 1_000);
}

export default function LegacyYearkeepExportPage() {
  const [status, setStatus] = useState<LegacyStatus>("checking");
  const [message, setMessage] = useState("");

  useEffect(() => {
    try {
      setStatus(window.localStorage.getItem(LEGACY_STORAGE_KEY) ? "available" : "empty");
    } catch {
      setStatus("empty");
      setMessage("This browser did not allow access to its old local records.");
    }
  }, []);

  const exportLegacyRecords = () => {
    const raw = window.localStorage.getItem(LEGACY_STORAGE_KEY);
    if (!raw) {
      setStatus("empty");
      setMessage("No Yearkeep household record was found in this browser.");
      return;
    }

    const date = new Date().toISOString().slice(0, 10);
    try {
      const data: unknown = JSON.parse(raw);
      const backup = {
        format: "hearthfolio-backup",
        exportedAt: new Date().toISOString(),
        data
      };
      download(
        `yearkeep-backup-${date}.json`,
        JSON.stringify(backup, null, 2),
        "application/json"
      );
      setMessage("Yearkeep backup downloaded. The old browser record was not deleted.");
    } catch {
      download(`yearkeep-recovery-${date}.txt`, raw, "text/plain;charset=utf-8");
      setMessage("The old record was not valid JSON, so a raw recovery copy was downloaded instead. The browser record was not deleted.");
    }
  };

  return (
    <main className="legal-page">
      <nav className="legal-nav">
        <a href="/" className="brand"><span className="brand-mark" aria-hidden="true"><i /><b /></span><span>Pet Claim Desk</span></a>
        <a href="/">Back to app</a>
      </nav>
      <article className="legal-content">
        <p className="eyebrow">Legacy data rescue</p>
        <h1>Export old Yearkeep records.</h1>
        <p>Yearkeep saved records only in this browser under the same website address. This page preserves a way to retrieve them after the product pivot.</p>

        <section>
          <h2>What this does</h2>
          <p>The download is compatible with Yearkeep&apos;s original backup format. Exporting does not add homeschool information to Pet Claim Desk, upload it, or remove it from the browser.</p>
          <div className="legacy-panel">
            {status === "checking" && <p>Checking this browser for old records...</p>}
            {status === "available" && <>
              <p>Yearkeep records were found on this device.</p>
              <button className="primary-button" type="button" onClick={exportLegacyRecords}>Download Yearkeep backup</button>
            </>}
            {status === "empty" && <p>No Yearkeep household record was found in this browser. Records saved on another phone, computer, browser, or hostname cannot be reached from here.</p>}
            {message && <p role="status">{message}</p>}
          </div>
        </section>

        <section>
          <h2>Keep the file somewhere safe</h2>
          <p>The backup may contain learner names and learning notes. Treat it as a private household record. The old browser value remains untouched so this page can be used again.</p>
        </section>
      </article>
    </main>
  );
}
