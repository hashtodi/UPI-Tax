import { expect, test } from "bun:test";
import {
  computeVerdict,
  countIndian,
  groupDigits,
  daysUntilEffective,
  inr,
  liveStatus,
  merchantOutlook,
  parseAmount,
  parseKind,
} from "./rules";

test("P2P is free at any amount", () => {
  expect(computeVerdict("person", "na", 500).merchantPays).toBe(0);
  expect(computeVerdict("person", "na", 250_000).merchantPays).toBe(0);
  expect(computeVerdict("person", "na", 250_000).customerPays).toBe(0);
});

test("small merchant pays nothing even on a big bill", () => {
  const v = computeVerdict("shop", "small", 9_000);
  expect(v.merchantPays).toBe(0);
  expect(v.customerPays).toBe(0);
});

test("large merchant at or under the threshold pays nothing", () => {
  expect(computeVerdict("shop", "big", 1_999).merchantPays).toBe(0);
  // The boundary: 2000 exactly is still "up to 2000".
  expect(computeVerdict("shop", "big", 2_000).merchantPays).toBe(0);
  expect(computeVerdict("shop", "big", 2_000).wink).toContain("Zero");
});

test("large merchant just above the threshold pays 0.4%", () => {
  expect(computeVerdict("shop", "big", 2_001).merchantPays).toBeCloseTo(8.004, 3);
  expect(computeVerdict("shop", "big", 2_800).merchantPays).toBeCloseTo(11.2, 3);
});

test("0.4% caps at 300, reached at 75,000", () => {
  expect(computeVerdict("shop", "big", 75_000).merchantPays).toBe(300);
  expect(computeVerdict("shop", "big", 5_00_000).merchantPays).toBe(300);
});

test("fuel, telecom, insurance and rail pay a flat 5 above the threshold", () => {
  expect(computeVerdict("shop", "fuel", 2_000).merchantPays).toBe(0);
  expect(computeVerdict("shop", "fuel", 3_000).merchantPays).toBe(5);
  expect(computeVerdict("shop", "fuel", 90_000).merchantPays).toBe(5);
});

test("capital markets pay 0.02% capped at 300", () => {
  expect(computeVerdict("shop", "capital", 50_000).merchantPays).toBeCloseTo(10, 6);
  expect(computeVerdict("shop", "capital", 20_00_000).merchantPays).toBe(300);
});

test("the customer pays zero in every single branch", () => {
  const cases = [
    computeVerdict("person", "na", 100_000),
    computeVerdict("shop", "small", 9_000),
    computeVerdict("shop", "big", 1_500),
    computeVerdict("shop", "big", 80_000),
    computeVerdict("shop", "fuel", 4_000),
    computeVerdict("shop", "capital", 1_00_000),
  ];
  for (const v of cases) {
    expect(v.customerPays).toBe(0);
    expect(v.receipt.youPay).toBe("₹0");
  }
});

test("rupees format with Indian grouping", () => {
  expect(inr(0)).toBe("₹0");
  expect(inr(11.2)).toBe("₹11.20");
  expect(inr(2_000)).toBe("₹2,000");
  expect(inr(1_00_000)).toBe("₹1,00,000");
  expect(inr(12_34_567)).toBe("₹12,34,567");
});

test("the countdown tracks 15 Oct 2026", () => {
  expect(daysUntilEffective(new Date("2026-09-17T00:00:00Z"))).toBe(28);
  expect(liveStatus(new Date("2026-09-17T00:00:00Z")).live).toBe(false);
  expect(liveStatus(new Date("2026-10-15T00:00:00Z")).live).toBe(true);
  expect(liveStatus(new Date("2026-12-01T00:00:00Z")).label).toContain("live since");
});

test("bad URL segments fall back instead of throwing", () => {
  expect(parseKind("nonsense", "shop")).toBe("big");
  expect(parseKind("small", "person")).toBe("na");
  expect(parseAmount("2,800")).toBe(2_800);
  expect(parseAmount("-5")).toBe(0);
  expect(parseAmount(undefined)).toBe(0);
});

