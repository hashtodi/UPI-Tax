/**
 * Single source of truth for the UPI MDR rules.
 * Based on NPCI's UPI MDR FAQ, September 2026. Effective 15 October 2026.
 *
 * The one thing that never changes: the customer always pays zero.
 */

export type Who = "person" | "shop";
export type Kind = "na" | "small" | "big" | "fuel" | "capital";

export const EFFECTIVE_DATE_ISO = "2026-10-15";
export const EFFECTIVE_DATE_LABEL = "15 October 2026";

/** MDR only bites above this amount. At exactly this amount, nothing applies. */
export const MDR_THRESHOLD = 2000;
/** Standard large-merchant rate. */
export const P2M_RATE = 0.004;
/** Capital markets rate. */
export const CAPITAL_RATE = 0.0002;
/** Rupee cap shared by the percentage-based rates. */
export const MDR_CAP = 300;
/** Flat rupee MDR for fuel, telecom, insurance and railways. */
export const FLAT_SECTOR_MDR = 5;
/**
 * A P2PM merchant may receive UP TO this much per month. Reclassification is
 * triggered only by inward credit of MORE than this, for 3 consecutive months.
 */
export const P2PM_MONTHLY_LIMIT = 100_000;
/**
 * GST expected on the MDR. NPCI's FAQ does NOT mention GST on MDR anywhere;
 * this comes from press reporting, which says MDR "may attract" 18%. Every
 * surface that uses it must say so rather than present it as the rule.
 */
export const GST_ON_MDR = 0.18;
/** Consecutive months above the limit before reclassification. */
export const RECLASSIFY_MONTHS = 3;

export const WHO_VALUES: Who[] = ["person", "shop"];
export const KIND_VALUES: Kind[] = ["na", "small", "big", "fuel", "capital"];

export type Receipt = {
  amount: string;
  category: string;
  mdrRate: string;
  merchantPays: string;
  /** Present only when a fee applies: the fee plus the EXPECTED 18% GST. */
  merchantTotal?: string;
  youPay: string;
  effective: string;
};

export type Verdict = {
  who: Who;
  kind: Kind;
  amt: number;
  /** Always 0. That is the entire point of this site. */
  customerPays: number;
  merchantPays: number;
  /** Fractional rate actually applied, or null when no percentage applies. */
  rate: number | null;
  cap: number | null;
  /** Plain label above the big number. Says who pays, in two or three words. */
  heroLabel: string;
  headline: string;
  explainer: string;
  /** The "who actually pays" row on the verdict screen. */
  payerLine: string;
  /** Extra line shown when the amount is exactly at the threshold. */
  wink: string | null;
  categoryLabel: string;
  /** Short label used on the share card and in metadata. */
  shortCategory: string;
  /** Caveats worth stating so the answer is not more certain than the source. */
  notes: string[];
  /**
   * What this transaction's MDR costs the merchant in full, GST included.
   * Null when nobody is charged. The rule bans adding it at checkout, so this
   * is the merchant's cost, and the amount at stake if it reaches the price
   * tag instead. It is an economic argument, never presented as a charge.
   */
  passThrough: number | null;
  /**
   * The same cost including the EXPECTED 18% GST. The fee is sourced; the GST
   * is press-reported, so every surface showing this must say "expected".
   */
  passThroughWithGst: number | null;
  receipt: Receipt;
};

/* ------------------------------------------------------------------ */
/* formatting                                                          */
/* ------------------------------------------------------------------ */

/** Indian digit grouping, hand-rolled so it cannot depend on ICU data. */
function groupIndian(digits: string): string {
  if (digits.length <= 3) return digits;
  const last3 = digits.slice(-3);
  const rest = digits.slice(0, -3);
  return `${rest.replace(/\B(?=(\d{2})+(?!\d))/g, ",")},${last3}`;
}

/**
 * Groups a raw digit string for live display in an input, so someone typing
 * a lakh sees 1,00,000 rather than 100000. State stays raw digits.
 */
export function groupDigits(raw: string): string {
  const digits = String(raw).replace(/\D/g, "").replace(/^0+(?=\d)/, "");
  return digits ? groupIndian(digits) : "";
}

