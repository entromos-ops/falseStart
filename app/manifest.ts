import type { MetadataRoute } from "next";

export const dynamic = "force-static";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Hearthfolio — Private Homeschool Records",
    short_name: "Hearthfolio",
    description: "Homeschool records in about 20 seconds a day.",
    start_url: "/",
    display: "standalone",
    orientation: "any",
    background_color: "#f5f0e7",
    theme_color: "#315a45",
    categories: ["education", "productivity"],
    icons: [
      { src: "/icon", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icon", sizes: "512x512", type: "image/png", purpose: "maskable" }
    ]
  };
}
