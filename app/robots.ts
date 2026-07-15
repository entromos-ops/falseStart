import type { MetadataRoute } from "next";

export const dynamic = "force-static";

const siteUrl = (
  process.env.NEXT_PUBLIC_SITE_URL ?? "https://homeschool-start.vercel.app"
).replace(/\/$/, "");

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: ["/", "/privacy", "/terms"],
      disallow: ["/api/", "/legacy-yearkeep-export"]
    },
    sitemap: `${siteUrl}/sitemap.xml`,
    host: siteUrl
  };
}