test("merchant outlook separates small shops from large ones", () => {
  const small = merchantOutlook(60_000, 800, "big", 0.5);
  expect(small.status).toBe("P2PM");
  expect(small.monthlyMdr).toBe(0);
  expect(small.monthsToReclassification).toBeNull();

  const large = merchantOutlook(4_00_000, 2_500, "big", 0.5);
  expect(large.status).toBe("P2M");
  expect(large.monthlyMdr).toBeGreaterThan(0);
  expect(large.cardsMonthlyCost).toBeGreaterThan(large.monthlyMdr);
});

/* ---------------------------------------------------------------------- */
/* Corrections made after checking the NPCI FAQ of 15 September 2026.      */
/* ---------------------------------------------------------------------- */

test("the capital markets cap binds at 15 lakh, not at 75,000", () => {
  // 0.02% of 75,000 is 15, nowhere near the cap that binds the 0.4% rate.
  expect(computeVerdict("shop", "capital", 75_000).merchantPays).toBeCloseTo(15, 6);
  expect(computeVerdict("shop", "capital", 15_00_000).merchantPays).toBe(300);
  expect(computeVerdict("shop", "capital", 14_00_000).merchantPays).toBeCloseTo(280, 6);
});

test("a merchant at exactly 1 lakh a month is still P2PM", () => {
  // The FAQ reclassifies on MORE than 1 lakh, so the boundary itself is exempt.
  expect(merchantOutlook(1_00_000, 3_000, "big", 0.5).status).toBe("P2PM");
  expect(merchantOutlook(1_00_000, 3_000, "big", 0.5).monthlyMdr).toBe(0);
  expect(merchantOutlook(1_00_001, 3_000, "big", 0.5).status).toBe("P2M");
});

test("18% GST rides on top of the MDR", () => {
  const v = computeVerdict("shop", "big", 3_000);
  expect(v.merchantPays).toBeCloseTo(12, 6);
  // 12 + 18% = 14.16, the figure the NPCI-aligned reporting gives.
  expect(v.receipt.merchantTotal).toBe("₹14.16");

  const out = merchantOutlook(4_00_000, 3_000, "big", 0.5);
  expect(out.monthlyGst).toBeCloseTo(out.monthlyMdr * 0.18, 6);
  expect(out.monthlyTotal).toBeCloseTo(out.monthlyMdr * 1.18, 6);
});

test("no GST line is shown when no fee applies", () => {
  expect(computeVerdict("person", "na", 50_000).receipt.merchantTotal).toBeUndefined();
  expect(computeVerdict("shop", "small", 9_000).receipt.merchantTotal).toBeUndefined();
  expect(computeVerdict("shop", "big", 2_000).receipt.merchantTotal).toBeUndefined();
});

test("caveats are attached where the source is open-ended", () => {
  // NPCI says "among others", so the flat-fee list must not read as closed.
  expect(computeVerdict("shop", "fuel", 3_000).notes.join(" ")).toContain("among others");
  // The FAQ states no floor for capital markets.
  expect(computeVerdict("shop", "capital", 50_000).notes.join(" ")).toContain("does not state");
  // Mandates are exempt outright.
  expect(computeVerdict("shop", "big", 5_000).notes.join(" ")).toContain("AutoPay");
  // Nothing to caveat when nobody pays anything.
  expect(computeVerdict("person", "na", 5_000).notes).toHaveLength(0);
});

test("the 3,000 rupee example matches the NPCI FAQ table", () => {
  // FAQ Q35 lists 3,000 -> 12 and 50,000 -> 200, with 75,000 and above at 300.
  expect(computeVerdict("shop", "big", 3_000).merchantPays).toBeCloseTo(12, 6);
  expect(computeVerdict("shop", "big", 50_000).merchantPays).toBeCloseTo(200, 6);
  expect(computeVerdict("shop", "big", 75_000).merchantPays).toBe(300);
});

