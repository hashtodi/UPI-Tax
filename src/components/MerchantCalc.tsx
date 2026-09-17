"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { track } from "@vercel/analytics";
import {
  CheckIcon,
  DownloadSimpleIcon,
  LinkSimpleIcon,
  ShareNetworkIcon,
  XLogoIcon,
} from "@phosphor-icons/react/dist/ssr";
import {
  merchantCardPath,
  merchantPath,
  merchantShareText,
  merchantUrl,
  xIntent,
} from "@/lib/share";
import {
  CARD_MDR_RATE,
  countIndian,
  groupDigits,
  GST_ON_MDR,
  inr,
  MDR_THRESHOLD,
  merchantOutlook,
  multipleLabel,
  parseAmount,
  pct,
  pctShare,
  P2PM_MONTHLY_LIMIT,
  RECLASSIFY_MONTHS,
  type Kind,
} from "@/lib/rules";

/*
 * The old inflow max of 15,00,000 sat exactly where 0.02% equals the 300 cap,
 * so a capital-markets merchant maxing the slider saw a monthly figure
 * identical to a per-transaction cap. Moving the max off that point stops it
 * being the default reading, though any calculator can still land on it. The
 * bill max now also reaches 75,000, where the 0.4% cap genuinely binds.
 */
const INFLOW_MAX = 1_00_00_000;
const BILL_MAX = 1_00_000;

const SECTORS: { value: Exclude<Kind, "na">; label: string }[] = [
  { value: "big", label: "General retail, D2C, services" },
  { value: "fuel", label: "Fuel, telecom, insurance, utilities" },
  { value: "capital", label: "Capital markets" },
  { value: "small", label: "Not sure yet" },
];

