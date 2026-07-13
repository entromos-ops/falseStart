import type { Metadata, Viewport } from "next";
import "./globals.css";

const metadataBase = new URL(
  process.env.NEXT_PUBLIC_SITE_URL ?? "https://false-start.vercel.app"
);

export const metadata: Metadata = {
  metadataBase,
  title: "Luma Village — Learn the language. Live the world.",
  description:
    "A cozy open-world RPG where you farm, gather, trade, and learn useful Spanish by living it.",
  manifest: "/manifest.webmanifest",
  applicationName: "Luma Village",
  alternates: {
    canonical: "/"
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Luma Village"
  },
  openGraph: {
    title: "Luma Village",
    description: "Learn the language. Live the world.",
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
    title: "Luma Village",
    description: "Learn the language. Live the world.",
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
      <body>{children}</body>
    </html>
  );
}
