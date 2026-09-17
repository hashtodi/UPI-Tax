import { AUTHOR, DISCLAIMER, LAST_VERIFIED, LITIGATION_NOTE, SOURCES, X_HANDLE, X_URL } from "@/lib/site";

export function Footer() {
  return (
    <footer className="border-t border-line-soft px-4 py-10">
      <div className="mx-auto grid w-full max-w-[880px] gap-6 text-[13px] leading-relaxed text-ink-3">
        <p>
          Made by {AUTHOR}{" "}
          <a href={X_URL} className="text-ink-2 underline underline-offset-4 hover:text-accent">
            {X_HANDLE}
          </a>
        </p>

        <div className="grid gap-2">
          <p className="text-ink-2">Sources</p>
          <ul className="grid gap-1.5">
            {SOURCES.map((s) => (
              <li key={s.label}>
                <a
                  href={s.href}
                  target="_blank"
                  rel="noreferrer"
                  className="underline underline-offset-4 hover:text-accent"
                >
                  {s.label}
                </a>
              </li>
            ))}
          </ul>
        </div>

        <div className="grid gap-2 border-t border-line-soft pt-5">
          <p>{DISCLAIMER}</p>
          <p>{LITIGATION_NOTE}</p>
          <p>Rules last checked against the primary sources on {LAST_VERIFIED}.</p>
        </div>
      </div>
    </footer>
  );
}
