import { readFile } from "node:fs/promises";
import path from "node:path";
import { ImageResponse } from "next/og";
import {
  computeVerdict,
  merchantOutlook,
  pctShare,
  inr,
  liveStatus,
  MDR_THRESHOLD,
  parseAmount,
  parseKind,
  parseWho,
  P2PM_MONTHLY_LIMIT,
  RECLASSIFY_MONTHS,
  type Verdict,
} from "@/lib/rules";
import { RUPEE_PATH } from "@/lib/mark";
import { RETURN_PATH, TICK_PATH } from "@/components/Tick";
import { X_HANDLE } from "@/lib/site";

export const runtime = "nodejs";
export const contentType = "image/png";

/** Link preview that X and LinkedIn unfurl. */
const WIDE = { width: 1200, height: 630 };
/** Feed and status image people download and post. 4:5, the tallest ratio X keeps uncropped. */
const TALL = { width: 1080, height: 1350 };

const BG = "#000000";
const SURFACE = "#0b0c0e";
const SURFACE_2 = "#131418";
const LINE = "#232429";
const LINE_SOFT = "#1a1b1f";
const INK = "#f2f2f3";
const INK_2 = "#a2a2a9";
const INK_3 = "#6a6a72";
const ACCENT = "#3ecf8e";

type LoadedFont = { name: string; data: Buffer; weight: 400 | 600 | 800; style: "normal" };
let fontCache: LoadedFont[] | null = null;

async function fonts(): Promise<LoadedFont[]> {
  if (fontCache) return fontCache;
  const dir = path.join(process.cwd(), "src/fonts");
  const [regular, semibold, extrabold] = await Promise.all([
    readFile(path.join(dir, "Geist-Regular.ttf")),
    readFile(path.join(dir, "Geist-SemiBold.ttf")),
    readFile(path.join(dir, "Geist-ExtraBold.ttf")),
  ]);
  fontCache = [
    { name: "Geist", data: regular, weight: 400, style: "normal" },
    { name: "Geist", data: semibold, weight: 600, style: "normal" },
    { name: "Geist", data: extrabold, weight: 800, style: "normal" },
  ];
  return fontCache;
}

function VerdictMark({ size, charged }: { size: number; charged?: boolean }) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        width: size,
        height: size,
        borderRadius: 999,
        background: "rgba(62,207,142,0.12)",
        border: `${Math.round(size / 52)}px solid rgba(62,207,142,0.38)`,
      }}
    >
      <svg width={size / 2} height={size / 2} viewBox="0 0 48 48" fill="none">
        <path
          d={charged ? RETURN_PATH : TICK_PATH}
          stroke={ACCENT}
          strokeWidth="5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </div>
  );
}

function Wordmark({ scale = 1 }: { scale?: number }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 12 * scale }}>
      <svg width={34 * scale} height={34 * scale} viewBox="0 0 100 100">
        <rect width="100" height="100" rx="26" fill={ACCENT} />
        <path d={RUPEE_PATH} fill="#000000" />
      </svg>
      <div
        style={{
          display: "flex",
          fontSize: 23 * scale,
          fontWeight: 600,
          letterSpacing: -0.4 * scale,
          color: INK,
        }}
      >
        UPI Tax?
      </div>
    </div>
  );
}

function Pill({ text, scale = 1 }: { text: string; scale?: number }) {
  return (
    <div
      style={{
        display: "flex",
        fontSize: 17 * scale,
        color: INK_2,
        border: `1px solid ${LINE}`,
        background: SURFACE,
        borderRadius: 999,
        padding: `${9 * scale}px ${18 * scale}px`,
      }}
    >
      {text}
    </div>
  );
}

/**
 * The tall card is a direct translation of the verdict card on screen, so what
 * someone downloads is what they were just looking at.
 */
