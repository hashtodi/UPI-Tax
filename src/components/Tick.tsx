/**
 * The mark above the figure. Hand-rolled on purpose: these are two single
 * animated strokes, not icons from a set.
 *
 * A tick where nothing is charged. A return arrow where something is, because
 * the cost goes out to the shop and comes back round to the customer.
 */
export function VerdictMark({ charged }: { charged: boolean }) {
  return (
    <div
      className="relative grid h-[52px] w-[52px] place-items-center [@media(min-height:680px)]:h-[60px] [@media(min-height:680px)]:w-[60px] sm:h-[74px] sm:w-[74px]"
      aria-hidden
    >
      <span className="tick-halo absolute inset-0 rounded-full bg-accent/25" />
      <span className="tick-ring absolute inset-0 rounded-full bg-accent/12 ring-1 ring-accent/35" />
      <svg
        viewBox="0 0 48 48"
        fill="none"
        className="relative h-[26px] w-[26px] [@media(min-height:680px)]:h-[30px] [@media(min-height:680px)]:w-[30px] sm:h-[37px] sm:w-[37px]"
      >
        <path
          className="tick-path"
          d={charged ? RETURN_PATH : TICK_PATH}
          stroke="var(--color-accent)"
          strokeWidth="4.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </div>
  );
}

export const TICK_PATH = "M10 25.5 L20 35 L38 14";
/** Out to the right, round the bend, and back to where it started. */
export const RETURN_PATH = "M12 15 H28 A9 9 0 0 1 28 33 H17 M23 27 L17 33 L23 39";
