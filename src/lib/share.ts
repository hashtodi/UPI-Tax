import { inr, type Verdict } from "./rules";
import { SITE_URL, X_HANDLE } from "./site";

export function resultPath(who: string, kind: string, amt: number): string {
  return `/r/${who}/${kind}/${Math.round(amt)}`;
}

export function resultUrl(who: string, kind: string, amt: number): string {
  return `${SITE_URL}${resultPath(who, kind, amt)}`;
}

/**
 * `wide` is the 1200x630 link preview that X and LinkedIn unfurl.
 * `tall` is the 1080x1350 image people download and post to a feed or status.
 */
export function cardPath(
  who: string,
  kind: string,
  amt: number,
  format: "wide" | "tall" = "wide",
): string {
  const tall = format === "tall" ? "&format=tall" : "";
  return `/api/card?who=${who}&kind=${kind}&amt=${Math.round(amt)}${tall}`;
}

/**
 * Pre-written post text, under 240 characters so the link survives.
 *
 * Two rules here, because this is the copy people actually paste and nobody
 * screenshots the caveats on the page: state the same figure the page shows,
 * and never present the expected GST as if NPCI had stated it.
 */
export function shareText(v: Verdict): string {
  const url = resultUrl(v.who, v.kind, v.amt);
  const amount = inr(v.amt);
  const tail = `Check yours: ${url} ${X_HANDLE}`;
  const cost = inr(v.passThroughWithGst ?? 0);

  switch (v.kind) {
    case "na":
      return `Paid ${amount} to a friend on UPI. Charged to me: \u20B90. P2P is free at any amount. ${tail}`;
    case "small":
      return `Paid ${amount} at a kirana store on UPI. Charged to me: \u20B90. Charged to the shop: \u20B90. Small merchants are exempt. ${tail}`;
    case "fuel":
      return v.passThrough !== null
        ? `Paid ${amount} for fuel on UPI. Charged to me: \u20B90. Costs them ${cost} with expected GST. Guess where it goes. ${tail}`
        : `Paid ${amount} for fuel on UPI. Charged to me: \u20B90. The fee only starts above \u20B92,000. ${tail}`;
    case "capital":
      return v.passThrough !== null
        ? `Invested ${amount} over UPI. Charged to me: \u20B90. Costs my broker ${cost} with expected GST. Not 0.4%, and not mine. ${tail}`
        : `Invested ${amount} over UPI. Charged to me: \u20B90. Whatever my broker pays, it is not added to my trade. ${tail}`;
    case "big":
    default:
      return v.passThrough !== null
        ? `Paid ${amount} at a store on UPI. Charged to me: \u20B90. Costs the shop ${cost} with expected GST. Shops do not eat costs. ${tail}`
        : `Paid ${amount} at a store on UPI. Charged to me: \u20B90. Charged to the shop: \u20B90. The fee only starts above \u20B92,000. ${tail}`;
  }
}

export function xIntent(text: string): string {
  return `https://x.com/intent/post?text=${encodeURIComponent(text)}`;
}

export function mythShareText(myth: string, fact: string): string {
  return `Myth: ${myth}\nFact: ${fact}\n\nThe "UPI tax" explained in 3 taps: ${SITE_URL} ${X_HANDLE}`;
}

/* ---------------------------------------------------------------------- */
/* The merchant side, shareable on the same terms as a verdict.            */
/* ---------------------------------------------------------------------- */

export type MerchantParams = {
  inflow: number;
  bill: number;
  /** Share of revenue from bills above the threshold, as a whole percentage. */
  share: number;
  sector: string;
};

function merchantQuery(p: MerchantParams): string {
  return `inflow=${Math.round(p.inflow)}&bill=${Math.round(p.bill)}&share=${Math.round(
    p.share,
  )}&sector=${p.sector}`;
}

export function merchantPath(p: MerchantParams): string {
  return `/merchant?${merchantQuery(p)}`;
}

export function merchantUrl(p: MerchantParams): string {
  return `${SITE_URL}${merchantPath(p)}`;
}

export function merchantCardPath(p: MerchantParams, format: "wide" | "tall" = "wide"): string {
  return `/api/card?view=merchant&${merchantQuery(p)}${format === "tall" ? "&format=tall" : ""}`;
}

export function merchantShareText(
  p: MerchantParams,
  monthlyTotal: number,
  status: string,
  priceRise: string,
): string {
  const url = merchantUrl(p);
  const tail = `Work out yours: ${url} ${X_HANDLE}`;
  const takes = `My shop takes ${inr(p.inflow)} a month on UPI.`;

  if (status === "P2PM") {
    return `${takes} New UPI fee: \u20B90. Small merchants are exempt. ${tail}`;
  }
  if (monthlyTotal <= 0) {
    return `${takes} Even reclassified as P2M, nothing arrives through bills above \u20B92,000, so the fee is \u20B90. ${tail}`;
  }
  /*
   * "Would cost", not "costs". One month over the line changes nothing; it
   * takes 3 straight months to be reclassified, and only then does this bite.
   */
  return `${takes} After 3 straight months over the line, the new fee would cost me about ${inr(
    monthlyTotal,
  )} a month with expected GST. Covering it means prices up ${priceRise}. ${tail}`;
}