function TallCard({ verdict, status }: { verdict: Verdict; status: string }) {
  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        background: BG,
        padding: 56,
        fontFamily: "Geist",
        color: INK,
      }}
    >
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <Wordmark scale={1.35} />
        <Pill text={status} scale={1.25} />
      </div>

      <div
        style={{
          display: "flex",
          flexDirection: "column",
          flex: 1,
          marginTop: 32,
          borderRadius: 44,
          border: `2px solid ${LINE}`,
          background: SURFACE,
          padding: 52,
        }}
      >
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", flex: 1 }}>
          <VerdictMark size={132} charged={verdict.passThroughWithGst !== null} />

          <div style={{ display: "flex", fontSize: 30, color: INK_3, fontWeight: 500, marginTop: 30 }}>
            {verdict.heroLabel}
          </div>
          <div
            style={{
              display: "flex",
              fontSize: 188,
              fontWeight: 800,
              letterSpacing: -8,
              lineHeight: 1.02,
              marginTop: 6,
            }}
          >
            {inr(verdict.passThroughWithGst ?? 0)}
          </div>
          {verdict.passThroughWithGst !== null ? (
            <div style={{ display: "flex", fontSize: 27, color: INK_3, marginTop: 10 }}>
              You pay {inr(0)}
            </div>
          ) : null}

          <div
            style={{
              display: "flex",
              textAlign: "center",
              fontSize: 54,
              fontWeight: 600,
              letterSpacing: -1.6,
              lineHeight: 1.2,
              marginTop: 34,
            }}
          >
            {verdict.headline}
          </div>
          <div
            style={{
              display: "flex",
              textAlign: "center",
              fontSize: 30,
              color: INK_2,
              lineHeight: 1.45,
              marginTop: 22,
            }}
          >
            {verdict.explainer}
          </div>
        </div>

        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 8,
            marginTop: 36,
            borderRadius: 28,
            border: `2px solid ${LINE_SOFT}`,
            background: SURFACE_2,
            padding: "26px 30px",
          }}
        >
          <div style={{ display: "flex", fontSize: 25, color: INK_3, fontWeight: 500 }}>
            {verdict.passThroughWithGst !== null ? "How that adds up" : "Who actually pays"}
          </div>
          <div style={{ display: "flex", fontSize: 34, fontWeight: 600, color: INK }}>
            {verdict.payerLine}
          </div>
        </div>
      </div>

      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginTop: 30,
          gap: 28,
        }}
      >
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          <div style={{ display: "flex", fontSize: 22, color: INK_3 }}>
            {`${verdict.receipt.amount} to ${verdict.shortCategory}`}
          </div>
          <div style={{ display: "flex", fontSize: 28, fontWeight: 600, color: ACCENT }}>
            upitax.vercel.app
          </div>
        </div>
        <div style={{ display: "flex", fontSize: 24, color: INK_3 }}>{X_HANDLE}</div>
      </div>
    </div>
  );
}

