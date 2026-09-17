"use client";

import { useMemo, useState } from "react";
import {
  CARD_MDR_RATE,
  countIndian,
  groupDigits,
  GST_ON_MDR,
  inr,
  MDR_THRESHOLD,
  merchantOutlook,
  parseAmount,
  pct,
  P2PM_MONTHLY_LIMIT,
  RECLASSIFY_MONTHS,
  type Kind,
} from "@/lib/rules";

/** Recognisable shop shapes, so someone can try the thing in one tap. */
const PRESETS: {
  label: string;
  inflow: number;
  bill: number;
  /** Share of revenue arriving through bills above the threshold, in percent. */
  share: number;
  sector: Exclude<Kind, "na">;
}[] = [
  { label: "Chaiwala", inflow: 45_000, bill: 40, share: 0, sector: "small" },
  { label: "Kirana store", inflow: 1_20_000, bill: 350, share: 10, sector: "big" },
  { label: "Salon", inflow: 3_00_000, bill: 900, share: 30, sector: "big" },
  { label: "Phone shop", inflow: 9_00_000, bill: 14_000, share: 90, sector: "big" },
];

const INFLOW_MAX = 15_00_000;
const BILL_MAX = 20_000;

const SECTORS: { value: Exclude<Kind, "na">; label: string }[] = [
  { value: "big", label: "General retail, D2C, services" },
  { value: "fuel", label: "Fuel, telecom, insurance, utilities" },
  { value: "capital", label: "Capital markets" },
  { value: "small", label: "Not sure yet" },
];

export function MerchantCalc() {
  const [inflow, setInflow] = useState("250000");
  const [avgBill, setAvgBill] = useState("3500");
  const [sector, setSector] = useState<Exclude<Kind, "na">>("big");
  const [share, setShare] = useState(40);

  const monthlyInflow = parseAmount(inflow);
  const bill = parseAmount(avgBill);

  const outlook = useMemo(
    () =>
      merchantOutlook(monthlyInflow, bill, sector === "small" ? "big" : sector, share / 100),
    [monthlyInflow, bill, sector, share],
  );

  const ready = monthlyInflow > 0 && bill > 0;

  function applyPreset(preset: (typeof PRESETS)[number]) {
    setInflow(String(preset.inflow));
    setAvgBill(String(preset.bill));
    setShare(preset.share);
    setSector(preset.sector);
  }

  const activePreset = PRESETS.find(
    (p) =>
      p.inflow === monthlyInflow &&
      p.bill === bill &&
      p.share === share &&
      p.sector === sector,
  );

  const barMax = Math.max(outlook.cardsMonthlyCost, outlook.monthlyTotal, 1);

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
            <span className="flex items-center gap-2.5">
              <span className="tnum text-[19px] font-bold tracking-tight text-ink">
                {inr(Math.round(outlook.monthlyTotal))}
              </span>
              <span className="rounded-full border border-accent/30 bg-accent/10 px-2 py-0.5 text-[11px] font-semibold text-accent">
                {outlook.status}
              </span>
            </span>
          </div>
        </div>
      )}

      {/*
        self-start matters: as a stretched grid column this panel would size its
        own rows against the taller sibling and tear the labels off the inputs.
      */}
      <div className="flex flex-col gap-5 self-start rounded-3xl border border-line bg-surface p-5 sm:p-6">
        <div>
          <p className="text-[12.5px] font-medium text-ink-3">Start from a shop like yours</p>
          <div className="mt-2.5 flex flex-wrap gap-2">
            {PRESETS.map((preset) => {
              const active = activePreset?.label === preset.label;
              return (
                <button
                  key={preset.label}
                  type="button"
                  onClick={() => applyPreset(preset)}
                  aria-pressed={active}
                  className={`min-h-[40px] rounded-full border px-3.5 text-[13px] font-medium transition-[border-color,color,background-color] active:scale-[0.98] ${
                    active
                      ? "border-accent/50 bg-accent/10 text-accent"
                      : "border-line bg-surface-2 text-ink-2 hover:border-accent/40 hover:text-ink"
                  }`}
                >
                  {preset.label}
                </button>
              );
            })}
          </div>
        </div>

        <Field
          id="inflow"
          label="Monthly UPI inflow"
          help={`The ${inr(P2PM_MONTHLY_LIMIT)} a month line decides everything.`}
          value={inflow}
          onChange={setInflow}
          max={INFLOW_MAX}
          step={5_000}
        />

        <Field
          id="avg-bill"
          label="Average bill size"
          help={`Only bills above ${inr(MDR_THRESHOLD)} attract any MDR.`}
          value={avgBill}
          onChange={setAvgBill}
          max={BILL_MAX}
          step={50}
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
                  {outlook.status}
                </span>
              </div>
              <p className="mt-1.5 text-[44px] font-extrabold leading-none tracking-tighter text-ink sm:text-[52px]">
                {inr(Math.round(outlook.monthlyTotal))}
              </p>
              <p className="mt-2 text-[13.5px] leading-relaxed text-ink-2">
                a month on UPI, with GST. {outlook.statusLabel}
              </p>
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
                {outlook.headroom > 0 ? (
                  <>
                    a month, with{" "}
                    <span className="tnum font-medium text-ink">{inr(outlook.headroom)}</span> of
                    headroom before the line.
                  </>
                ) : (
                  <>
                    a month, over the line. Reclassification needs {RECLASSIFY_MONTHS} consecutive
                    months above it.
                  </>
                )}
              </p>
            </div>

            {/* Emphasis: UPI is the subject, cards are context. One hue plus gray. */}
            <div>
              <p className="text-[12.5px] font-medium text-ink-3">
                Cost of accepting the same money
              </p>
              <div className="mt-3 grid gap-2.5">
                <CostBar label="On UPI" value={outlook.monthlyTotal} max={barMax} subject />
                <CostBar
                  label={`On credit cards at ${pct(CARD_MDR_RATE)}`}
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
                {outlook.cardsMultiple
                  ? `. Cards would cost ${outlook.cardsMultiple.toFixed(1)}x more.`
                  : ", because UPI costs you nothing at this volume."}
              </p>
            </div>

            <dl className="divide-y divide-line-soft border-t border-line-soft">
              <Stat label="MDR before GST" value={inr(Math.round(outlook.monthlyMdr))} />
              <Stat
                label={`GST on that at ${pct(GST_ON_MDR)}`}
                value={inr(Math.round(outlook.monthlyGst))}
              />
              <Stat
                label={`Money through bills above ${inr(MDR_THRESHOLD)}`}
                value={inr(Math.round(outlook.qualifyingValue))}
              />
              <Stat
                label="Roughly that many bills"
                value={countIndian(outlook.qualifyingBills)}
              />
            </dl>

            <p className="text-[13px] leading-relaxed text-ink-2">{outlook.note}</p>
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
          style={{ width: value > 0 ? `${Math.max(1.5, width)}%` : "0%" }}
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
  max,
  step,
}: {
  id: string;
  label: string;
  help: string;
  value: string;
  onChange: (v: string) => void;
  max: number;
  step: number;
}) {
  const numeric = Math.min(Number(value) || 0, max);
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
        min={0}
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
