import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "False Start",
    short_name: "False Start",
    description: "A daily reaction challenge where speed matters and flinching loses.",
    start_url: "/",
    display: "standalone",
    background_color: "#05070b",
    theme_color: "#27def2",
    icons: [
      {
        src: "/icon.svg",
        sizes: "any",
        type: "image/svg+xml"
      }
    ]
  };
}
