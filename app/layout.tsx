import type { Metadata, Viewport } from "next";
import "./globals.css";

const metadataBase = new URL(
  process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000"
);

export const metadata: Metadata = {
  metadataBase,
  title: "Luma Village — Build a world in Spanish",
  description:
    "A cozy village-building game where useful Spanish appears as the world becomes familiar.",
  manifest: "/manifest.webmanifest",
  applicationName: "Luma Village",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Luma Village"
  },
  openGraph: {
    title: "Luma Village",
    description: "Build a village. Learn its language.",
    type: "website",
    images: ["/og.png"]
  },
  twitter: {
    card: "summary_large_image",
    title: "Luma Village",
    description: "Build a village. Learn its language.",
    images: ["/og.png"]
  }
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#e9d7aa" },
    { media: "(prefers-color-scheme: dark)", color: "#203d32" }
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
