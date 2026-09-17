"use client";

import { useMemo, useState } from "react";
import {
  CARD_MDR_RATE,
  GST_ON_MDR,
  inr,
  merchantOutlook,
  parseAmount,
  pct,
  P2PM_MONTHLY_LIMIT,
  RECLASSIFY_MONTHS,
  type Kind,
} from "@/lib/rules";

const SECTORS: { value: Exclude<Kind, "na">; label: string }[] = [
  { value: "big", label: "General retail, D2C, services" },
  { value: "fuel", label: "Fuel, telecom, insurance, railways" },
  { value: "capital", label: "Capital markets" },
  { value: "small", label: "Not sure yet" },
];

export function MerchantCalc() {
  const [inflow, setInflow] = useState("250000");
  const [avgBill, setAvgBill] = useState("3500");
  const [sector, setSector] = useState<Exclude<Kind, "na">>("big");

  const monthlyInflow = parseAmount(inflow);
  const bill = parseAmount(avgBill);

  const outlook = useMemo(
    () => merchantOutlook(monthlyInflow, bill, sector === "small" ? "big" : sector),
    [monthlyInflow, bill, sector],
  );

  const ready = monthlyInflow > 0 && bill > 0;

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <div className="grid gap-5 rounded-3xl border border-line bg-surface p-5 sm:p-6">
            <Field
              id="inflow"
              label="Monthly UPI inflow"
              help={`The ${inr(P2PM_MONTHLY_LIMIT)} a month line decides everything.`}
              value={inflow}
              onChange={setInflow}
            />
            <Field
              id="avg-bill"
              label="Average bill size"
              help={`Only bills above ${inr(2000)} attract any MDR.`}
              value={avgBill}
              onChange={setAvgBill}
            />

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

      <div className="rounded-3xl border border-line bg-surface p-5 sm:p-6">
            {!ready ? (
              <p className="text-[14.5px] leading-relaxed text-ink-3">
                Enter a monthly inflow and an average bill to see where you land.
              </p>
            ) : (
              <div className="grid gap-5">
                <div>
                  <p className="text-[12.5px] font-medium text-ink-3">Your classification</p>
                  <p className="mt-1 text-[22px] font-semibold tracking-tight text-accent">
                    {outlook.status}
                  </p>
                  <p className="mt-1.5 text-[13.5px] leading-relaxed text-ink-2">
                    {outlook.statusLabel}
                  </p>
                </div>

                <dl className="divide-y divide-line-soft border-t border-line-soft">
                  <Stat label="Estimated MDR per month" value={inr(outlook.monthlyMdr)} />
                  <Stat label={`GST on that at ${pct(GST_ON_MDR)}`} value={inr(outlook.monthlyGst)} />
                  <Stat label="Total leaving your account" value={inr(outlook.monthlyTotal)} />
                  <Stat
                    label="Bills above the threshold"
                    value={`${outlook.chargeableBills.toLocaleString("en-IN")} a month`}
                  />
                  <Stat
                    label={`Same volume on cards at ${pct(CARD_MDR_RATE)}`}
                    value={inr(outlook.cardsMonthlyCost)}
                  />
                  <Stat
                    label="Months of sustained volume before reclassification"
                    value={
                      outlook.monthsToReclassification === null
                        ? `Not applicable yet, ${RECLASSIFY_MONTHS} once you cross`
                        : `Already reclassified`
                    }
                  />
                </dl>

                <p className="text-[13.5px] leading-relaxed text-ink-2">{outlook.note}</p>
              </div>
            )}
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
}: {
  id: string;
  label: string;
  help: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div className="grid gap-2">
      <label htmlFor={id} className="text-[13.5px] font-medium text-ink">
        {label}
      </label>
      <div className="flex items-center gap-2 rounded-2xl border border-line bg-surface-2 px-3.5 transition-[border-color,box-shadow] focus-within:border-accent focus-within:ring-[3px] focus-within:ring-accent/20">
        <span className="text-[15px] text-ink-3">&#8377;</span>
        <input
          id={id}
          value={value}
          onChange={(e) => onChange(e.target.value.replace(/[^\d]/g, "").slice(0, 9))}
          inputMode="numeric"
          autoComplete="off"
          placeholder="0"
          className="tnum min-h-[48px] w-full bg-transparent text-[15.5px] font-medium text-ink outline-none placeholder:text-ink-3/60"
        />
      </div>
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
