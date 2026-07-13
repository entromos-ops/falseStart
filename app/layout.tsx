import type { Metadata, Viewport } from "next";
import { Analytics } from "@vercel/analytics/next";
import "./globals.css";

const metadataBase = new URL(
  process.env.NEXT_PUBLIC_SITE_URL ?? "https://false-start.vercel.app"
);

export const metadata: Metadata = {
  metadataBase,
  title: "Learn Practical Spanish in a Cozy RPG | Luma Village",
  description:
    "Buy breakfast in Spanish in a 60-second playable conversation, then farm, trade, cook, and explore a cozy language-learning RPG.",
  keywords: [
    "learn practical Spanish",
    "Spanish learning game",
    "cozy language RPG",
    "Spanish immersion game",
    "learn Spanish through gameplay"
  ],
  manifest: "/manifest.webmanifest",
  applicationName: "Luma Village",
  category: "education",
  alternates: {
    canonical: "/"
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-image-preview": "large",
      "max-snippet": -1,
      "max-video-preview": -1
    }
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Luma Village"
  },
  openGraph: {
    title: "Learn Practical Spanish in a Cozy RPG | Luma Village",
    description:
      "Handle a useful Spanish market conversation, then farm, trade, cook, and explore while the language becomes part of the world.",
    type: "website",
    url: "/",
    images: [
      {
        url: "/og.png",
        width: 1536,
        height: 1024,
        alt: "Luma Village open-world language RPG"
      }
    ]
  },
  twitter: {
    card: "summary_large_image",
    title: "Learn Practical Spanish in a Cozy RPG | Luma Village",
    description:
      "Buy breakfast in Spanish, then learn more by living it in a cozy RPG.",
    images: ["/og.png"]
  }
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#d8b96e" },
    { media: "(prefers-color-scheme: dark)", color: "#14281f" }
  ]
};

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>
        {children}
        <Analytics />
      </body>
    </html>
  );
}
