# UPI Tax?

A three-tap checker for the "UPI tax above ₹2,000" panic. The answer for the
customer is always ₹0. The app shows who actually pays, how much, and why.

Live: https://upitax.vercel.app

## The rules

All of it lives in one pure function, `computeVerdict(who, kind, amt)` in
`src/lib/rules.ts`. The pages, the share cards and the metadata all import it,
so the image and the HTML can never disagree.

| Case | Customer pays | Merchant pays |
| --- | --- | --- |
| Person to person (P2P) | ₹0 | ₹0, any amount |
| Small shop (P2PM, up to ₹1 lakh/month inward UPI) | ₹0 | ₹0, even on a ₹9,000 bill |
| Large merchant (P2M), ≤ ₹2,000 | ₹0 | ₹0 |
| Large merchant (P2M), > ₹2,000 | ₹0 | 0.4%, capped at ₹300 (cap binds at ₹75,000) |
| Concessional flat-fee sectors, > ₹2,000 | ₹0 | ₹5 flat |
| Capital markets | ₹0 | 0.02%, capped at ₹300 (cap binds at ₹15,00,000) |

The threshold is per transaction. Effective 15 October 2026, counted down in IST.

Details that are easy to get wrong, and that this app gets right:

- **"Above ₹2,000", not "₹2,000 and above."** A payment of exactly ₹2,000 carries
  nothing. FAQ Q35 lists ₹2,000 → ₹0 and ₹3,000 → ₹12.
- **18% GST rides on top of the MDR.** On a ₹3,000 bill the merchant's real cost
  is ₹12 + ₹2.16 = ₹14.16. A GST-registered merchant can claim it back as input
  tax credit; an unregistered one cannot.
- **UPI AutoPay mandates are exempt** (FAQ Q22). A mutual fund SIP running on
  AutoPay pays nothing, while the same purchase made one-off does not.
- **P2PM is "up to" ₹1 lakh a month.** Reclassification to P2M triggers only on
  *more than* ₹1 lakh for 3 consecutive months (FAQ Q29).
- **The flat-₹5 list is open.** NPCI names railways, telecom, insurance and fuel
  "among others", and separately puts electricity, water and piped gas on the
  same flat fee. It is never presented here as a closed list of four.
- **Capital markets have no stated floor.** FAQ Q37 gives 0.02% capped at ₹300
  with no ₹2,000 threshold; the threshold applied here follows press reporting
  and the app says so on the verdict.
- **Merchants may not pass MDR on** (FAQ Q34). No penalty schedule or complaint
  channel has been published, so the app does not claim one.
- **Credit-linked UPI sits outside this framework** (FAQ Q36). RuPay credit card
  on UPI and pre-sanctioned credit lines keep their own separate charges, which
  is why the app says "this MDR is not live yet" rather than "nothing is live".

The framework is under challenge in the Supreme Court, so the footer carries an
"as announced, subject to pending litigation" note and a last-verified date in
`src/lib/site.ts`. Bump `LAST_VERIFIED` whenever the rules are re-checked.

There is no publicly published NPCI operating circular number for this. Cite the
FAQ, the PIB release and the gazette notification, not a circular.

## Pages

| Route | What it is |
| --- | --- |
| `/` | The question and the three taps, sized to fit the first viewport on phone, tablet and laptop. Myth-versus-fact cards below the fold. |
| `/r/[who]/[kind]/[amt]` | A verdict, for example `/r/shop/big/2800`. Server rendered with its own OG metadata. |
| `/merchant` | The merchant calculator: P2PM or P2M, monthly MDR, the 18% GST on it, and how the total compares to credit cards. |
| `/api/card` | The share image. |
| `/api/count` | The shared counter. |

Nothing above the fold on the home page gives the answer away. The countdown,
the rates and the exemptions all live below it.

## Share mechanics

One route renders both images, from the same verdict data:

- **Wide, 1200x630** (default) is the link preview. Result pages set it through
  `generateMetadata`, so pasting a URL into X or LinkedIn unfurls a card showing
  that specific verdict rather than a generic banner.
- **Tall, 1080x1350** (`?format=tall`) is what the download button and the Web
  Share file use. 4:5 is the tallest ratio X shows uncropped, and it is the
  native size for a WhatsApp status.

