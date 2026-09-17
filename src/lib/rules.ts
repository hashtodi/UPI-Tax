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
/** GST charged on the MDR itself. The merchant pays this on top of the fee. */
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
  /** Present only when a fee applies: the fee plus 18% GST on it. */
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
  const digits = String(raw).replace(/\D/g, "");
  return digits ? groupIndian(digits) : "";
}

/** Indian grouping for a plain count, with no rupee sign. */
export function countIndian(value: number): string {
  return groupIndian(String(Math.round(Math.abs(value))));
}

/** Formats a rupee figure. Shows paise only when there are paise. */
export function inr(value: number): string {
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

export function parseAmount(value: string | number | undefined): number {
  const text = String(value ?? "");
  // A minus anywhere means the input is junk, not a small negative payment.
  const raw = typeof value === "number" ? value : text.includes("-") ? NaN : Number(text.replace(/[^\d.]/g, ""));
  if (!Number.isFinite(raw) || raw <= 0) return 0;
  // A crore is plenty. Keeps the OG card and the URL sane.
  return Math.min(Math.round(raw * 100) / 100, 10_000_000);
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
  "Set up as a UPI AutoPay mandate instead, the same payment carries no MDR at all.";

export function computeVerdict(who: Who, kind: Kind, amt: number): Verdict {
  const effectiveKind: Kind = who === "person" ? "na" : kind;
  const aboveThreshold = amt > MDR_THRESHOLD;

  let merchantPays = 0;
  let rate: number | null = null;
  let cap: number | null = null;
  const notes: string[] = [];
  let headline: string;
  let explainer: string;
  let payerLine: string;
  let mdrRate: string;

  switch (effectiveKind) {
    case "na":
      headline = "No. Your landlord still gets every rupee.";
      explainer = "Person-to-person UPI stays free at any amount. Nobody pays anything.";
      payerLine = "Nobody. This is a person-to-person payment.";
      mdrRate = "Not applicable";
      break;

    case "small":
      headline = "No. And neither does the chaiwala.";
      explainer =
        "Shops receiving up to ₹1 lakh a month on UPI pay zero MDR, even on big bills.";
      payerLine = "Nobody. This shop is within the ₹1 lakh a month line.";
      mdrRate = "0% (exempt)";
      break;

    case "fuel":
      if (aboveThreshold) {
        merchantPays = FLAT_SECTOR_MDR;
        headline = `No. The company pays a flat ${inr(FLAT_SECTOR_MDR)}.`;
        explainer = `These sectors have a special ${inr(FLAT_SECTOR_MDR)} flat MDR instead of ${pct(P2M_RATE)}.`;
        payerLine = `The company pays ${inr(FLAT_SECTOR_MDR)} flat, or ${inr(FLAT_SECTOR_MDR * (1 + GST_ON_MDR))} once ${pct(GST_ON_MDR)} GST is added`;
        mdrRate = `${inr(FLAT_SECTOR_MDR)} flat above ${inr(MDR_THRESHOLD)}`;
        notes.push(
          "NPCI names railways, telecom, insurance and fuel “among others”, and puts electricity, water and piped gas on the same flat fee. The list is not closed.",
          AUTOPAY_NOTE,
        );
      } else {
        headline = `No. Nobody does. Under ${inr(MDR_THRESHOLD)} is untouched.`;
        explainer = `MDR only applies above ${inr(MDR_THRESHOLD)}, and only to the merchant.`;
        payerLine = `Nobody. ${inr(MDR_THRESHOLD)} and under carries no MDR.`;
        mdrRate = `${inr(FLAT_SECTOR_MDR)} flat above ${inr(MDR_THRESHOLD)}`;
      }
      break;

    case "capital":
      if (aboveThreshold) {
        rate = CAPITAL_RATE;
        cap = MDR_CAP;
        merchantPays = Math.min(amt * CAPITAL_RATE, MDR_CAP);
        headline = `No. Your broker pays ${inr(merchantPays)}.`;
        explainer = `Capital market payments carry ${pct(CAPITAL_RATE)} MDR, capped at ${inr(MDR_CAP)}. Not your problem.`;
        payerLine = `Your broker pays ${inr(merchantPays)}, or ${inr(merchantPays * (1 + GST_ON_MDR))} once ${pct(GST_ON_MDR)} GST is added`;
        mdrRate = `${pct(CAPITAL_RATE)}, capped at ${inr(MDR_CAP)}`;
        notes.push(
          `NPCI's FAQ sets ${pct(CAPITAL_RATE)} capped at ${inr(MDR_CAP)} for capital markets but does not state a ${inr(MDR_THRESHOLD)} floor for this category. The threshold here follows press reporting.`,
          AUTOPAY_NOTE,
        );
      } else {
        headline = "No. Whatever your broker pays, it is not you.";
        explainer = `Capital market payments carry ${pct(CAPITAL_RATE)} MDR, capped at ${inr(MDR_CAP)}, and it sits with the broker either way.`;
        payerLine = "Your broker, if anything. Never you.";
        mdrRate = `${pct(CAPITAL_RATE)}, capped at ${inr(MDR_CAP)}`;
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
        headline = `No. The store pays ${inr(merchantPays)}. You pay the price on the tag.`;
        explainer = `${pct(P2M_RATE)} MDR, capped at ${inr(MDR_CAP)}, charged to the merchant by their bank. They are not allowed to add it to your bill.`;
        payerLine = `The store pays ${inr(merchantPays)}, or ${inr(merchantPays * (1 + GST_ON_MDR))} once ${pct(GST_ON_MDR)} GST is added`;
        mdrRate = `${pct(P2M_RATE)}, capped at ${inr(MDR_CAP)}`;
        notes.push(AUTOPAY_NOTE);
      } else {
        headline = `No. Nobody does. Under ${inr(MDR_THRESHOLD)} is untouched.`;
        explainer = `MDR only applies above ${inr(MDR_THRESHOLD)}, and only to the merchant.`;
        payerLine = `Nobody. ${inr(MDR_THRESHOLD)} and under carries no MDR.`;
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
    headline,
    explainer,
    payerLine,
    wink:
      amt === MDR_THRESHOLD
        ? `${inr(MDR_THRESHOLD)} exactly is still "up to ${inr(MDR_THRESHOLD)}". Zero.`
        : null,
    categoryLabel: CATEGORY_LABEL[effectiveKind],
    shortCategory: SHORT_CATEGORY[effectiveKind],
    notes,
    receipt: {
      amount: inr(amt),
      category: CATEGORY_LABEL[effectiveKind],
      mdrRate,
      merchantPays: inr(merchantPays),
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
  statusLabel: string;
  /** Months of sustained inflow before reclassification, null once already P2M. */
  monthsToReclassification: number | null;
  /** Estimated bills in a month, at the stated average size. */
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

  const billsPerMonth = bill > 0 ? Math.floor(inflow / bill) : 0;
  const qualifyingValue = inflow * share;

  /*
   * A qualifying bill is above the threshold by definition, so its average
   * cannot be below it. Where the stated average is smaller, the threshold
   * itself is the floor.
   */
  const qualifyingBillSize = Math.max(bill, MDR_THRESHOLD + 1);
  const qualifyingBills =
    qualifyingValue > 0 ? Math.round(qualifyingValue / qualifyingBillSize) : 0;

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
    perBillVerdict.rate * qualifyingBillSize >= perBillVerdict.cap;

  let monthlyMdr: number;
  if (isSmall || qualifyingValue <= 0) {
    monthlyMdr = 0;
  } else if (perBillVerdict.rate === null) {
    // Flat fee per qualifying transaction.
    monthlyMdr = perBillVerdict.merchantPays * qualifyingBills;
  } else if (capBinds) {
    monthlyMdr = (perBillVerdict.cap as number) * qualifyingBills;
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
    note = `You are P2M, but nothing arrives through bills above ${inr(MDR_THRESHOLD)}, so no MDR applies. It starts only on the money that does.`;
  } else {
    note = `MDR carries ${pct(GST_ON_MDR)} GST on top. A GST-registered merchant can claim that back as input tax credit, so the real cost is closer to the MDR alone.`;
  }

  return {
    status: isSmall ? "P2PM" : "P2M",
    statusLabel: isSmall
      ? `Small merchant (P2PM). Within the ${inr(P2PM_MONTHLY_LIMIT)} a month line.`
      : `Large merchant (P2M). Over the ${inr(P2PM_MONTHLY_LIMIT)} a month line.`,
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
    savingVsCards: Math.max(0, cardsMonthlyCost - monthlyTotal),
    cardsMultiple: monthlyTotal > 0 ? cardsMonthlyCost / monthlyTotal : null,
    note,
  };
}
