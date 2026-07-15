import type { Metadata, Viewport } from "next";
import "./globals.css";

const metadataBase = new URL(
  process.env.NEXT_PUBLIC_SITE_URL ?? "https://homeschool-start.vercel.app"
);

export const metadata: Metadata = {
  metadataBase,
  title: {
    default: "Pet Claim Desk | Keep every claim together",
    template: "%s | Pet Claim Desk"
  },
  description:
    "A private household workspace for pet insurance claims, veterinary records, submission evidence, deadlines, and reimbursements.",
  keywords: [
    "pet insurance claim tracker",
    "pet insurance documents",
    "veterinary invoice organizer",
    "pet insurance reimbursement",
    "pet medical records organizer"
  ],
  manifest: "/manifest.webmanifest",
  applicationName: "Pet Claim Desk",
  category: "productivity",
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
    title: "Claim Desk"
  },
  openGraph: {
    title: "Keep every pet insurance claim together | Pet Claim Desk",
    description:
      "Organize visits, records, claim packets, deadlines, and reimbursements in one private household workspace.",
    type: "website",
    url: "/",
    images: [{ url: "/og.png", width: 1536, height: 1024, alt: "Pet Claim Desk — Keep every claim together." }]
  },
  twitter: {
    card: "summary_large_image",
    title: "Keep every pet insurance claim together | Pet Claim Desk",
    description:
      "A private household workspace for pet insurance claims and supporting records.",
    images: ["/og.png"]
  }
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f6f3ed" },
    { media: "(prefers-color-scheme: dark)", color: "#18332f" }
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
