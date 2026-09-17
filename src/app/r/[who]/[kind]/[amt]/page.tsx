import type { Metadata } from "next";
import { Footer } from "@/components/Footer";
import { SiteNav } from "@/components/SiteNav";
import { VerdictScreen } from "@/components/VerdictScreen";
import {
  computeVerdict,
  inr,
  istDateKey,
  liveStatus,
  parseAmount,
  parseKind,
  parseWho,
} from "@/lib/rules";
import { cardPath } from "@/lib/share";
import { SITE_URL } from "@/lib/site";

type Params = Promise<{ who: string; kind: string; amt: string }>;

function read(params: { who: string; kind: string; amt: string }) {
  const who = parseWho(params.who);
  const kind = parseKind(params.kind, who);
  // Whole rupees only: the card path rounds, so anything finer would make
  // the preview disagree with the page it previews.
  const amt = Math.round(parseAmount(params.amt));
  return { who, kind, amt, verdict: computeVerdict(who, kind, amt) };
}

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { who, kind, amt, verdict } = read(await params);

  const title = `${inr(amt)} on UPI. You pay ${inr(0)}.`;
  const description = `${verdict.headline} ${verdict.explainer}`;
  // Date-stamped so a proxy cannot unfurl a stale countdown. See istDateKey.
  const image = cardPath(who, kind, amt) + `&d=${istDateKey()}`;

  return {
    title,
    description,
    alternates: { canonical: `/r/${who}/${kind}/${Math.round(amt)}` },
    openGraph: {
      type: "article",
      siteName: "UPI Tax?",
      title,
      description,
      images: [{ url: image, width: 1200, height: 630, alt: verdict.headline }],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [image],
    },
  };
}

/**
 * Cached read of the shared counter. Decoration only, so any failure here
 * simply hides the line rather than breaking the verdict.
 */
async function readCount(): Promise<number | null> {
  try {
    const res = await fetch(`${SITE_URL}/api/count`, { next: { revalidate: 10 } });
    if (!res.ok || res.status === 204) return null;
    const data = await res.json();
    return typeof data?.total === "number" ? data.total : null;
  } catch {
    return null;
  }
}

export default async function ResultPage({ params }: { params: Params }) {
  const { verdict } = read(await params);
  const status = liveStatus();
  const initialCount = await readCount();

  return (
    <main className="min-h-[100dvh]">
      <SiteNav />
      <VerdictScreen
        verdict={verdict}
        statusLabel={status.label}
        isLive={status.live}
        initialCount={initialCount}
      />
      <Footer />
    </main>
  );
}
