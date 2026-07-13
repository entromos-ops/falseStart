import LumaRealmGame from "@/components/LumaRealmGame";

const siteUrl = (
  process.env.NEXT_PUBLIC_SITE_URL ?? "https://false-start.vercel.app"
).replace(/\/$/, "");

const structuredData = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "VideoGame",
      "@id": `${siteUrl}/#game`,
      name: "Luma Village",
      url: siteUrl,
      image: `${siteUrl}/og.png`,
      description:
        "A cozy role-playing game that begins with a practical Spanish market conversation, then teaches through farming, trading, cooking, and conversations with villagers.",
      genre: ["Educational game", "Role-playing game", "Life simulation game"],
      gamePlatform: "Web browser",
      playMode: "SinglePlayer",
      inLanguage: ["en", "es"],
      isAccessibleForFree: true,
      educationalUse: "Language learning",
      audience: {
        "@type": "EducationalAudience",
        educationalRole: "student"
      },
      offers: {
        "@type": "Offer",
        price: "0",
        priceCurrency: "USD",
        availability: "https://schema.org/InStock"
      },
      potentialAction: {
        "@type": "PlayAction",
        target: `${siteUrl}/?challenge=market`
      }
    },
    {
      "@type": "SoftwareApplication",
      "@id": `${siteUrl}/#application`,
      name: "Luma Village",
      url: siteUrl,
      image: `${siteUrl}/og.png`,
      description:
        "Learn practical Spanish inside a cozy RPG where understanding the language helps you explore, farm, trade, cook, and complete quests.",
      applicationCategory: "EducationalApplication",
      applicationSubCategory: "Language learning game",
      operatingSystem: "Any",
      browserRequirements: "Requires a modern web browser with JavaScript enabled",
      inLanguage: ["en", "es"],
      isAccessibleForFree: true,
      featureList: [
        "A 60-second practical Spanish market challenge",
        "Practical Spanish in everyday situations",
        "Adaptive English language support",
        "Farming, gathering, trading, and cooking quests",
        "Spanish pronunciation playback",
        "Progress saved on the player's device"
      ],
      offers: {
        "@type": "Offer",
        price: "0",
        priceCurrency: "USD",
        availability: "https://schema.org/InStock"
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
      <LumaRealmGame />
    </>
  );
}