The tall card is a direct translation of the verdict card on screen, so what
someone downloads is what they were just looking at. The share buttons sit
outside that card for the same reason.

Images are a pure function of the query string and are served
`public, immutable, max-age=31536000`. Nothing is stored; each variant renders
once and is then served from the CDN.

## Brand

The rupee mark in `src/lib/mark.ts` is the Geist ExtraBold glyph flattened to a
vector path. The nav logo, `icon.svg`, the Apple touch icon and the share card
all draw that one path, so the mark is identical everywhere and never waits on
a webfont.

## Stack

Next.js 16 (App Router, Turbopack) on Bun, TypeScript, Tailwind v4, `next/og`
for the share cards, Upstash Redis for the counter, Vercel Analytics. Phosphor
for icons. The success tick is the only hand-drawn SVG.

The Geist TTFs in `src/fonts` are read at request time by the card route;
`outputFileTracingIncludes` in `next.config.ts` traces them into the serverless
bundle.

## Develop

```bash
bun install
bun test        # 18 assertions over the rules table
bun run dev
bun run build   # type check and production build
```

The tests pin the things that are easy to break: the ₹2,000 boundary in both
directions, the ₹300 cap binding at ₹75,000 for P2M and at ₹15,00,000 for
capital markets, the ₹1 lakh P2PM boundary being inclusive, the 18% GST
arithmetic, the FAQ Q35 worked examples (₹3,000 → ₹12, ₹50,000 → ₹200), and that
the customer pays ₹0 in every branch.

## Environment

Copy `env.example` to `.env.local`. Only the counter needs anything; everything
else runs with no configuration.

| Variable | Purpose |
| --- | --- |
| `KV_REST_API_URL` / `KV_REST_API_TOKEN` | Upstash Redis, added through the Vercel Marketplace |
| `UPSTASH_REDIS_REST_URL` / `UPSTASH_REDIS_REST_TOKEN` | The same thing under the other naming scheme |
| `NEXT_PUBLIC_SITE_URL` | Optional. Defaults to `https://upitax.vercel.app` |

The Marketplace integration injects one naming scheme or the other depending on
the template. `/api/count` reads whichever exists and hides the counter silently
when neither does, so a missing integration never blocks a verdict.

## Deploy

Deployed from GitHub. Import the repository in Vercel once; it detects Next.js
and Bun on its own, and every push to the default branch ships.

Two things to do in the Vercel dashboard after the first import:

1. **Counter (optional).** Storage, add Upstash Redis from the Marketplace, link
   it to this project. It injects the credentials itself. Redeploy once so the
   running build picks them up. Skip this and the counter simply hides.
2. **Domain.** The project name decides the subdomain. `upitax` gives
   `upitax.vercel.app`; if it is taken, the next choices are `upi-tax` then
   `upitax-in`. If you use anything other than `upitax.vercel.app`, set
   `NEXT_PUBLIC_SITE_URL` to the real origin, otherwise share links and OG image
   URLs will keep pointing at the wrong host.

Never commit `.env.local`. `.gitignore` already blocks `.env*`, which is why the
template here is `env.example` rather than `.env.example`.

### Before pushing

```bash
bun test
bun run build
```

## Sources

Primary:

- NPCI, *Merchant Discount Rate (MDR) on Select UPI (P2M) Transactions —
  Frequently Asked Questions*, 15 September 2026 (42 questions). This is the
  instrument every number here comes from.
- Ministry of Finance / PIB, 15 September 2026, PRID 2310586, *UPI continues to
  remain free for peer to peer transactions and 96% of merchant transactions*.
- Gazette Notification S.O. 5067(E), 14 September 2026, Department of Financial
  Services, under Section 10A of the Payment and Settlement Systems Act, 2007.
  The S.O. number is secondary-sourced and has not been verified against the
  gazette itself, which is why the app does not cite it.

Secondary:

- Business Standard, 16 September 2026, "No question of rethinking 0.4% UPI MDR
  above ₹2,000".
- Business Standard, 16 September 2026, on the 18% GST and input tax credit.
- Business Today, 15 September 2026, on small merchants staying exempt.

The live links are in `SOURCES` in `src/lib/site.ts`.

Based on NPCI's UPI MDR FAQ, 15 September 2026. Made for clarity, not legal
advice.
