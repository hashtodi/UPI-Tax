# upitax.vercel.app copy v2: make it funny

Rule for every line: the joke is that the number is always zero and everyone is panicking anyway. Never joke in a way that makes the answer less clear. No Hinglish, no emojis, no exclamation marks. Deadpan.

Implementation note for Opus: headlines become amount-aware. Add a `tier(amt)` helper in `rules.ts` (`chai` ≤ 200, `normal` 201 to 2000, `exact` = 2000, `justOver` 2001 to 2100, `mid` 2101 to 74,999, `capped` ≥ 75,000, `absurd` ≥ 10,00,000, `overLimit` > 1,00,00,000) and pick copy by case plus tier. Fall back to the `mid` line if a tier has no special copy.

---

## Home screen

Current: `Will you pay the ₹2,000 UPI tax?`
New headline: `Will you pay the ₹2,000 UPI tax?`
New sub: `Find out in 3 taps. Spoiler in the URL.`

Button on step 3: replace `Check` with `Charge me`

Step labels stay factual. Only the helper text changes:
- A person: `Friend, family, landlord, yourself at 2am`
- Small shop: `Kirana, chaiwala, the uncle who never has change`
- Big shop or brand: `Chain, D2C, mall, the app that keeps sending notifications`
- Petrol, recharge, insurance, bills: `The boring essentials`
- Stocks or mutual funds: `Your broker. Yes, this one has its own rule.`

Amount chips: keep the numbers, add tiny captions under them:
₹500 `chai for the team` · ₹1,999 `the one999 special` · ₹2,001 `living dangerously` · ₹5,000 `new shoes` · ₹50,000 `iPhone, base model` · ₹1,00,000 `parents will ask questions`

## Fake processing state (new, 1.2 seconds, then verdict)

UPI apps have that spinner. Use it. Cycle three lines, 400ms each:
1. `Calculating your UPI tax`
2. `Consulting the NPCI FAQ`
3. `Checking with your bank`
Then the tick lands with `Found it.`

## Verdict screen

Top label: `UPI tax paid by you`
Giant figure: `₹0`
Sub-label under the ₹0: `Same as last time. Same as next time.`

### Headlines by case and tier

**Person (P2P), any amount**
- chai: `No. You sent ₹{amt} to a friend. The government did not notice and does not care.`
- normal / mid: `No. Your landlord gets every rupee. He will still raise the rent, but not because of this.`
- capped and above: `No. ₹{amt} to a person, zero charge. Whoever you are paying, congratulations to them.`
- absurd: `No. Also, sending ₹{amt} to a person on UPI is a conversation with your bank, not a tax question.`

**Small shop (P2PM), any amount**
- chai: `No. And neither does the chaiwala. The chaiwala has never paid MDR and is not about to start.`
- mid: `No. And neither does the shop. Under ₹1 lakh a month on UPI means zero, even on a ₹{amt} bill.`
- capped and above: `No. And the shop pays zero too. Also, a ₹{amt} bill at a kirana store? Respect.`

**Big shop (P2M)**
- chai / normal (≤ ₹2,000): `No. Nobody does. ₹{amt} is under the line. The line is ₹2,000. You are fine. Everyone is fine.`
- exact ₹2,000: `No. ₹2,000 exactly is still "up to ₹2,000". The store pays zero. You pay zero. Nobody has ever been this precisely safe.`
- justOver (₹2,001 to ₹2,100): `No. You went ₹{amt - 2000} over the line and the store pays ₹{fee}. You pay nothing. You absolute menace.`
- mid: `No. The store pays ₹{fee}. You pay the price on the tag, same as yesterday.`
- capped (≥ ₹75,000): `No. The store pays ₹300, the maximum. It is the same ₹300 whether you bought a fridge or a small car. You: ₹0.`
- absurd (≥ ₹10 lakh): `No. Their bank charges them ₹300. Your bank charges you nothing. Also, who are you.`
- overLimit (> ₹1 crore): `No. This is above the UPI transaction limit, so this payment does not exist. The tax on payments that do not exist is also ₹0.`

**Fuel, recharge, insurance, bills**
- ≤ ₹2,000: `No. Nobody does. Under ₹2,000 is untouched, even at the petrol pump.`
- above: `No. The company pays a flat ₹5. Five rupees. On ₹{amt}. This is the special sector rate and it is adorable.`

**Stocks or mutual funds**
- ≤ ₹2,000: `No. Your broker pays nothing either. MDR only starts above ₹2,000.`
- above: `No. Your broker pays ₹{fee}, which is 0.02%. Not 0.4%. Someone lobbied well. Still not you.`
- capped: `No. Your broker pays ₹300, the cap. On ₹{amt}. They will survive.`

### "Who actually pays" row
Rename header to `Who actually pays, and to whom`
- Person: `Nobody pays anybody. This is the internet moving money between two humans.`
- Small shop: `Nobody. The shop is under the ₹1 lakh a month line.`
- Big shop: `The store pays ₹{fee} to its own bank and payment app. Not to the government. Not to you.`
- Fuel: `The company pays ₹5 flat to its bank. The government is not in this sentence.`
- Capital: `Your broker pays ₹{fee} to its bank. Your portfolio is unaffected, for once.`

