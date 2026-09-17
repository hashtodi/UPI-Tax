/**
 * The payment-success tick, parodied. Hand-rolled on purpose: it is a single
 * animated mark, not an icon from a set. Smaller on phones so the share bar
 * still clears the fold.
 */
export function Tick() {
  return (
    <div
      className="relative grid h-[60px] w-[60px] place-items-center sm:h-[74px] sm:w-[74px]"
      aria-hidden
    >
      <span className="tick-halo absolute inset-0 rounded-full bg-accent/25" />
      <span className="tick-ring absolute inset-0 rounded-full bg-accent/12 ring-1 ring-accent/35" />
      <svg
        viewBox="0 0 48 48"
        fill="none"
        className="relative h-[30px] w-[30px] sm:h-[37px] sm:w-[37px]"
      >
        <path
          className="tick-path"
          d="M10 25.5 L20 35 L38 14"
          stroke="var(--color-accent)"
          strokeWidth="4.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </div>
  );
}
