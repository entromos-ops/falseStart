import type { Metadata, Viewport } from "next";
import { Analytics } from "@vercel/analytics/next";
import "./globals.css";

const metadataBase = new URL(
  process.env.NEXT_PUBLIC_SITE_URL ?? "https://false-start.vercel.app"
);

export const metadata: Metadata = {
  metadataBase,
  title: "Hearthfolio | Private Homeschool Records in 20 Seconds a Day",
  description:
    "Log homeschool learning in about 20 seconds and turn ordinary days into a clear learning record and printable portfolio. No account required.",
  keywords: [
    "homeschool record keeping",
    "homeschool attendance tracker",
    "homeschool learning log",
    "homeschool portfolio",
    "homeschool report generator"
  ],
  manifest: "/manifest.webmanifest",
  applicationName: "Hearthfolio",
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
    title: "Hearthfolio"
  },
  openGraph: {
    title: "Keep the year. Lose the paperwork. | Hearthfolio",
    description:
      "A private homeschool learning log that turns 20-second daily notes into a clear year-end record.",
    type: "website",
    url: "/",
    images: [
      {
        url: "/og.png",
        width: 1536,
        height: 1024,
        alt: "Hearthfolio private homeschool learning record"
      }
    ]
  },
  twitter: {
    card: "summary_large_image",
    title: "Keep the year. Lose the paperwork. | Hearthfolio",
    description:
      "Private homeschool records in about 20 seconds a day.",
    images: ["/og.png"]
  }
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f5f0e7" },
    { media: "(prefers-color-scheme: dark)", color: "#234334" }
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
