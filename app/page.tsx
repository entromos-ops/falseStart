import SpotGridApp from "@/components/SpotGridApp";

const siteUrl = (
  process.env.NEXT_PUBLIC_SITE_URL ?? "https://homeschool-start.vercel.app"
).replace(/\/$/, "");

const structuredData = {
  "@context": "https://schema.org",
  "@type": "SoftwareApplication",
  "@id": `${siteUrl}/#application`,
  name: "SpotGrid",
  url: siteUrl,
  description:
    "A lightweight inventory board for podcast networks selling baked-in host-read sponsorships across shows and episodes.",
  applicationCategory: "BusinessApplication",
  applicationSubCategory: "Podcast advertising inventory management",
  operatingSystem: "Any",
  browserRequirements: "Requires a modern web browser with JavaScript enabled",
  isAccessibleForFree: true,
  featureList: [
    "Show and episode inventory",
    "Pre-roll, mid-roll, and post-roll availability",
    "Sponsor category conflict checks",
    "Brief-to-invoice production pipeline",
    "Advertiser delivery reports",
    "CSV import and export"
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
      <SpotGridApp />
    </>
  );
}
