import ClaimDeskApp from "@/components/ClaimDeskApp";

const siteUrl = (
  process.env.NEXT_PUBLIC_SITE_URL ?? "https://homeschool-start.vercel.app"
).replace(/\/$/, "");

const structuredData = {
  "@context": "https://schema.org",
  "@type": "SoftwareApplication",
  "@id": `${siteUrl}/#application`,
  name: "Pet Claim Desk",
  url: siteUrl,
  description:
    "A private household workspace for organizing pet insurance claims, supporting documents, deadlines, submissions, and reimbursements.",
  applicationCategory: "FinanceApplication",
  applicationSubCategory: "Pet insurance claim organizer",
  operatingSystem: "Any",
  browserRequirements: "Requires a modern web browser with JavaScript enabled",
  isAccessibleForFree: true,
  featureList: [
    "Visit and claim tracking",
    "Carrier-aware document checklists",
    "Private invoice and medical-record storage",
    "Submission history and deadline reminders",
    "Reimbursement review",
    "Portable household backups"
  ]
};

export default function Home() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(structuredData).replace(/</g, "\\u003c")
        }}
      />
      <ClaimDeskApp />
    </>
  );
}