/** Indian grouping for a plain count, with no rupee sign. */
export function countIndian(value: number): string {
  return groupIndian(String(Math.round(Math.abs(value))));
}

/** Formats a rupee figure. Shows paise only when there are paise. */
export function inr(value: number): string {
  if (!Number.isFinite(value)) return "\u20B90";
  const rounded = Math.round(value * 100) / 100;
  const negative = rounded < 0;
  const abs = Math.abs(rounded);
  const whole = Math.floor(abs);
  const paise = Math.round((abs - whole) * 100);
  const body =
    paise === 0
      ? groupIndian(String(whole))
      : `${groupIndian(String(whole))}.${String(paise).padStart(2, "0")}`;
  return `${negative ? "-" : ""}₹${body}`;
}

/**
 * A share for display. Small shares get two decimals at most, so a figure like
 * 0.0153% never claims precision the inputs cannot support.
 */
export function pctShare(rate: number): string {
  const value = rate * 100;
  if (value <= 0) return "0%";
  if (value < 0.01) return "under 0.01%";
  if (value < 1) return `${parseFloat(value.toFixed(2))}%`;
  return `${parseFloat(value.toFixed(1))}%`;
}

/** Renders a fractional rate as a percentage without trailing zeroes. */
export function pct(rate: number): string {
  const asPercent = rate * 100;
  return `${parseFloat(asPercent.toFixed(4))}%`;
}

/* ------------------------------------------------------------------ */
/* input coercion                                                      */
/* ------------------------------------------------------------------ */

export function parseWho(value: string | undefined): Who {
  return value === "person" ? "person" : "shop";
}

export function parseKind(value: string | undefined, who: Who): Kind {
  if (who === "person") return "na";
  return (KIND_VALUES as string[]).includes(value ?? "") && value !== "na"
    ? (value as Kind)
    : "big";
}

/**
 * "3750.0x as much" is true and reads like a bug. Past a point the ratio stops
 * being information, so say that instead of printing a decimal on it.
 */
export function multipleLabel(multiple: number | null): string | null {
  if (multiple === null || !Number.isFinite(multiple) || multiple <= 0) return null;
  if (multiple >= 100) return "over 100x";
  if (multiple >= 10) return `${Math.round(multiple)}x`;
  return `${parseFloat(multiple.toFixed(1))}x`;
}

export function parseAmount(
  value: string | number | undefined,
  /** Ceiling for this field. A single payment and a month of revenue differ. */
  max = 99_999_999,
): number {
  const text = String(value ?? "");
  // A minus anywhere means the input is junk, not a small negative payment.
  const raw = typeof value === "number" ? value : text.includes("-") ? NaN : Number(text.replace(/[^\d.]/g, ""));
  if (!Number.isFinite(raw) || raw <= 0) return 0;
  return Math.min(Math.round(raw * 100) / 100, max);
}

/* ------------------------------------------------------------------ */
/* the rules                                                           */
/* ------------------------------------------------------------------ */

const CATEGORY_LABEL: Record<Kind, string> = {
  na: "Person to person (P2P)",
  small: "Small merchant (P2PM)",
  big: "Large merchant (P2M)",
  // NPCI names railways, telecom, insurance and fuel "among others", and
  // separately puts electricity, water and piped gas on the same flat fee.
  fuel: "Concessional flat-fee sector",
  capital: "Capital markets",
};

const SHORT_CATEGORY: Record<Kind, string> = {
  na: "a person",
  small: "a small shop",
  big: "a large merchant",
  fuel: "a flat-fee sector",
  capital: "a broker",
};

/** Recurring mandates are exempt outright, which changes the answer entirely. */
const AUTOPAY_NOTE =
  "NPCI says UPI AutoPay mandates carry no prescribed MDR, so the same payment set up as a mandate may cost nothing. The FAQ does not reconcile that with the sector rates.";

