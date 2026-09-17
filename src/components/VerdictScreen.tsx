"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { track } from "@vercel/analytics";
import {
  ArrowClockwiseIcon,
  CheckIcon,
  DownloadSimpleIcon,
  LinkSimpleIcon,
  ShareNetworkIcon,
  XLogoIcon,
} from "@phosphor-icons/react/dist/ssr";
import { VerdictMark } from "@/components/Tick";
import { inr, type Verdict } from "@/lib/rules";
import { cardPath, resultUrl, shareText, xIntent } from "@/lib/share";

type Platform = "download" | "native" | "x" | "copy";

export function VerdictScreen({
  verdict,
  statusLabel,
  isLive,
}: {
  verdict: Verdict;
  statusLabel: string;
  isLive: boolean;
}) {
  const [copied, setCopied] = useState(false);
  const [busy, setBusy] = useState<Platform | null>(null);
  const tracked = useRef(false);

  const url = resultUrl(verdict.who, verdict.kind, verdict.amt);
  const card = cardPath(verdict.who, verdict.kind, verdict.amt, "tall");
  const text = shareText(verdict);

  useEffect(() => {
    if (tracked.current) return;
    tracked.current = true;

    track("verdict", { who: verdict.who, kind: verdict.kind });
  }, [verdict.who, verdict.kind]);

  async function fetchCard(): Promise<Blob | null> {
    try {
      const res = await fetch(card);
      return res.ok ? await res.blob() : null;
    } catch {
      return null;
    }
  }

  async function onDownload() {
    setBusy("download");
    track("share", { platform: "download", who: verdict.who });
    const blob = await fetchCard();
    if (blob) {
      const href = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = href;
      a.download = `upi-tax-${verdict.kind}-${verdict.amt}.png`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(href);
    }
    setBusy(null);
  }

  async function onShare() {
    setBusy("native");
    track("share", { platform: "native", who: verdict.who });
    const blob = await fetchCard();
    const file = blob
      ? new File([blob], `upi-tax-${verdict.amt}.png`, { type: "image/png" })
      : null;

    try {
      // No `title`: passing both title and text makes some share sheets treat
      // them as two separate items instead of one message.
      if (file && navigator.canShare?.({ files: [file] })) {
        await navigator.share({ files: [file], text });
      } else if (navigator.share) {
        await navigator.share({ text });
      } else {
        await navigator.clipboard.writeText(`${text}`);
        setCopied(true);
        setTimeout(() => setCopied(false), 1800);
      }
    } catch {
      // A cancelled share is not an error.
    }
    setBusy(null);
  }

  function onX() {
    track("share", { platform: "x", who: verdict.who });
    window.open(xIntent(text), "_blank", "noopener,noreferrer");
  }

  async function onCopy() {
    track("share", { platform: "copy", who: verdict.who });
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      // Clipboard blocked. The URL is in the address bar anyway.
    }
  }

  return (
    <div className="mx-auto w-full max-w-[560px] px-4 pb-16 pt-3 [@media(min-height:680px)]:pt-4 sm:pt-9">
      {/*
        The parody: a UPI success screen where the amount slot holds zero.
        The share bar lives inside this card on purpose. It is the growth loop,
        so it has to clear the fold on a phone rather than sit under the receipt.
      */}
      <div className="rounded-3xl border border-line bg-surface p-3.5 [@media(min-height:680px)]:p-4 sm:p-7">
        <div className="flex flex-col items-center text-center">
          <VerdictMark charged={verdict.passThroughWithGst !== null} />

          <p className="rise mt-2.5 text-[13px] font-medium tracking-wide text-ink-3 [@media(min-height:680px)]:mt-3.5" style={{ animationDelay: "0.35s" }}>
            {verdict.heroLabel}
          </p>
          <p
            className="rise tnum mt-1 text-[46px] font-extrabold leading-none tracking-tighter text-ink [@media(min-height:680px)]:text-[58px] sm:text-[70px]"
            style={{ animationDelay: "0.42s" }}
          >
            {inr(verdict.passThroughWithGst ?? 0)}
          </p>
          {verdict.passThroughWithGst !== null && (
            <p className="rise mt-2 text-[13px] text-ink-3" style={{ animationDelay: "0.46s" }}>
              You pay <span className="tnum font-medium text-ink">{inr(0)}</span>
            </p>
          )}

          <h1
            className="rise mt-3.5 text-balance text-[21px] font-semibold leading-[1.2] tracking-tight [@media(min-height:680px)]:text-[22px] sm:text-[26px]"
            style={{ animationDelay: "0.5s" }}
          >
            {verdict.headline}
          </h1>
          <p
            className="rise mt-2 max-w-[38ch] text-[14px] leading-[1.45] text-ink-2"
            style={{ animationDelay: "0.56s" }}
          >
            {verdict.explainer}
          </p>

          {verdict.wink && (
            <p className="rise mt-2 text-[13.5px] text-accent" style={{ animationDelay: "0.6s" }}>
              {verdict.wink}
            </p>
          )}
        </div>

        {/* Kept in step with the PNG: what you see is what downloads. */}
        <div className="rise mt-3 rounded-2xl border border-line-soft bg-surface-2 px-4 py-2 [@media(min-height:680px)]:mt-4 [@media(min-height:680px)]:py-2.5" style={{ animationDelay: "0.64s" }}>
          <p className="text-[12.5px] font-medium text-ink-3">
            {verdict.passThroughWithGst !== null ? "How that adds up" : "Who actually pays"}
          </p>
          <p className="tnum mt-1 text-[15px] font-medium leading-snug text-ink">
            {verdict.payerLine}
          </p>
        </div>
      </div>

      {/* Outside the card on purpose: the card alone is what the PNG shows. */}
      <div className="rise mt-3 grid grid-cols-2 gap-2.5" style={{ animationDelay: "0.7s" }}>
        <ShareButton onClick={onDownload} busy={busy === "download"} icon={<DownloadSimpleIcon size={17} weight="bold" />}>
          Download card
        </ShareButton>
        <ShareButton onClick={onShare} busy={busy === "native"} icon={<ShareNetworkIcon size={17} weight="bold" />}>
          Share
        </ShareButton>
        <ShareButton onClick={onX} icon={<XLogoIcon size={16} weight="bold" />}>
          Post on X
        </ShareButton>
        <ShareButton
          onClick={onCopy}
          icon={copied ? <CheckIcon size={17} weight="bold" /> : <LinkSimpleIcon size={17} weight="bold" />}
        >
          {copied ? "Copied" : "Copy link"}
        </ShareButton>
      </div>

      {!isLive && (
        <p className="mt-4 text-center text-[12.5px] text-ink-3">
          This MDR is not live yet. {statusLabel}.
        </p>
      )}

      {/* Transaction detail card */}
      <section className="mt-4 rounded-3xl border border-line bg-surface px-5 py-4 sm:px-6">
        <h2 className="pb-1 text-[12.5px] font-medium text-ink-3">Receipt</h2>
        <dl className="divide-y divide-line-soft">
          <Row label="Amount" value={verdict.receipt.amount} mono />
          <Row label="Category" value={verdict.receipt.category} />
          <Row label="MDR rate" value={verdict.receipt.mdrRate} />
          <Row label="Merchant pays" value={verdict.receipt.merchantPays} mono />
          {verdict.receipt.merchantTotal && (
            <Row label="With expected 18% GST" value={verdict.receipt.merchantTotal} mono />
          )}
          <Row label="You pay" value={verdict.receipt.youPay} mono />
          <Row label="Effective from" value={verdict.receipt.effective} />
        </dl>
        {verdict.receipt.merchantTotal && (
          <p className="pt-2 text-[12px] leading-relaxed text-ink-3">
            NPCI's FAQ does not mention GST on MDR. The 18% follows press reporting.
          </p>
        )}
      </section>

      {verdict.notes.length > 0 && (
        <section className="mt-4 rounded-3xl border border-line-soft bg-surface px-5 py-4 sm:px-6">
          <h2 className="text-[12.5px] font-medium text-ink-3">Worth knowing</h2>
          <ul className="mt-2 grid gap-2">
            {verdict.notes.map((note) => (
              <li key={note} className="text-[13px] leading-relaxed text-ink-2">
                {note}
              </li>
            ))}
          </ul>
        </section>
      )}

      <Link
        href="/"
        className="mt-4 flex min-h-[52px] w-full items-center justify-center gap-2 rounded-2xl border border-line bg-surface text-[15px] font-medium text-ink transition-colors hover:border-accent/40"
      >
        <ArrowClockwiseIcon size={16} weight="bold" />
        Check another
      </Link>
    </div>
  );
}

function Row({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex items-baseline justify-between gap-4 py-2.5">
      <dt className="shrink-0 text-[13.5px] text-ink-3">{label}</dt>
      <dd className={`text-right text-[13.5px] font-medium text-ink ${mono ? "tnum" : ""}`}>
        {value}
      </dd>
    </div>
  );
}

function ShareButton({
  children,
  onClick,
  icon,
  busy,
}: {
  children: React.ReactNode;
  onClick: () => void;
  icon: React.ReactNode;
  busy?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={busy}
      className="flex min-h-[50px] items-center justify-center gap-2 rounded-2xl border border-line bg-surface-2 px-3 text-[13.5px] font-medium text-ink transition-[border-color,transform] hover:border-accent/40 active:scale-[0.98] disabled:opacity-60"
    >
      <span className="shrink-0 text-ink-2">{icon}</span>
      {busy ? "Working" : children}
    </button>
  );
}
