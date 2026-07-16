import type { MetadataRoute } from "next";

export const dynamic = "force-static";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "SpotGrid - Podcast Ad Inventory",
    short_name: "SpotGrid",
    description: "Track host-read podcast ad inventory across shows, episodes, sponsors, and delivery status.",
    start_url: "/",
    display: "standalone",
    orientation: "any",
    background_color: "#f4f5f2",
    theme_color: "#202421",
    categories: ["business", "productivity"],
    icons: [
      { src: "/icon", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icon", sizes: "512x512", type: "image/png", purpose: "maskable" }
    ]
  };
}