export function computeVerdict(who: Who, kind: Kind, amt: number): Verdict {
  const effectiveKind: Kind = who === "person" ? "na" : kind;
  const aboveThreshold = amt > MDR_THRESHOLD;

  let merchantPays = 0;
  let rate: number | null = null;
  let cap: number | null = null;
  const notes: string[] = [];
  let heroLabel: string;
  let headline: string;
  let explainer: string;
  let payerLine: string;
  let mdrRate: string;
  /** Overrides the receipt's merchant line where a flat 0 would overclaim. */
  let receiptMerchantPays: string | null = null;

  switch (effectiveKind) {
    case "na":
      heroLabel = "Nobody pays";
      headline = "Nobody pays anything.";
      explainer = "Sending money to a person is free, whatever the amount.";
      payerLine = "Nobody. This is a person-to-person payment.";
      mdrRate = "Not applicable";
      break;

    case "small":
      heroLabel = "Nobody pays";
      headline = "Nobody pays anything.";
      explainer = `Small shops are exempt. Even on a big bill, this one pays nothing.`;
      payerLine = `Nobody, if the shop takes up to ${inr(P2PM_MONTHLY_LIMIT)} a month on UPI.`;
      mdrRate = "0% (exempt)";
      notes.push(
        `This rests on the shop taking up to ${inr(P2PM_MONTHLY_LIMIT)} a month on UPI. A busy one is reclassified as a large merchant only after ${RECLASSIFY_MONTHS} consecutive months above it, and would then pay ${pct(P2M_RATE)}.`,
      );
      break;

    case "fuel":
      if (aboveThreshold) {
        merchantPays = FLAT_SECTOR_MDR;
        heroLabel = "The company pays";
        headline = "You’re not charged. The company is. But eventually, you will be.";
        explainer = "It shows up in the tariff, not on your bill.";
        payerLine = `${inr(FLAT_SECTOR_MDR)} flat fee, plus ${inr(FLAT_SECTOR_MDR * GST_ON_MDR)} expected GST`;
        mdrRate = `${inr(FLAT_SECTOR_MDR)} flat above ${inr(MDR_THRESHOLD)}`;
        notes.push(
          "NPCI names railways, telecom, insurance and fuel \u201Camong others\u201D, and puts electricity, water and piped gas on the same flat fee. The list is not closed.",
          AUTOPAY_NOTE,
        );
      } else {
        heroLabel = "Nobody pays";
        headline = "Nobody pays anything.";
        explainer = `The fee only starts above ${inr(MDR_THRESHOLD)}.`;
        payerLine = `Nobody. ${inr(MDR_THRESHOLD)} and under carries no fee.`;
        mdrRate = `${inr(FLAT_SECTOR_MDR)} flat above ${inr(MDR_THRESHOLD)}`;
      }
      break;

    case "capital":
      if (aboveThreshold) {
        rate = CAPITAL_RATE;
        cap = MDR_CAP;
        merchantPays = Math.min(amt * CAPITAL_RATE, MDR_CAP);
        heroLabel = "Your broker pays";
        headline = "You’re not charged. Your broker is. But eventually, you will be.";
        explainer = "It shows up in brokerage, not on your trade.";
        payerLine = `${inr(merchantPays)} fee, plus ${inr(merchantPays * GST_ON_MDR)} expected GST`;
        mdrRate =
          merchantPays >= MDR_CAP ? `${pct(CAPITAL_RATE)}, capped at ${inr(MDR_CAP)}` : pct(CAPITAL_RATE);
        notes.push(
          `${pct(CAPITAL_RATE)} with a ${inr(MDR_CAP)} cap per transaction, so the cap only bites above ${inr(15_00_000)}. NPCI's FAQ states no ${inr(MDR_THRESHOLD)} floor for this category, so a smaller payment may still carry the rate.`,
          AUTOPAY_NOTE,
        );
      } else {
        heroLabel = "Not you";
        headline = "You are not charged either way.";
        explainer = "Whatever your broker pays here, it is not added to your trade.";
        payerLine = "Your broker, if anything. Never you.";
        mdrRate = `${pct(CAPITAL_RATE)}, no floor stated`;
        // The FAQ states no floor here, so "the broker pays 0" is our guess, not its rule.
        receiptMerchantPays = "Not stated";
        notes.push(
          `NPCI's FAQ does not state a ${inr(MDR_THRESHOLD)} floor for capital markets, so a payment this small may still carry ${pct(CAPITAL_RATE)}. Either way the broker pays it, not you.`,
        );
      }
      break;

    case "big":
    default:
      if (aboveThreshold) {
        rate = P2M_RATE;
        cap = MDR_CAP;
        merchantPays = Math.min(amt * P2M_RATE, MDR_CAP);
        heroLabel = "The shop pays";
        headline = "You’re not charged. The shop is. But eventually, you will be.";
        explainer = "It shows up in the price, not on your bill.";
        payerLine = `${inr(merchantPays)} fee, plus ${inr(merchantPays * GST_ON_MDR)} expected GST`;
        mdrRate = `${pct(P2M_RATE)}, capped at ${inr(MDR_CAP)}`;
        notes.push(AUTOPAY_NOTE);
      } else {
        heroLabel = "Nobody pays";
        headline = "Nobody pays anything.";
        explainer = `The fee only starts above ${inr(MDR_THRESHOLD)}.`;
        payerLine = `Nobody. ${inr(MDR_THRESHOLD)} and under carries no fee.`;
        mdrRate = `${pct(P2M_RATE)} above ${inr(MDR_THRESHOLD)}`;
      }
      break;
  }

  return {
    who,
    kind: effectiveKind,
    amt,
    customerPays: 0,
    merchantPays,
    rate,
    cap,
    heroLabel,
    headline,
    explainer,
    payerLine,
    /*
     * Only winkable where the floor is real. NPCI states it for the ordinary
     * P2M rate; it states no floor for capital markets, and for P2P and small
     * merchants nothing is charged at any amount, so the line would imply a
     * cliff that is not there.
     */
    wink:
      amt === MDR_THRESHOLD && (effectiveKind === "big" || effectiveKind === "fuel")
        ? `${inr(MDR_THRESHOLD)} exactly is still "up to ${inr(MDR_THRESHOLD)}". Zero.`
        : null,
    categoryLabel: CATEGORY_LABEL[effectiveKind],
    shortCategory: SHORT_CATEGORY[effectiveKind],
    notes,
    passThrough: merchantPays > 0 ? merchantPays : null,
    passThroughWithGst: merchantPays > 0 ? merchantPays * (1 + GST_ON_MDR) : null,
    receipt: {
      amount: inr(amt),
      category: CATEGORY_LABEL[effectiveKind],
      mdrRate,
      merchantPays: receiptMerchantPays ?? inr(merchantPays),
      // GST applies to the fee, so the merchant's real outlay is higher.
      merchantTotal: merchantPays > 0 ? inr(merchantPays * (1 + GST_ON_MDR)) : undefined,
      youPay: inr(0),
      effective: EFFECTIVE_DATE_LABEL,
    },
  };
}

