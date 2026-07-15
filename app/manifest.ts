import type { MetadataRoute } from "next";

export const dynamic = "force-static";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Pet Claim Desk - Private Claim Organizer",
    short_name: "Claim Desk",
    description: "Keep pet insurance claims, records, deadlines, and reimbursements together.",
    start_url: "/",
    display: "standalone",
    orientation: "any",
    background_color: "#f6f3ed",
    theme_color: "#26756b",
    categories: ["finance", "medical", "productivity"],
    icons: [
      { src: "/icon", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icon", sizes: "512x512", type: "image/png", purpose: "maskable" }
    ]
  };
}
