import Link from "next/link";
import { ArrowRightIcon } from "@phosphor-icons/react/dist/ssr";
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

        <section className="flex flex-1 items-center px-4 py-6 sm:py-8">
          <div className="mx-auto grid w-full max-w-[1080px] items-center gap-7 lg:grid-cols-[1fr_minmax(0,420px)] lg:gap-16">
            <h1 className="text-balance text-[34px] font-semibold leading-[1.05] tracking-tight sm:text-[42px] lg:text-[52px] xl:text-[62px]">
              Will you pay the {inr(MDR_THRESHOLD)} UPI tax?
            </h1>

            <Flow />
          </div>
        </section>
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
              <span className="block text-[16px] font-medium text-ink">Own a shop?</span>
              <span className="mt-0.5 block text-[13.5px] leading-snug text-ink-3">
                Work out what you would actually pay a month, and how it compares to cards.
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