/* ------------------------------------------------------------------ */
/* the calendar                                                        */
/* ------------------------------------------------------------------ */

/**
 * "Today" in IST. The audience and the rule are both Indian, so a server in
 * UTC must not tell someone in Mumbai the countdown is a day longer.
 */
function istMidnight(now: Date): number {
  const ist = new Date(now.getTime() + 5.5 * 3_600_000);
  return Date.UTC(ist.getUTCFullYear(), ist.getUTCMonth(), ist.getUTCDate());
}

/** Whole days from today until MDR goes live. Zero or negative once it is live. */
/**
 * Today in IST, as YYYY-MM-DD.
 *
 * The share cards bake the countdown into pixels, and social proxies cache
 * those bytes on their own schedule regardless of Cache-Control. Putting the
 * date in the image URL makes each day's card a different URL, so a link
 * re-shared next month cannot unfurl with a stale day count.
 */
export function istDateKey(today: Date = new Date()): string {
  return new Date(istMidnight(today)).toISOString().slice(0, 10);
}

export function daysUntilEffective(today: Date = new Date()): number {
  return Math.round((Date.UTC(2026, 9, 15) - istMidnight(today)) / 86_400_000);
}

export function liveStatus(today: Date = new Date()): { live: boolean; label: string } {
  const days = daysUntilEffective(today);
  if (days <= 0) return { live: true, label: `MDR live since ${EFFECTIVE_DATE_LABEL}` };
  if (days === 1) return { live: false, label: "MDR starts tomorrow" };
  return { live: false, label: `MDR starts in ${days} days` };
}

