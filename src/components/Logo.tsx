import { RUPEE_PATH } from "@/lib/mark";

/**
 * The mark: a rupee outline in a rounded tile. It is a real vector rather than
 * a text glyph in a box, so it stays crisp at any size and matches the favicon
 * and the share card exactly.
 */
export function Logo({
  withWordmark = true,
  wordmarkClassName = "",
}: {
  withWordmark?: boolean;
  /** Lets the nav stand the wordmark down on narrow screens. */
  wordmarkClassName?: string;
}) {
  return (
    <span className="flex items-center gap-2.5">
      <svg
        viewBox="0 0 100 100"
        className="h-7 w-7 shrink-0"
        role="img"
        aria-label="UPI Tax"
        shapeRendering="geometricPrecision"
      >
        <rect width="100" height="100" rx="24" fill="var(--color-accent)" />
        <path d={RUPEE_PATH} fill="#000000" />
      </svg>
      {withWordmark && (
        <span
          className={`text-[15.5px] font-semibold tracking-tight text-ink ${wordmarkClassName}`}
        >
          UPI Tax?
        </span>
      )}
    </span>
  );
}