### Receipt block
Retitle: `Your UPI tax receipt`
Rows:
- `Amount` ₹{amt}
- `Paid to` {category}
- `MDR rate` {rate}
- `Merchant pays` ₹{fee} (+18% GST: ₹{total})
- `You pay` `₹0.00`
- `You pay, lifetime` `₹0.00`
- `Refund due` `₹0.00`
- `Effective` `15 Oct 2026`
Footer line of the receipt: `Keep this for your records. There is nothing to record.`

### Wink line (keep) plus new ones
- exact: `₹2,000 exactly is still "up to ₹2,000". Zero.` (existing)
- ₹1,999: `The one999 special. Splitting saved you ₹0, because you were paying ₹0.`
- ₹420 / ₹786 / ₹1,111 / ₹69 / ₹7,860: `Nice number. Still ₹0.`

### Counter line
Current: `12,431 people checked. 100% of them pay ₹0.`
New: `12,431 people checked. Combined UPI tax paid by all of them: ₹0.`

### Buttons
- `Download card` → `Download proof`
- `Share` → `Share`
- `Post on X` → `Brag on X`
- `Copy link` → `Copy link`
- `Check another` → `Try to get charged again`

### "Worth knowing" notes
Keep the facts, drop the tone to match:
- AutoPay note: `Set the same payment up as UPI AutoPay and even the merchant pays zero. The rule has a side door and it is labelled.`
- Fuel sector note: `NPCI says railways, telecom, insurance, fuel "among others", plus electricity, water and gas. The list is open. The ₹5 is not.`

## Myth strip

Retitle section: `What the WhatsApp group said vs what NPCI said`
Each card has two speaker labels: `Uncle in the family group` and `NPCI FAQ, Sept 2026`.

1. Uncle: `Beta, ₹8 will be cut on every ₹2,000 payment from October.`
   NPCI: `Customers pay ₹0. On every amount. Forever, as far as this rule goes.`
2. Uncle: `18% GST on UPI above ₹2,000. Forwarded as received.`
   NPCI: `No GST on your payment. It is a 0.4% MDR, paid by large merchants, and the 18% GST is on that fee, paid by them.`
3. Uncle: `Now the kirana wala will add charges.`
   NPCI: `Shops under ₹1 lakh a month on UPI pay zero MDR. And passing it on to you is not allowed for anyone.`
4. Uncle: `Just pay in ₹1,999 pieces, problem solved.`
   NPCI: `You were never paying. Splitting saves you ₹0 and makes the queue behind you hate you.`

Share button on each card: `Send this to the group`

## Merchant page

Headline: `Own a shop? This is the page where someone actually pays.`
Sub: `Enter what you collect on UPI each month. We tell you if it is you, and how much.`
Result headlines:
- P2PM: `Relax. You are under ₹1 lakh a month. Your MDR is ₹0 and stays there until you cross it three months running.`
- P2M: `You will pay about ₹{monthly} a month. Cards would have cost you ₹{cardEstimate}. UPI is still the cheap option, it is just no longer the free one.`

## Share text (X intent)

Keep under 240 chars. Structure: what I paid, what I was charged, what they were charged, one dry line, link, handle.

- Person: `Sent ₹{amt} to a friend on UPI. UPI tax: ₹0. It was always going to be ₹0. {url} {handle}`
- Small shop: `Paid ₹{amt} at a kirana on UPI. My tax: ₹0. Shop's tax: ₹0. The uncle in the group was wrong. {url} {handle}`
- Big shop ≤ 2000: `Paid ₹{amt} at a store on UPI. Tax: ₹0. Under ₹2,000 nobody pays anything. Not even the store. {url} {handle}`
- Big shop > 2000: `Paid ₹{amt} at a store on UPI. My tax: ₹0. Store's: ₹{fee} to its own bank. That is the entire "UPI tax". {url} {handle}`
- Capped: `Paid ₹{amt} on UPI. My charge: ₹0. Store's charge: ₹300, the maximum. Same as a fridge. {url} {handle}`
- Fuel: `Paid ₹{amt} for petrol on UPI. My tax: ₹0. Pump's: ₹5 flat. Five rupees. {url} {handle}`
- Capital: `Moved ₹{amt} to my broker on UPI. My tax: ₹0. Broker's: ₹{fee} at 0.02%. Not 0.4%. Somebody lobbied well. {url} {handle}`
- Myth card: `Uncle in the group: "{myth}" NPCI: "{fact}" {url} {handle}`

## OG and meta

Home OG title: `Will you pay UPI tax above ₹2,000? No.` (keep, it is the best line on the site)
Home OG description: `3 taps to find out who actually pays the 0.4% MDR from 15 Oct. It is not you. It was never you.`
Result OG title: `₹{amt} on UPI. UPI tax: ₹0.`
Result OG description: pick the headline for that case and tier.

## Footer

`Made by Harsh Todi {handle}, who also pays ₹0.`
`Sources: NPCI UPI MDR FAQ (Sept 2026) and four newspapers that read it.`
`Sister project: one999.vercel.app, which splits payments into ₹1,999 chunks to avoid a charge you were never going to pay.`
Disclaimer: keep as is, the Supreme Court line is a good hedge.

## 404 page

`This page does not exist. The UPI tax on it is ₹0.` Button: `Go check a real amount`
