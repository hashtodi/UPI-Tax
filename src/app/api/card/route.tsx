import { readFile } from "node:fs/promises";
import path from "node:path";
import { ImageResponse } from "next/og";
import {
  computeVerdict,
  inr,
  liveStatus,
  MDR_THRESHOLD,
  parseAmount,
  parseKind,
  parseWho,
  type Verdict,
} from "@/lib/rules";
import { RUPEE_PATH } from "@/lib/mark";
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

function Tick({ size }: { size: number }) {
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
          d="M10 25.5 L20 35 L38 14"
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
          <Tick size={132} />

          <div style={{ display: "flex", fontSize: 30, color: INK_3, fontWeight: 500, marginTop: 30 }}>
            Charges paid by you
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
            {inr(0)}
          </div>

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
            Who actually pays
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
            {verdict.receipt.amount} to {verdict.shortCategory}
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
    : "Charges paid by you";
  const figure = isHome ? "No." : inr(0);
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
    : [
        ["Amount", verdict.receipt.amount],
        ["Category", verdict.receipt.category],
        ["Merchant pays", verdict.receipt.merchantPays],
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

        <Tick size={104} />
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
        // The image is a pure function of the query string, so it can be
        // cached hard. Nothing is stored; it renders once per variant.
        "Cache-Control": "public, immutable, no-transform, max-age=31536000",
      },
    },
  );
}