function WideCard({
  verdict,
  status,
  isHome,
}: {
  verdict: Verdict;
  status: string;
  isHome: boolean;
}) {
  const label = isHome
    ? `Will you pay UPI tax above ${inr(MDR_THRESHOLD)}?`
    : verdict.heroLabel;
  const figure = isHome ? "No." : inr(verdict.passThroughWithGst ?? 0);
  const headline = isHome ? "" : verdict.headline;
  const sub = isHome
    ? `0.4% MDR, capped at ${inr(300)}, charged to large merchants only, from 15 October 2026. You pay ${inr(0)}.`
    : verdict.explainer;
  const facts: [string, string][] = isHome
    ? [
        ["You pay", inr(0)],
        ["Large merchant pays", `0.4%, capped at ${inr(300)}`],
        ["Live from", "15 Oct 2026"],
      ]
    : ([
        ["Amount", verdict.receipt.amount],
        ["Charged to you", inr(0)],
        /*
         * The merchant's cost, and the amount at stake if it reaches the tag.
         * Capital markets gets the rate instead of a flat "nobody pays": the
         * FAQ states no floor there, so a zero would be our claim, not NPCI's.
         */
        verdict.passThroughWithGst !== null
          ? [
              verdict.kind === "capital"
                ? `Their fee at ${verdict.receipt.mdrRate}`
                : "Their fee, with expected GST",
              inr(verdict.passThroughWithGst),
            ]
          : verdict.kind === "capital"
            ? ["Their rate", verdict.receipt.mdrRate]
            : ["Charged to anyone", inr(0)],
      ] as [string, string][]);

  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        background: BG,
        padding: 64,
        fontFamily: "Geist",
        color: INK,
      }}
    >
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <Wordmark />
        <Pill text={status} />
      </div>

      <div
        style={{
          display: "flex",
          flex: 1,
          alignItems: "center",
          justifyContent: "space-between",
          gap: 48,
        }}
      >
        <div style={{ display: "flex", flexDirection: "column", maxWidth: 780 }}>
          <div
            style={{
              display: "flex",
              fontSize: isHome ? 40 : 21,
              fontWeight: isHome ? 600 : 500,
              letterSpacing: isHome ? -1.1 : 0,
              lineHeight: 1.22,
              color: isHome ? INK : INK_3,
            }}
          >
            {label}
          </div>
          <div
            style={{
              display: "flex",
              fontSize: 142,
              fontWeight: 800,
              letterSpacing: -6,
              lineHeight: 1.05,
              marginTop: isHome ? 10 : 2,
              color: isHome ? ACCENT : INK,
            }}
          >
            {figure}
          </div>
          {headline ? (
            <div
              style={{
                display: "flex",
                fontSize: 38,
                fontWeight: 600,
                letterSpacing: -1.1,
                lineHeight: 1.22,
                marginTop: 14,
              }}
            >
              {headline}
            </div>
          ) : null}
          <div style={{ display: "flex", fontSize: 22, color: INK_2, lineHeight: 1.45, marginTop: 14 }}>
            {sub}
          </div>
        </div>

        <VerdictMark size={104} charged={!isHome && verdict.passThroughWithGst !== null} />
      </div>

      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          borderTop: `1px solid ${LINE}`,
          paddingTop: 26,
          gap: 32,
        }}
      >
        {facts.map(([label2, value]) => (
          <div key={label2} style={{ display: "flex", flexDirection: "column", gap: 5 }}>
            <div style={{ display: "flex", fontSize: 16, color: INK_3 }}>{label2}</div>
            <div style={{ display: "flex", fontSize: 22, fontWeight: 600, color: INK }}>{value}</div>
          </div>
        ))}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 5,
            marginLeft: "auto",
            alignItems: "flex-end",
          }}
        >
          <div style={{ display: "flex", fontSize: 16, color: INK_3 }}>{X_HANDLE}</div>
          <div style={{ display: "flex", fontSize: 22, fontWeight: 600, color: ACCENT }}>
            upitax.vercel.app
          </div>
        </div>
      </div>
    </div>
  );
}

type MerchantCardProps = {
  inflow: string;
  total: string;
  status: string;
  /** "Your shop would pay", or the conditional version once P2M is pending. */
  heroLabel: string;
  statusLabel: string;
  priceRise: string;
  perBill: string | null;
  sharePct: string;
  status2: string;
  /** "a month, with expected GST" only holds when there is a fee to tax. */
  unit: string;
  /** The upper panel. Its label changes with the branch, so it travels with it. */
  breakdownLabel: string;
  breakdown: string | null;
};

/**
 * The merchant equivalent of the verdict card. Two layouts for the same
 * content: the tall one stacks, the wide one cannot, because 630px of height
 * will not hold a stacked hero plus a panel.
 */