test("merchant outlook derives the meter and comparison values", () => {
  const small = merchantOutlook(60_000, 800, "big", 0.5);
  expect(small.headroom).toBe(40_000);
  expect(small.inflowRatio).toBeCloseTo(0.6, 6);
  // Nothing to divide by when UPI is free, so no multiple is offered.
  expect(small.cardsMultiple).toBeNull();
  expect(small.savingVsCards).toBeCloseTo(small.cardsMonthlyCost, 6);

  const large = merchantOutlook(4_00_000, 3_000, "big", 0.5);
  expect(large.headroom).toBe(0);
  expect(large.inflowRatio).toBe(1);
  expect(large.cardsMultiple).toBeGreaterThan(1);
  expect(large.savingVsCards).toBeCloseTo(large.cardsMonthlyCost - large.monthlyTotal, 6);
});

test("MDR follows the share above the threshold, not the average bill", () => {
  // Same inflow and same average bill, different mix of bill sizes.
  const none = merchantOutlook(4_00_000, 2_500, "big", 0);
  const half = merchantOutlook(4_00_000, 2_500, "big", 0.5);
  const all = merchantOutlook(4_00_000, 2_500, "big", 1);

  expect(none.monthlyMdr).toBe(0);
  expect(half.monthlyMdr).toBeGreaterThan(0);
  // 0.4% of the qualifying money, so doubling the share doubles the fee.
  expect(all.monthlyMdr).toBeCloseTo(half.monthlyMdr * 2, 4);
  expect(all.monthlyMdr).toBeCloseTo(4_00_000 * 0.004, 0);
});

test("qualifying bills cannot average below the threshold", () => {
  // A 350 rupee average shop still has SOME large bills; those large bills
  // cannot themselves average 350.
  const o = merchantOutlook(4_00_000, 350, "big", 0.2);
  expect(o.qualifyingBillSize).toBeGreaterThan(2_000);
  expect(o.qualifyingValue).toBeCloseTo(80_000, 6);
});

test("the per-transaction cap still binds on very large bills", () => {
  // 1,00,000 a bill: 0.4% would be 400, so the 300 cap takes over.
  const o = merchantOutlook(10_00_000, 1_00_000, "big", 1);
  expect(o.qualifyingBills).toBe(10);
  expect(o.monthlyMdr).toBe(3_000);
});

test("a percentage rate applies to the qualifying value exactly", () => {
  // 40% of 2,50,000 is 1,00,000 qualifying, and 0.4% of that is exactly 400.
  const o = merchantOutlook(2_50_000, 3_500, "big", 0.4);
  expect(o.qualifyingValue).toBeCloseTo(1_00_000, 6);
  expect(o.monthlyMdr).toBeCloseTo(400, 6);

  // Capital markets on the same money: 0.02% of 1,00,000 is 20.
  const c = merchantOutlook(2_50_000, 3_500, "capital", 0.4);
  expect(c.monthlyMdr).toBeCloseTo(20, 6);
});

test("flat-fee sectors are charged per qualifying transaction", () => {
  // 1,00,000 of qualifying money at 5,000 a bill is 20 bills at 5 rupees each.
  const o = merchantOutlook(2_50_000, 5_000, "fuel", 0.4);
  expect(o.qualifyingBills).toBe(20);
  expect(o.monthlyMdr).toBe(100);
});

test("live input grouping follows the Indian system", () => {
  expect(groupDigits("")).toBe("");
  expect(groupDigits("5")).toBe("5");
  expect(groupDigits("500")).toBe("500");
  expect(groupDigits("2800")).toBe("2,800");
  expect(groupDigits("250000")).toBe("2,50,000");
  expect(groupDigits("1500000")).toBe("15,00,000");
  expect(groupDigits("12345678")).toBe("1,23,45,678");
  // Re-grouping already-grouped text must be stable, since the field round-trips.
  expect(groupDigits("2,50,000")).toBe("2,50,000");
});

test("counts group without a rupee sign", () => {
  expect(countIndian(71)).toBe("71");
  expect(countIndian(12_431)).toBe("12,431");
  expect(countIndian(2_50_000)).toBe("2,50,000");
});