/* ------------------------------------------------------------------ */
/* merchant side                                                       */
/* ------------------------------------------------------------------ */

export type MerchantOutlook = {
  status: "P2PM" | "P2M";
  /**
   * What the pill says. Crossing the line once does not reclassify anyone, so
   * an over-the-line shop is on the way to P2M, not already there.
   */
  statusPill: string;
  /** True when every fee below is conditional on the 3-month rule. */
  conditional: boolean;
  statusLabel: string;
  /** Months of sustained inflow reclassification needs. Null while still P2PM. */
  monthsToReclassification: number | null;
  /** Estimated bills above the threshold, at the stated average size. */
  billsPerMonth: number;
  /** The rupee value flowing through bills above the threshold. */
  qualifyingValue: number;
  /** Roughly how many bills that value is spread across. */
  qualifyingBills: number;
  /** The average size assumed for a qualifying bill. */
  qualifyingBillSize: number;
  monthlyMdr: number;
  /** 18% GST charged on the MDR itself. */
  monthlyGst: number;
  /** What actually leaves the account: MDR plus GST. */
  monthlyTotal: number;
  cardsMonthlyCost: number;
  /** Room left under the P2PM line, in rupees. Zero once over it. */
  headroom: number;
  /** Inflow as a share of the P2PM line, clamped to 1 for the meter. */
  inflowRatio: number;
  /** What staying on UPI saves against credit cards, GST included on both. */
  savingVsCards: number;
  /** How many times more credit cards would cost. Null when UPI costs nothing. */
  cardsMultiple: number | null;
  /** Share of revenue prices would have to rise by to cover the fee. */
  priceRiseShare: number;
  /** The same thing as rupees on one average bill. */
  perBillRecovery: number;
  note: string;
};

/**
 * Indicative credit card MDR, for comparison only. RuPay debit carries zero
 * MDR, so this is deliberately not presented as "cards" in general.
 */
export const CARD_MDR_RATE = 0.015;