export function MerchantCalc({
  initialInflow = "250000",
  initialBill = "3500",
  initialShare = 40,
  initialSector = "big",
}: {
  initialInflow?: string;
  initialBill?: string;
  initialShare?: number;
  initialSector?: Exclude<Kind, "na">;
} = {}) {
  const [inflow, setInflow] = useState(initialInflow);
  const [avgBill, setAvgBill] = useState(initialBill);
  const [sector, setSector] = useState<Exclude<Kind, "na">>(initialSector);
  const [share, setShare] = useState(initialShare);
  const [copied, setCopied] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);

  // Same ceiling as the 9 digits the fields accept, so what is shown is what
  // is computed. A month of revenue is not bounded like a single payment.
  const FIELD_MAX = 999_999_999;
  const monthlyInflow = parseAmount(inflow, FIELD_MAX);
  const bill = parseAmount(avgBill, FIELD_MAX);

  const outlook = useMemo(
    () =>
      merchantOutlook(monthlyInflow, bill, sector === "small" ? "big" : sector, share / 100),
    [monthlyInflow, bill, sector, share],
  );

  const ready = monthlyInflow > 0 && bill > 0;

  const barMax = Math.max(outlook.cardsMonthlyCost, outlook.monthlyTotal, 1);

  const params = { inflow: monthlyInflow, bill, share, sector };

  /*
   * Keep the address bar in step with the inputs, without a navigation, so
   * "Copy link" hands someone the numbers actually on screen.
   */
  const synced = useRef("");
  useEffect(() => {
    if (!ready) return;
    const next = merchantPath(params);
    if (next === synced.current) return;
    synced.current = next;
    window.history.replaceState(null, "", next);
  });

  // Rounding each line separately let "10 + 2" sit under a headline of "11".
  async function fetchCard() {
    try {
      const res = await fetch(merchantCardPath(params, "tall"));
      return res.ok ? await res.blob() : null;
    } catch {
      return null;
    }
  }

  async function onDownload() {
    setBusy("download");
    track("share", { platform: "download", who: "merchant" });
    const blob = await fetchCard();
    if (blob) {
      const href = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = href;
      a.download = `upi-tax-shop-${Math.round(monthlyInflow)}.png`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(href);
    }
    setBusy(null);
  }

  async function onShare() {
    setBusy("native");
    track("share", { platform: "native", who: "merchant" });
    const blob = await fetchCard();
    const file = blob ? new File([blob], "upi-tax-shop.png", { type: "image/png" }) : null;
    try {
      if (file && navigator.canShare?.({ files: [file] })) {
        await navigator.share({ files: [file], text: shareCopy });
      } else if (navigator.share) {
        await navigator.share({ text: shareCopy });
      } else {
        await navigator.clipboard.writeText(shareCopy);
        setCopied(true);
        setTimeout(() => setCopied(false), 1800);
      }
    } catch {
      // A cancelled share is not an error.
    }
    setBusy(null);
  }

  async function onCopy() {
    track("share", { platform: "copy", who: "merchant" });
    try {
      await navigator.clipboard.writeText(merchantUrl(params));
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      // Clipboard blocked. The URL is in the address bar anyway.
    }
  }

  const mdrShown = Math.round(outlook.monthlyMdr);
  const gstShown = Math.round(outlook.monthlyGst);
  const totalShown = mdrShown + gstShown;

  const shareCopy = merchantShareText(
    params,
    totalShown,
    outlook.status,
    pctShare(outlook.priceRiseShare),
  );

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      {/*
        On a phone the full result sits below the form, so the number would be
        off-screen exactly while you are dragging the sliders. This sticks the
        live answer under the nav until the real card comes into view.
      */}
      {ready && (
        <div className="sticky top-[60px] z-10 -mx-4 border-b border-line bg-bg px-4 py-2.5 lg:hidden">
          <div className="flex items-center justify-between gap-3">
            <span className="text-[12.5px] font-medium text-ink-3">You would pay</span>
            <span className="flex items-center gap-2">
              <span className="tnum text-[19px] font-bold tracking-tight text-ink">
                {inr(totalShown)}
              </span>
              <span className="rounded-full border border-accent/30 bg-accent/10 px-2 py-0.5 text-[11px] font-semibold text-accent">
                {outlook.statusPill}
              </span>
              <button
                type="button"
                onClick={onShare}
                aria-label="Share this result"
                className="ml-0.5 grid h-9 w-9 place-items-center rounded-full border border-line bg-surface-2 text-ink-2 transition-colors hover:border-accent/40 hover:text-ink"
              >
                <ShareNetworkIcon size={15} weight="bold" />
              </button>
            </span>
          </div>
        </div>
      )}

      {/*
        self-start matters: as a stretched grid column this panel would size its
        own rows against the taller sibling and tear the labels off the inputs.
      */}
      <div className="flex flex-col gap-5 self-start rounded-3xl border border-line bg-surface p-5 sm:p-6">
        <Field
          id="inflow"
          label="Monthly UPI inflow"
          help={`The ${inr(P2PM_MONTHLY_LIMIT)} a month line decides everything.`}
          value={inflow}
          onChange={setInflow}
          max={INFLOW_MAX}
          step={25_000}
        />

        <Field
          id="avg-bill"
          label={`Average size of bills above ${inr(MDR_THRESHOLD)}`}
          help="Only those bills carry a fee, so this is their average, not your overall one."
          value={avgBill}
          onChange={setAvgBill}
          min={MDR_THRESHOLD}
          max={BILL_MAX}
          step={500}
        />

        <div className="grid gap-2">
          <div className="flex items-baseline justify-between gap-3">
            <label htmlFor="share" className="text-[13.5px] font-medium text-ink">
              Money from bills above {inr(MDR_THRESHOLD)}
            </label>
            <span className="tnum text-[13.5px] font-semibold text-accent">{share}%</span>
          </div>
          <input
            id="share"
            type="range"
            min={0}
            max={100}
            step={5}
            value={share}
            onChange={(e) => setShare(Number(e.target.value))}
            className="-my-1.5"
          />
          <p className="text-[12.5px] leading-snug text-ink-3">
            An average cannot tell us this. A {inr(2_500)} average could be every bill at{" "}
            {inr(2_500)}, or half at {inr(500)} and half at {inr(4_500)}. Only this share decides
            what you pay.
          </p>
        </div>

        <div className="grid gap-2">
          <label htmlFor="sector" className="text-[13.5px] font-medium text-ink">
            Sector
          </label>
          <select
            id="sector"
            value={sector}
            onChange={(e) => setSector(e.target.value as Exclude<Kind, "na">)}
            className="min-h-[48px] w-full rounded-2xl border border-line bg-surface-2 px-3.5 text-[14.5px] text-ink transition-[border-color,box-shadow] focus:border-accent focus:ring-[3px] focus:ring-accent/20"
          >
            {SECTORS.map((s) => (
              <option key={s.value} value={s.value} className="bg-surface-2">
                {s.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="self-start rounded-3xl border border-line bg-surface p-5 sm:p-6">
        {!ready ? (
          <p className="text-[14.5px] leading-relaxed text-ink-3">
            Enter a monthly inflow and an average bill to see where you land.
          </p>
        ) : (
          <div className="grid gap-7">
            {/* Hero figure: the one number this page exists to produce. */}
            <div>
              <div className="flex items-center justify-between gap-3">
                <p className="text-[12.5px] font-medium text-ink-3">You would pay</p>
                <span className="rounded-full border border-accent/30 bg-accent/10 px-2.5 py-1 text-[12px] font-semibold text-accent">
                  {outlook.statusPill}
                </span>
              </div>
              <p className="mt-1.5 text-[44px] font-extrabold leading-none tracking-tighter text-ink sm:text-[52px]">
                {inr(totalShown)}
              </p>
              <p className="mt-2 text-[13.5px] leading-relaxed text-ink-2">
                a month on UPI, with expected GST. {outlook.statusLabel}
              </p>
            </div>

            <div className="grid grid-cols-2 gap-2.5 border-t border-line-soft pt-5">
              <ShopShareButton
                onClick={onDownload}
                busy={busy === "download"}
                icon={<DownloadSimpleIcon size={17} weight="bold" />}
              >
                Download card
              </ShopShareButton>
              <ShopShareButton
                onClick={onShare}
                busy={busy === "native"}
                icon={<ShareNetworkIcon size={17} weight="bold" />}
              >
                Share
              </ShopShareButton>
              <ShopShareButton
                onClick={() => {
                  track("share", { platform: "x", who: "merchant" });
                  window.open(xIntent(shareCopy), "_blank", "noopener,noreferrer");
                }}
                icon={<XLogoIcon size={16} weight="bold" />}
              >
                Post on X
              </ShopShareButton>
              <ShopShareButton
                onClick={onCopy}
                icon={
                  copied ? (
                    <CheckIcon size={17} weight="bold" />
                  ) : (
                    <LinkSimpleIcon size={17} weight="bold" />
                  )
                }
              >
                {copied ? "Copied" : "Copy link"}
              </ShopShareButton>
            </div>


            {/* Meter: one ratio against a limit. Track is a dim step of the same hue. */}
            <div>
              <div className="flex items-baseline justify-between gap-3">
                <p className="text-[12.5px] font-medium text-ink-3">Monthly UPI inflow</p>
                <p className="tnum text-[12.5px] font-medium text-ink-2">
                  {inr(P2PM_MONTHLY_LIMIT)} line
                </p>
              </div>
              <div
                className="mt-2 h-2.5 w-full overflow-hidden rounded-full bg-accent/15"
                role="img"
                aria-label={`${inr(monthlyInflow)} of the ${inr(P2PM_MONTHLY_LIMIT)} monthly line`}
              >
                <div
                  className="h-full rounded-full bg-accent transition-[width] duration-500"
                  style={{ width: `${Math.max(2, outlook.inflowRatio * 100)}%` }}
                />
              </div>
              <p className="mt-2 text-[13px] leading-relaxed text-ink-2">
                <span className="tnum font-medium text-ink">{inr(monthlyInflow)}</span>{" "}
                {outlook.status === "P2PM" ? (
                  <>
                    a month,{" "}
                    {outlook.headroom > 0 ? (
                      <>
                        with{" "}
                        <span className="tnum font-medium text-ink">{inr(outlook.headroom)}</span> of
                        headroom before the line.
                      </>
                    ) : (
                      <>right on the line, and still within it.</>
                    )}
                  </>
                ) : (
                  <>
                    a month, over the line. It takes {RECLASSIFY_MONTHS} consecutive months above
                    it before P2M actually applies.
                  </>
                )}
              </p>
            </div>

            {/* Emphasis: UPI is the subject, cards are context. One hue plus gray. */}
            {sector !== "capital" && (
            <div>
              <p className="text-[12.5px] font-medium text-ink-3">
                Cost of accepting the same money
              </p>
              <div className="mt-3 grid gap-2.5">
                <CostBar label="On UPI" value={outlook.monthlyTotal} max={barMax} subject />
                <CostBar
                  label={`On credit cards at ${pct(CARD_MDR_RATE)}, with expected GST`}
                  value={outlook.cardsMonthlyCost}
                  max={barMax}
                />
              </div>
              <p className="mt-3 text-[13px] leading-relaxed text-ink-2">
                Staying on UPI keeps{" "}
                <span className="tnum font-medium text-accent">
                  {inr(Math.round(outlook.savingVsCards))}
                </span>{" "}
                a month
                {multipleLabel(outlook.cardsMultiple)
                  ? `. Cards would cost ${multipleLabel(outlook.cardsMultiple)} as much.`
                  : ", because UPI costs you nothing at this volume."}
              </p>
            </div>
            )}

            {outlook.monthlyTotal > 0 && (
              <div className="rounded-2xl border border-line-soft bg-surface-2 px-4 py-3">
                <p className="text-[12.5px] font-medium text-ink-3">
                  To cover it, prices would have to rise
                </p>
                <p className="mt-1 text-[15px] font-medium leading-snug text-ink">
                  <span className="tnum">{pctShare(outlook.priceRiseShare)}</span>
                  {outlook.billsPerMonth > 0 && (
                    <>
                      , or about{" "}
                      {/* The base is a qualifying bill, not the overall average,
                          which this page never asks for. */}
                      <span className="tnum">{inr(outlook.perBillRecovery)}</span> on one of those
                      bills
                    </>
                  )}
                </p>
                <p className="mt-1.5 text-[12.5px] leading-relaxed text-ink-3">
                  That is the part your customers end up carrying.
                </p>
              </div>
            )}

            <dl className="divide-y divide-line-soft border-t border-line-soft">
              <Stat label="MDR before GST" value={inr(mdrShown)} />
              <Stat
                label={`GST expected on that at ${pct(GST_ON_MDR)}`}
                value={inr(gstShown)}
              />
              <Stat
                label={`Money through bills above ${inr(MDR_THRESHOLD)}`}
                value={inr(Math.round(outlook.qualifyingValue))}
              />
              <Stat
                label="Roughly that many such bills"
                value={countIndian(outlook.qualifyingBills)}
              />
            </dl>

            <p className="text-[13px] leading-relaxed text-ink-2">{outlook.note}</p>

            {/*
              * The FAQ never mentions GST on MDR. It comes from press reporting,
              * and every other surface labels it "expected", so this page has to
              * say where the number comes from rather than assert it.
              */}
            <p className="text-[12px] leading-relaxed text-ink-3">
              The {pct(GST_ON_MDR)} is not in NPCI&rsquo;s FAQ. It is what press reporting expects
              to apply to MDR. Treat the fee alone as the firm number.
            </p>

          </div>
        )}
      </div>
    </div>
  );
}

/**
 * A single cost bar. The subject is the accent; the alternative is de-emphasised
 * gray. Both are direct-labelled, so identity never rests on colour alone.
 */
function CostBar({
  label,
  value,
  max,
  subject,
}: {
  label: string;
  value: number;
  max: number;
  subject?: boolean;
}) {
  const width = max > 0 ? (value / max) * 100 : 0;
  return (
    <div>
      <div className="flex items-baseline justify-between gap-3">
        <span className="text-[13px] text-ink-2">{label}</span>
        <span className={`tnum text-[13px] font-medium ${subject ? "text-accent" : "text-ink"}`}>
          {inr(Math.round(value))}
        </span>
      </div>
      <div className="mt-1.5 h-2 w-full">
        <div
          className={`h-full rounded-[4px] transition-[width] duration-500 ${
            subject ? "bg-accent" : "bg-ink-3"
          }`}
          style={{
            width: value > 0 ? `${Math.max(1.5, width)}%` : "0%",
            minWidth: value > 0 ? 10 : 0,
          }}
        />
      </div>
    </div>
  );
}

function Field({
  id,
  label,
  help,
  value,
  onChange,
  min = 0,
  max,
  step,
}: {
  id: string;
  label: string;
  help: string;
  value: string;
  onChange: (v: string) => void;
  /** Floor for the slider. A bill "above 2,000" cannot be dragged below it. */
  min?: number;
  max: number;
  step: number;
}) {
  const numeric = Math.min(Math.max(Number(value) || 0, min), max);
  return (
    <div className="grid gap-2">
      <label htmlFor={id} className="text-[13.5px] font-medium text-ink">
        {label}
      </label>

      <div className="flex items-center gap-2 rounded-2xl border border-line bg-surface-2 px-3.5 transition-[border-color,box-shadow] focus-within:border-accent focus-within:ring-[3px] focus-within:ring-accent/20">
        <span className="text-[15px] text-ink-3">&#8377;</span>
        <input
          id={id}
          value={groupDigits(value)}
          onChange={(e) => onChange(e.target.value.replace(/\D/g, "").slice(0, 9))}
          inputMode="numeric"
          autoComplete="off"
          placeholder="0"
          className="tnum min-h-[48px] w-full bg-transparent text-[15.5px] font-medium text-ink outline-none placeholder:text-ink-3/60"
        />
      </div>

      {/* Dragging is the fun part, and it beats typing on a phone. */}
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={numeric}
        onChange={(e) => onChange(e.target.value)}
        aria-label={`${label} slider`}
        className="-my-1.5"
      />

      <p className="text-[12.5px] leading-snug text-ink-3">{help}</p>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline justify-between gap-4 py-2.5">
      <dt className="text-[13px] leading-snug text-ink-3">{label}</dt>
      <dd className="tnum shrink-0 text-right text-[14px] font-medium text-ink">{value}</dd>
    </div>
  );
}

function ShopShareButton({
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
      className="flex min-h-[48px] items-center justify-center gap-2 rounded-2xl border border-line bg-surface-2 px-3 text-[13.5px] font-medium text-ink transition-[border-color,transform] hover:border-accent/40 active:scale-[0.98] disabled:opacity-60"
    >
      <span className="shrink-0 text-ink-2">{icon}</span>
      {busy ? "Working" : children}
    </button>
  );
}
