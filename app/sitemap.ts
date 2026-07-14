import type { MetadataRoute } from "next";

export const dynamic = "force-static";

const siteUrl = (
  process.env.NEXT_PUBLIC_SITE_URL ?? "https://homeschool-start.vercel.app"
).replace(/\/$/, "");

export default function sitemap(): MetadataRoute.Sitemap {
  return [
    {
      url: siteUrl,
      changeFrequency: "weekly",
      priority: 1
    },
    {
      url: `${siteUrl}/tools/180-day-homeschool-calendar`,
      changeFrequency: "monthly",
      priority: 0.9
    },
    {
      url: `${siteUrl}/privacy`,
      changeFrequency: "yearly",
      priority: 0.2
    },
    {
      url: `${siteUrl}/terms`,
      changeFrequency: "yearly",
      priority: 0.2
    }
  ];
}