function MerchantCardTall(p: MerchantCardProps) {
  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        background: BG,
        padding: 56,
        fontFamily: "Geist",
        color: INK,
      }}
    >
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <Wordmark scale={1.35} />
        <Pill text={p.status} scale={1.25} />
      </div>

      <div
        style={{
          display: "flex",
          flexDirection: "column",
          flex: 1,
          marginTop: 32,
          borderRadius: 44,
          border: `2px solid ${LINE}`,
          background: SURFACE,
          padding: 52,
        }}
      >
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            flex: 1,
          }}
        >
          <div style={{ display: "flex", fontSize: 30, color: INK_3, fontWeight: 500 }}>
            {p.heroLabel}
          </div>
          <div
            style={{
              display: "flex",
              // Satori does not reflow, so a long total has to be sized down
              // rather than trusted to wrap. 10 glyphs already fills the panel.
              fontSize: p.total.length >= 11 ? 132 : p.total.length >= 10 ? 152 : 168,
              fontWeight: 800,
              letterSpacing: -7,
              lineHeight: 1.02,
              marginTop: 6,
            }}
          >
            {p.total}
          </div>
          <div style={{ display: "flex", fontSize: 27, color: INK_3, marginTop: 8 }}>
            {p.unit}
          </div>
          <div
            style={{
              display: "flex",
              textAlign: "center",
              fontSize: 40,
              fontWeight: 600,
              letterSpacing: -1.2,
              lineHeight: 1.22,
              marginTop: 34,
            }}
          >
            {p.statusLabel}
          </div>
          <div
            style={{
              display: "flex",
              textAlign: "center",
              fontSize: 28,
              color: INK_2,
              lineHeight: 1.45,
              marginTop: 18,
            }}
          >
            {p.inflow} a month, {p.sharePct} of it through bills above {inr(MDR_THRESHOLD)}.
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 14, marginTop: 30 }}>
          {p.breakdown ? (
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: 8,
                borderRadius: 28,
                border: `2px solid ${LINE_SOFT}`,
                background: SURFACE_2,
                padding: "24px 30px",
              }}
            >
              <div style={{ display: "flex", fontSize: 25, color: INK_3, fontWeight: 500 }}>
                {p.breakdownLabel}
              </div>
              <div style={{ display: "flex", fontSize: 32, fontWeight: 600, color: INK }}>
                {p.breakdown}
              </div>
            </div>
          ) : null}

          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: 8,
              borderRadius: 28,
              border: `2px solid ${LINE_SOFT}`,
              background: SURFACE_2,
              padding: "24px 30px",
            }}
          >
            <div style={{ display: "flex", fontSize: 25, color: INK_3, fontWeight: 500 }}>
              {p.status2}
            </div>
            <div style={{ display: "flex", fontSize: 32, fontWeight: 600, color: INK }}>
              {p.perBill ? `${p.priceRise}, or about ${p.perBill} on one of those bills` : p.priceRise}
            </div>
          </div>
        </div>
      </div>

      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginTop: 30,
          gap: 28,
        }}
      >
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          <div style={{ display: "flex", fontSize: 22, color: INK_3 }}>The merchant side</div>
          <div style={{ display: "flex", fontSize: 28, fontWeight: 600, color: ACCENT }}>
            upitax.vercel.app/merchant
          </div>
        </div>
        <div style={{ display: "flex", fontSize: 24, color: INK_3 }}>{X_HANDLE}</div>
      </div>
    </div>
  );
}

