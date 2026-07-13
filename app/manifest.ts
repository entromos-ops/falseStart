import type { MetadataRoute } from "next";

export const dynamic = "force-static";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Luma Village",
    short_name: "Luma",
    description: "Learn the language. Live the world.",
    start_url: "/",
    display: "standalone",
    orientation: "any",
    background_color: "#d8b96e",
    theme_color: "#14281f",
    categories: ["games", "education"],
    icons: [
      { src: "/icon", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icon", sizes: "512x512", type: "image/png", purpose: "maskable" }
    ]
  };
}
