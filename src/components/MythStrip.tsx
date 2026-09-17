"use client";

import { useState } from "react";
import { track } from "@vercel/analytics";
import { CheckIcon, ShareNetworkIcon } from "@phosphor-icons/react/dist/ssr";
import { MYTHS } from "@/lib/site";
import { mythShareText } from "@/lib/share";

export function MythStrip() {
  const [shared, setShared] = useState<number | null>(null);

  async function share(index: number) {
    const { myth, fact } = MYTHS[index];
    const text = mythShareText(myth, fact);

    /*
      The native sheet is the point on a phone: it opens WhatsApp, which is
      where this misinformation actually travels. On desktop the same sheet is
      a clumsy list of Notes and Freeform, so there we just copy the text.
    */
    const onTouch = window.matchMedia?.("(pointer: coarse)").matches ?? false;
    const useNative = onTouch && typeof navigator.share === "function";

    track("share", { platform: useNative ? "native" : "copy", who: "myth" });

    try {
      if (useNative) {
        await navigator.share({ text });
      } else {
        await navigator.clipboard.writeText(text);
        setShared(index);
        setTimeout(() => setShared(null), 1800);
      }
    } catch {
      // A cancelled share is not an error.
    }
  }

  return (
    <section className="mx-auto w-full max-w-[880px] px-4 py-16 sm:py-24">
      <h2 className="max-w-[18ch] text-[26px] font-semibold leading-[1.2] tracking-tight sm:text-[34px]">
        Four things people are getting wrong
      </h2>

      <div className="mt-8 grid gap-3 sm:grid-cols-2">
        {MYTHS.map((m, i) => (
          <article
            key={m.myth}
            className="flex flex-col rounded-3xl border border-line bg-surface p-5"
          >
            <p className="text-[12.5px] font-medium text-ink-3">Myth</p>
            <p className="mt-1 text-[15px] font-medium leading-snug text-ink-2 line-through decoration-ink-3/60">
              {m.myth}
            </p>

            <p className="mt-4 text-[12.5px] font-medium text-accent">Fact</p>
            <p className="mt-1 flex-1 text-[15px] font-medium leading-snug text-ink">{m.fact}</p>

            <button
              type="button"
              onClick={() => share(i)}
              className="mt-5 flex min-h-[44px] w-fit items-center gap-2 rounded-full border border-line bg-surface-2 px-4 text-[13px] font-medium text-ink-2 transition-[border-color,transform] hover:border-accent/40 hover:text-ink active:scale-[0.98]"
            >
              {shared === i ? <CheckIcon size={15} weight="bold" /> : <ShareNetworkIcon size={15} weight="bold" />}
              {shared === i ? "Copied" : "Share this"}
            </button>
          </article>
        ))}
      </div>

    </section>
  );
}
