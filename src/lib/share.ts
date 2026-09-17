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

/** Pre-written post text. Kept under 240 characters so the link survives. */
export function shareText(v: Verdict): string {
  const url = resultUrl(v.who, v.kind, v.amt);
  const amount = inr(v.amt);
  const tail = `Check yours: ${url} ${X_HANDLE}`;

  switch (v.kind) {
    case "na":
      return `Paid ${amount} to a friend on UPI. "UPI tax" charged: ₹0. Turns out P2P is free at any amount. ${tail}`;
    case "small":
      return `Paid ${amount} at a kirana store on UPI. Charge to me: ₹0. Charge to the shop: ₹0. Small merchants are exempt. ${tail}`;
    case "fuel":
      return v.merchantPays > 0
        ? `Paid ${amount} for fuel on UPI. My charge: ₹0. The company's charge: ${inr(v.merchantPays)} flat. That is the whole "UPI tax". ${tail}`
        : `Paid ${amount} for fuel on UPI. Charge to me: ₹0. Charge to them: ₹0. MDR only starts above ₹2,000. ${tail}`;
    case "capital":
      return v.merchantPays > 0
        ? `Invested ${amount} over UPI. My charge: ₹0. My broker's charge: ${inr(v.merchantPays)} at 0.02%. Not 0.4%, and not mine. ${tail}`
        : `Invested ${amount} over UPI. Charge to me: ₹0. Charge to my broker: ₹0. MDR only starts above ₹2,000. ${tail}`;
    case "big":
    default:
      return v.merchantPays > 0
        ? `Paid ${amount} at a store on UPI. My charge: ₹0. Store's charge: ${inr(v.merchantPays)}. That is the whole "UPI tax". ${tail}`
        : `Paid ${amount} at a store on UPI. Charge to me: ₹0. Charge to the store: ₹0. MDR only starts above ₹2,000. ${tail}`;
  }
}

export function xIntent(text: string): string {
  return `https://x.com/intent/post?text=${encodeURIComponent(text)}`;
}

export function mythShareText(myth: string, fact: string): string {
  return `Myth: ${myth}\nFact: ${fact}\n\nThe "UPI tax" explained in 3 taps: ${SITE_URL} ${X_HANDLE}`;
}
