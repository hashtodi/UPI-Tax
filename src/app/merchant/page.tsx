import type { Metadata } from "next";
import { Footer } from "@/components/Footer";
import { MerchantCalc } from "@/components/MerchantCalc";
import { SiteNav } from "@/components/SiteNav";
import { StatusPill } from "@/components/StatusPill";
import { inr, istDateKey, merchantOutlook, parseAmount, pctShare, type Kind } from "@/lib/rules";
import { merchantCardPath } from "@/lib/share";

type Search = Promise<Record<string, string | string[] | undefined>>;

const SECTORS = ["big", "fuel", "capital", "small"] as const;

/** Reads a shared merchant link back into the numbers it was built from. */
function read(params: Record<string, string | string[] | undefined>) {
  const one = (k: string) => (Array.isArray(params[k]) ? params[k][0] : params[k]);
  const inflow = parseAmount(one("inflow"), 999_999_999) || 250_000;
  const bill = parseAmount(one("bill"), 999_999_999) || 3_500;
  const rawShare = Number(one("share"));
  const share = Number.isFinite(rawShare) ? Math.min(100, Math.max(0, rawShare)) : 40;
  const raw = one("sector");
  const sector = (SECTORS as readonly string[]).includes(raw ?? "")
    ? (raw as Exclude<Kind, "na">)
    : "big";
  return { inflow, bill, share, sector };
}

export async function generateMetadata({
  searchParams,
}: {
  searchParams: Search;
}): Promise<Metadata> {
  const p = read(await searchParams);
  const o = merchantOutlook(p.inflow, p.bill, p.sector, p.share / 100);
  const total = Math.round(o.monthlyMdr) + Math.round(o.monthlyGst);

  // Branch on the classification, not on whether the fee is zero: a large
  // merchant with only small bills also pays nothing, and is not exempt.
  const title =
    total > 0
      ? `A shop taking ${inr(p.inflow)} a month would pay ${inr(total)}`
      : `A shop taking ${inr(p.inflow)} a month pays nothing`;
  // `would pay` above is load-bearing: it is conditional on the 3-month rule.
  const description =
    total > 0
      ? `${o.statusPill}. Covering it means prices up ${pctShare(o.priceRiseShare)}. Work out your own.`
      : o.status === "P2PM"
        ? "Small merchants are exempt from the new UPI fee. Work out your own."
        : "Over the line, but nothing arrives through bills above \u20B92,000. Work out your own.";
  // Date-stamped so a proxy cannot unfurl a stale countdown. See istDateKey.
  const image = merchantCardPath(p) + `&d=${istDateKey()}`;

  return {
    title,
    description,
    alternates: { canonical: "/merchant" },
    openGraph: {
      type: "article",
      siteName: "UPI Tax?",
      title,
      description,
      images: [{ url: image, width: 1200, height: 630, alt: title }],
    },
    twitter: { card: "summary_large_image", title, description, images: [image] },
  };
}

export default async function MerchantPage({ searchParams }: { searchParams: Search }) {
  const p = read(await searchParams);

  return (
    <main className="min-h-[100dvh]">
      <SiteNav />

      <section className="mx-auto w-full max-w-[1000px] px-4 pb-16 pt-7 sm:pt-9">
        <h1 className="max-w-[24ch] text-[26px] font-semibold leading-[1.12] tracking-tight sm:text-[32px]">
          Own a shop? (and what your customers end up paying)
        </h1>
        <p className="mt-2.5 max-w-[60ch] text-[14.5px] leading-relaxed text-ink-2">
          The fee lands on you, not on them. This works out what it costs you a month, and how much
          of it ends up in your prices.
        </p>

        <div className="mt-4">
          <StatusPill />
        </div>

        <div className="mt-6">
          <MerchantCalc
            initialInflow={String(p.inflow)}
            initialBill={String(p.bill)}
            initialShare={p.share}
            initialSector={p.sector}
          />
        </div>
      </section>

      <Footer />
    </main>
  );
}
