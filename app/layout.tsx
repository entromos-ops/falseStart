import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "PartPatch | Better replacements for broken plastic parts",
  description: "Custom 3D-printed replacement parts for the little pieces nobody sells separately.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body>{children}</body></html>;
}
