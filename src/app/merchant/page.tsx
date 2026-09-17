import type { Metadata } from "next";
import { Footer } from "@/components/Footer";
import { MerchantCalc } from "@/components/MerchantCalc";
import { SiteNav } from "@/components/SiteNav";

export const metadata: Metadata = {
  title: "Own a shop? Here is your side of the UPI MDR",
  description:
    "MDR lands on the merchant, not the customer. Work out whether you are P2PM or P2M, what you would pay a month, and how that compares to cards.",
  alternates: { canonical: "/merchant" },
  openGraph: {
    type: "article",
    siteName: "UPI Tax?",
    title: "Own a shop? Here is your side of the UPI MDR",
    description:
      "Whether you are P2PM or P2M, what you would pay a month, and how that compares to cards.",
    images: [{ url: "/api/card?who=home&kind=na&amt=0", width: 1200, height: 630 }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Own a shop? Here is your side of the UPI MDR",
    description: "What a merchant actually pays under the new UPI MDR, and how it compares to cards.",
    images: ["/api/card?who=home&kind=na&amt=0"],
  },
};

export default function MerchantPage() {
  return (
    <main className="min-h-[100dvh]">
      <SiteNav />

      <section className="mx-auto w-full max-w-[1000px] px-4 pb-16 pt-7 sm:pt-9">
        {/* Kept deliberately short: the calculator is the page, not the preamble. */}
        <h1 className="max-w-[22ch] text-[26px] font-semibold leading-[1.12] tracking-tight sm:text-[32px]">
          Own a shop? Here is your side of it.
        </h1>
        <p className="mt-2.5 max-w-[60ch] text-[14.5px] leading-relaxed text-ink-2">
          MDR lands on the merchant, so this is the only calculation that changes a number for
          anyone.
        </p>

        <div className="mt-6">
          <MerchantCalc />
        </div>
      </section>

      <Footer />
    </main>
  );
}
