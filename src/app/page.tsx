import Link from "next/link";
import { ArrowRightIcon, CaretDownIcon } from "@phosphor-icons/react/dist/ssr";
import { Flow } from "@/components/Flow";
import { Footer } from "@/components/Footer";
import { MythStrip } from "@/components/MythStrip";
import { SiteNav } from "@/components/SiteNav";
import { inr, MDR_THRESHOLD } from "@/lib/rules";

export default function Home() {
  return (
    <main>
      {/*
        First view, every breakpoint: the question and the three taps, nothing
        else. Everything explanatory waits below the fold.
      */}
      <div className="flex min-h-[100dvh] flex-col">
        <SiteNav />

        <section className="flex flex-1 items-center px-4 py-4 sm:py-8">
          <div className="mx-auto grid w-full max-w-[1080px] items-center gap-7 [@media(min-height:720px)]:-translate-y-[4vh] [@media(min-height:880px)]:-translate-y-[6vh] lg:grid-cols-[1fr_minmax(0,420px)] lg:gap-16">
            <h1
              /*
                Stacked, the eye aligns this to the card's TEXT, not its border,
                so it is inset by the card's own padding. Side by side the card
                is a separate column and the inset would be wrong.
              */
              className="text-balance pl-4 text-[34px] font-semibold leading-[1.05] tracking-tight sm:pl-7 sm:text-[42px] lg:pl-0 lg:text-[52px] xl:text-[62px]"
            >
              Will you pay UPI tax above {inr(MDR_THRESHOLD)}?
            </h1>

            <Flow />
          </div>
        </section>

        {/*
          Names its destination and actually navigates there, so it is a jump
          link rather than a decorative "Scroll" label.
        */}
        <div className="flex justify-center px-4 pb-4">
          <a
            href="#facts"
            className="group flex min-h-[44px] items-center gap-2 rounded-full border border-line bg-surface px-4 text-[13.5px] font-medium text-ink-2 transition-[border-color,color] hover:border-accent/40 hover:text-ink"
          >
            Read more
            <CaretDownIcon
              size={14}
              weight="bold"
              className="nudge text-ink-3 transition-colors group-hover:text-accent"
            />
          </a>
        </div>
      </div>

      <MythStrip />

      {/* The calculator has its own page now, so scrollers still need a way in. */}
      <section className="border-t border-line-soft">
        <div className="mx-auto w-full max-w-[880px] px-4 py-12 sm:py-16">
          <Link
            href="/merchant"
            className="group flex min-h-[64px] items-center gap-4 rounded-3xl border border-line bg-surface px-5 py-4 transition-[border-color,transform] hover:border-accent/45 active:scale-[0.995]"
          >
            <span className="flex-1">
              <span className="block text-[16px] font-medium text-ink">
                Own a shop? (and what your customers end up paying)
              </span>
              <span className="mt-0.5 block text-[13.5px] leading-snug text-ink-3">
                What it costs you a month, and how much of it lands in your prices.
              </span>
            </span>
            <ArrowRightIcon
              size={17}
              weight="bold"
              className="shrink-0 text-ink-3 transition-colors group-hover:text-accent"
            />
          </Link>
        </div>
      </section>

      <Footer />
    </main>
  );
}
