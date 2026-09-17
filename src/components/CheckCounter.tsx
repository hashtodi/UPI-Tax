"use client";

import { useEffect, useRef, useState } from "react";
import { countIndian } from "@/lib/rules";

/**
 * The shared check counter, shown in the nav on every page.
 *
 * `counts` is what makes a page contribute to the total: the verdict and
 * merchant pages pass it, the home page only reads. The number is decoration,
 * so every failure path ends with the pill not rendering rather than an error.
 */
export function CheckCounter({ counts = false }: { counts?: boolean }) {
  const [total, setTotal] = useState<number | null>(null);
  const sent = useRef(false);

  useEffect(() => {
    // One request per mount. The total is shared across everyone, so a second
    // fire here is a second person as far as the number is concerned.
    if (sent.current) return;
    sent.current = true;

    fetch("/api/count", { method: counts ? "POST" : "GET" })
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (typeof data?.total === "number") setTotal(data.total);
      })
      .catch(() => {});
  }, [counts]);

  // The route answers 204 without credentials, and a fresh store starts at 0.
  // Both read better as no pill at all than as "0 checks".
  if (total === null || total < 1) return null;

  return (
    <span className="inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full border border-line bg-surface px-2.5 py-1 text-[12px] font-medium text-ink-2 sm:px-3 sm:py-1.5 sm:text-[12.5px]">
      <span className="relative flex h-1.5 w-1.5 shrink-0" aria-hidden="true">
        <span className="pulse-ring absolute inline-flex h-full w-full rounded-full bg-accent opacity-0" />
        <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-accent" />
      </span>
      {/*
        "checks", not "people": the counter increments per page view, so a
        refresh is another check by the same person. Say what it measures.
      */}
      <span>
        <span className="tnum font-semibold text-ink">{countIndian(total)}</span>
        {total === 1 ? " check" : " checks"}
      </span>
    </span>
  );
}
