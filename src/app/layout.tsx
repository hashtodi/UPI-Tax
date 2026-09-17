import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Analytics } from "@vercel/analytics/react";
import { SITE_URL } from "@/lib/site";
import "./globals.css";

const geist = Geist({ subsets: ["latin"], variable: "--font-geist", display: "swap" });
const geistMono = Geist_Mono({
  subsets: ["latin"],
  variable: "--font-geist-mono",
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: "UPI Tax? Find out in 3 taps",
  description:
    "Will you pay the UPI tax above ₹2,000? No. Here is who actually pays, how much, and why. Based on NPCI's MDR FAQ.",
  openGraph: {
    type: "website",
    siteName: "UPI Tax?",
    title: "Will you pay UPI tax above ₹2,000? No.",
    description:
      "0.4% MDR, capped at ₹300, charged to large merchants only from 15 Oct 2026. You pay ₹0. Check any payment in 3 taps.",
    url: SITE_URL,
    images: [{ url: "/api/card?who=home&kind=na&amt=0", width: 1200, height: 630 }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Will you pay UPI tax above ₹2,000? No.",
    description:
      "0.4% MDR, capped at ₹300, charged to large merchants only from 15 Oct 2026. You pay ₹0.",
    images: ["/api/card?who=home&kind=na&amt=0"],
  },
};

export const viewport: Viewport = {
  themeColor: "#000000",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${geist.variable} ${geistMono.variable}`}>
      <body>
        {children}
        <Analytics />
      </body>
    </html>
  );
}