export function merchantOutlook(
  monthlyInflow: number,
  avgBill: number,
  kind: Exclude<Kind, "na">,
  /**
   * Share of monthly inflow that arrives through bills above the threshold,
   * as a fraction. This is the only thing that actually drives MDR, and no
   * average bill size can imply it, so the caller supplies it.
   */
  shareAboveThreshold: number,
): MerchantOutlook {
  const inflow = Math.max(0, monthlyInflow);
  const bill = Math.max(0, avgBill);
  const share = Math.min(1, Math.max(0, shareAboveThreshold));

  // Up to the limit is still P2PM. Only MORE than it starts the 3-month clock.
  const isSmall = inflow <= P2PM_MONTHLY_LIMIT;

  const qualifyingValue = inflow * share;

  /*
   * `bill` is the average of the bills ABOVE the threshold, not of all bills.
   * Asking for a blended average made the three inputs over-determined: a
   * 3,500 average with 40% above 2,000 implied the remaining money arrived in
   * bills of 3,571 that were somehow also under 2,000. Modelling only the
   * qualifying bills removes the contradiction.
   */
  const statedBillSize = Math.max(bill, MDR_THRESHOLD + 1);
  /*
   * Two more things the count has to respect. A qualifying bill cannot be
   * bigger than all the qualifying money there is, and rounding the count UP
   * invented money: 7,500 of qualifying value at 3,000 a bill is two bills
   * plus a 1,500 tail that is itself below the threshold, not three bills of
   * 3,000. Below the threshold no bill qualifies at all.
   */
  const qualifyingBillSize =
    qualifyingValue > 0 ? Math.min(statedBillSize, qualifyingValue) : statedBillSize;
  const billsPerMonth =
    qualifyingValue > MDR_THRESHOLD ? Math.floor(qualifyingValue / qualifyingBillSize) : 0;
  const qualifyingBills = billsPerMonth;

  /*
   * A percentage rate applies to the qualifying VALUE, so it is computed on the
   * value directly. Multiplying a rounded bill count by a per-bill fee would
   * drag the answer off by a percent or two. The count is only used where it
   * genuinely drives the fee: a flat per-transaction charge, or a capped rate.
   */
  const perBillVerdict = computeVerdict("shop", kind, qualifyingBillSize);
  const capBinds =
    perBillVerdict.rate !== null &&
    perBillVerdict.cap !== null &&
    perBillVerdict.rate * qualifyingBillSize > perBillVerdict.cap;

  let monthlyMdr: number;
  if (isSmall || qualifyingValue <= 0) {
    monthlyMdr = 0;
  } else if (perBillVerdict.rate === null) {
    // Flat fee per qualifying transaction.
    monthlyMdr = perBillVerdict.merchantPays * qualifyingBills;
  } else if (capBinds) {
    /*
     * Rounding the bill count here threw away the remainder: a month of
     * 2,50,000 in 1,00,000 bills is two capped bills plus a 50,000 one, not
     * three capped bills. Count whole bills, then charge what is left over.
     */
    const cappedBills = Math.floor(qualifyingValue / qualifyingBillSize);
    const remainder = qualifyingValue - cappedBills * qualifyingBillSize;
    const capValue = perBillVerdict.cap as number;
    monthlyMdr =
      cappedBills * capValue + Math.min(remainder * (perBillVerdict.rate as number), capValue);
  } else {
    monthlyMdr = perBillVerdict.rate * qualifyingValue;
  }
  const monthlyGst = monthlyMdr * GST_ON_MDR;
  const monthlyTotal = monthlyMdr + monthlyGst;
  const cardsMonthlyCost = inflow * CARD_MDR_RATE * (1 + GST_ON_MDR);

  let note: string;
  if (isSmall) {
    note = `You pay nothing. Reclassification only happens after ${RECLASSIFY_MONTHS} consecutive months of MORE than ${inr(P2PM_MONTHLY_LIMIT)} inward UPI.`;
  } else if (share <= 0) {
    note = `Even once you are reclassified, nothing arrives through bills above ${inr(MDR_THRESHOLD)}, so no MDR applies. It starts only on the money that does.`;
  } else {
    note = `This bites only after ${RECLASSIFY_MONTHS} straight months over the line. MDR is expected to carry ${pct(GST_ON_MDR)} GST on top, and a GST-registered merchant can claim that back as input tax credit, so the real cost is closer to the MDR alone.`;
  }

  return {
    status: isSmall ? "P2PM" : "P2M",
    statusPill: isSmall ? "P2PM" : `P2M after ${RECLASSIFY_MONTHS} months`,
    conditional: !isSmall,
    statusLabel: isSmall
      ? `Small merchant (P2PM). Within the ${inr(P2PM_MONTHLY_LIMIT)} a month line.`
      : `Over the ${inr(P2PM_MONTHLY_LIMIT)} a month line. P2M applies once you have been above it for ${RECLASSIFY_MONTHS} consecutive months.`,
    monthsToReclassification: isSmall ? null : RECLASSIFY_MONTHS,
    billsPerMonth,
    qualifyingValue,
    qualifyingBills,
    qualifyingBillSize,
    monthlyMdr,
    monthlyGst,
    monthlyTotal,
    cardsMonthlyCost,
    headroom: Math.max(0, P2PM_MONTHLY_LIMIT - inflow),
    inflowRatio: P2PM_MONTHLY_LIMIT > 0 ? Math.min(1, inflow / P2PM_MONTHLY_LIMIT) : 0,
    priceRiseShare: inflow > 0 ? monthlyTotal / inflow : 0,
    perBillRecovery: inflow > 0 ? (monthlyTotal / inflow) * qualifyingBillSize : 0,
    savingVsCards: Math.max(0, cardsMonthlyCost - monthlyTotal),
    cardsMultiple: monthlyTotal > 0 ? cardsMonthlyCost / monthlyTotal : null,
    note,
  };
}
