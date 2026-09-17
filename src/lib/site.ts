export const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "") ?? "https://upitax.vercel.app";

export const X_HANDLE = "@harshtodi";
export const X_URL = "https://x.com/harshtodi";
export const AUTHOR = "Harsh Todi";

/** Bump this whenever the rules are re-checked against the primary sources. */
export const LAST_VERIFIED = "17 September 2026";

export const DISCLAIMER =
  "Based on NPCI's UPI MDR FAQ, 15 September 2026. Made for clarity, not legal advice.";

/**
 * The framework is being challenged in the Supreme Court, so the app should not
 * present it as settled law.
 */
export const LITIGATION_NOTE =
  "This framework is as announced and is subject to a pending challenge in the Supreme Court.";

export const SOURCES = [
  {
    label:
      "NPCI: Merchant Discount Rate (MDR) on Select UPI (P2M) Transactions, FAQs, 15 September 2026",
    href: "https://www.npci.org.in/uploads/FA_Qs_Merchant_Discount_Rate_MDR_on_Select_UPI_P2_M_Transactions_58dba1d39e.pdf",
  },
  {
    label:
      "Ministry of Finance (PIB), 15 September 2026: UPI continues to remain free for peer to peer transactions and 96% of merchant transactions",
    href: "https://www.pib.gov.in/PressReleasePage.aspx?PRID=2310586&reg=48&lang=2",
  },
  {
    label:
      'Business Standard, 16 September 2026: "No question of rethinking 0.4% UPI MDR above ₹2,000"',
    href: "https://www.business-standard.com/finance/news/no-question-of-rethinking-0-4-upi-mdr-above-2-000-govt-official-126091601079_1.html",
  },
  {
    label: "Business Today, 15 September 2026: small merchants stay exempt above ₹2,000",
    href: "https://www.businesstoday.in/personal-finance/news/story/small-merchants-will-not-come-under-upi-mdr-even-above-rs2000-if-they-meet-this-condition-check-details-555727-2026-09-15",
  },
  {
    label: "Business Standard, 16 September 2026: UPI MDR attracts 18% GST, merchants can claim ITC",
    href: "https://www.business-standard.com/finance/news/upi-mdr-to-attract-18-gst-registered-biz-can-claim-input-tax-credit-126091601348_1.html",
  },
];

export const MYTHS = [
  {
    myth: "You will pay ₹8 on every ₹2,000 UPI payment.",
    fact: "Customers pay ₹0. Always. MDR applies only above ₹2,000, and only to the merchant.",
  },
  {
    // 18% GST is real, but it lands on the merchant's fee, not on your payment.
    myth: "There is 18% GST on your UPI payment above ₹2,000.",
    fact:
      "Not on your payment. The merchant pays 0.4% MDR and 18% GST on that fee, which a registered merchant can claim back.",
  },
  {
    myth: "Your kirana store will now charge you extra.",
    fact:
      "Small merchants (up to ₹1 lakh a month on UPI) pay zero MDR, and passing it on is not allowed for anyone.",
  },
  {
    myth: "Split your payment into ₹1,999 chunks to save money.",
    fact: "You were never going to pay. Splitting saves you nothing.",
  },
];
