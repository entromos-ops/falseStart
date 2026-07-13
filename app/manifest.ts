import type { MetadataRoute } from "next";

export const dynamic = "force-static";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Luma Village",
    short_name: "Luma",
    description: "Build a village. Learn its language.",
    start_url: "/",
    display: "standalone",
    orientation: "portrait-primary",
    background_color: "#e9d7aa",
    theme_color: "#203d32",
    categories: ["games", "education"]
  };
}
