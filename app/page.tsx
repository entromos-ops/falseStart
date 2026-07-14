import YearkeepApp from "@/components/HearthfolioApp";

const siteUrl = (
  process.env.NEXT_PUBLIC_SITE_URL ?? "https://homeschool-start.vercel.app"
).replace(/\/$/, "");

const structuredData = {
  "@context": "https://schema.org",
  "@type": "SoftwareApplication",
  "@id": `${siteUrl}/#application`,
  name: "Yearkeep",
  url: siteUrl,
  image: `${siteUrl}/og.png`,
  description:
    "A private, local-first homeschool learning log that turns quick daily notes into a learning-day calendar and printable portfolio.",
  applicationCategory: "EducationalApplication",
  applicationSubCategory: "Homeschool record keeping",
  operatingSystem: "Any",
  browserRequirements: "Requires a modern web browser with JavaScript enabled",
  isAccessibleForFree: true,
  featureList: [
    "Quick private learning journal",
    "Learning-day and subject progress",
    "Live end-of-year report preview",
    "JSON backup and CSV export",
    "Records stored in the user's browser"
  ],
  offers: [
    {
      "@type": "Offer",
      name: "Yearkeep Free",
      price: "0",
      priceCurrency: "USD"
    },
    {
      "@type": "Offer",
      name: "Yearkeep Pro annual plan",
      price: "12",
      priceCurrency: "USD",
      priceSpecification: {
        "@type": "UnitPriceSpecification",
        price: "12",
        priceCurrency: "USD",
        billingDuration: "P1Y"
      }
    }
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
      <YearkeepApp />
    </>
  );
}