function MerchantCardWide(p: MerchantCardProps) {
  const facts: [string, string][] = [
    ["Monthly UPI", p.inflow],
    ["Through bills above " + inr(MDR_THRESHOLD), p.sharePct],
    [p.status2, p.perBill ? `${p.priceRise}, ${p.perBill} a bill` : p.priceRise],
  ];
  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        background: BG,
        padding: 64,
        fontFamily: "Geist",
        color: INK,
      }}
    >
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <Wordmark />
        <Pill text={p.status} />
      </div>

      <div style={{ display: "flex", flex: 1, flexDirection: "column", justifyContent: "center" }}>
        <div style={{ display: "flex", fontSize: 21, color: INK_3, fontWeight: 500 }}>
          {p.heroLabel}
        </div>
        <div
          style={{
            display: "flex",
            fontSize: 128,
            fontWeight: 800,
            letterSpacing: -5,
            lineHeight: 1.04,
            marginTop: 2,
          }}
        >
          {p.total}
        </div>
        <div style={{ display: "flex", fontSize: 30, fontWeight: 600, marginTop: 12 }}>
          {p.unit}. {p.statusLabel}
        </div>
      </div>

      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          borderTop: `1px solid ${LINE}`,
          paddingTop: 26,
          gap: 32,
        }}
      >
        {facts.map(([label, value]) => (
          <div key={label} style={{ display: "flex", flexDirection: "column", gap: 5 }}>
            <div style={{ display: "flex", fontSize: 16, color: INK_3 }}>{label}</div>
            <div style={{ display: "flex", fontSize: 22, fontWeight: 600, color: INK }}>{value}</div>
          </div>
        ))}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 5,
            marginLeft: "auto",
            alignItems: "flex-end",
          }}
        >
          <div style={{ display: "flex", fontSize: 16, color: INK_3 }}>{X_HANDLE}</div>
          <div style={{ display: "flex", fontSize: 22, fontWeight: 600, color: ACCENT }}>
            upitax.vercel.app/merchant
          </div>
        </div>
      </div>
    </div>
  );
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const isHome = searchParams.get("who") === "home";
  const tall = searchParams.get("format") === "tall";

  const who = parseWho(searchParams.get("who") ?? undefined);
  const kind = parseKind(searchParams.get("kind") ?? undefined, who);
  const amt = parseAmount(searchParams.get("amt") ?? undefined);
  const verdict = computeVerdict(who, kind, amt);
  const status = liveStatus().label;

  const size = tall ? TALL : WIDE;

  if (searchParams.get("view") === "merchant") {
    const inflow = parseAmount(searchParams.get("inflow") ?? undefined, 999_999_999);
    const bill = parseAmount(searchParams.get("bill") ?? undefined, 999_999_999);
    const sharePct = Math.min(100, Math.max(0, Number(searchParams.get("share") ?? 40) || 0));
    const rawSector = searchParams.get("sector") ?? "big";
    const sector = (["big", "fuel", "capital", "small"].includes(rawSector) ? rawSector : "big") as
      | "big"
      | "fuel"
      | "capital"
      | "small";
    const o = merchantOutlook(inflow, bill, sector === "small" ? "big" : sector, sharePct / 100);
    const mdrShown = Math.round(o.monthlyMdr);
    const totalShown = mdrShown + Math.round(o.monthlyGst);

    /*
     * Three branches, and each one needs its own pair of panels. Left alone,
     * the exempt card said "with expected GST" over a zero and showed a single
     * panel reading "Nothing to cover", which left a hole the size of a panel.
     */
    const panel =
      totalShown > 0
        ? {
            unit: "a month, with expected GST",
            breakdownLabel: "How that adds up",
            breakdown: `${inr(mdrShown)} fee, plus ${inr(Math.round(o.monthlyGst))} expected GST`,
          }
        : o.status === "P2PM"
          ? {
              unit: "a month on UPI",
              breakdownLabel: "Where the line is",
              breakdown: `${inr(P2PM_MONTHLY_LIMIT)} a month inward`,
            }
          : {
              unit: "a month on UPI",
              breakdownLabel: `Money through bills above ${inr(MDR_THRESHOLD)}`,
              breakdown: inr(0),
            };

    const props = {
      ...panel,
      inflow: inr(inflow),
      total: inr(totalShown),
      heroLabel: o.conditional ? "Your shop would then pay" : "Your shop would pay",
      status: o.statusPill,
      statusLabel:
        o.status === "P2PM"
          ? "Small merchant. Exempt."
          : totalShown > 0
            ? `Only after ${RECLASSIFY_MONTHS} straight months over the line.`
            : `Even reclassified, nothing arrives through bills above ${inr(MDR_THRESHOLD)}.`,
      sharePct: `${sharePct}%`,
      status2:
        totalShown > 0
          ? "To cover it, prices rise"
          : o.status === "P2PM"
            ? "Your headroom"
            : "To cover it, prices rise",
      priceRise:
        totalShown > 0
          ? pctShare(o.priceRiseShare)
          : o.status === "P2PM"
            ? `${inr(o.headroom)} a month`
            : inr(0),
      perBill: totalShown > 0 && o.billsPerMonth > 0 ? inr(o.perBillRecovery) : null,
    };

    return new ImageResponse(
      tall ? <MerchantCardTall {...props} /> : <MerchantCardWide {...props} />,
      {
        ...size,
        fonts: await fonts(),
        headers: {
          "Cache-Control": "public, no-transform, max-age=10800, stale-while-revalidate=3600",
        },
      },
    );
  }

  return new ImageResponse(
    tall ? (
      <TallCard verdict={verdict} status={status} />
    ) : (
      <WideCard verdict={verdict} status={status} isHome={isHome} />
    ),
    {
      ...size,
      fonts: await fonts(),
      headers: {
        // NOT immutable: the pill carries a live countdown, so a card cached
        // for a year would still read "starts in 28 days" in November.
        "Cache-Control": "public, no-transform, max-age=10800, stale-while-revalidate=3600",
      },
    },
  );
}
