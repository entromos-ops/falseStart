import type { Metadata, Viewport } from "next";
import "./globals.css";

const metadataBase = new URL(
  process.env.NEXT_PUBLIC_SITE_URL ?? "https://homeschool-start.vercel.app"
);

export const metadata: Metadata = {
  metadataBase,
  title: {
    default: "SpotGrid | Host-read ad inventory for podcast networks",
    template: "%s | SpotGrid"
  },
  description:
    "A lightweight inventory board for podcast networks selling baked-in host-read sponsorships across shows and episodes.",
  keywords: [
    "podcast ad inventory",
    "host-read podcast ads",
    "podcast sponsorship tracker",
    "baked-in podcast ads",
    "podcast network sales"
  ],
  manifest: "/manifest.webmanifest",
  applicationName: "SpotGrid",
  category: "business",
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
    title: "SpotGrid"
  },
  openGraph: {
    title: "SpotGrid | Host-read ad inventory for podcast networks",
    description:
      "Track sold, held, and open host-read spots without changing podcast hosts or buying an enterprise ad server.",
    type: "website",
    url: "/"
  },
  twitter: {
    card: "summary_large_image",
    title: "SpotGrid | Host-read ad inventory for podcast networks",
    description:
      "A narrow inventory board for baked-in podcast sponsorships."
  }
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f4f5f2" },
    { media: "(prefers-color-scheme: dark)", color: "#202421" }
  ]
};

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
