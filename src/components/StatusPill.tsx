import { liveStatus } from "@/lib/rules";

export function StatusPill({ className = "" }: { className?: string }) {
  const status = liveStatus();
  return (
    <span
      className={`inline-flex items-center rounded-full border border-line bg-surface px-3 py-1.5 text-[12.5px] font-medium text-ink-2 ${className}`}
    >
      {status.live ? status.label : `This MDR is not live yet. ${status.label}.`}
    </span>
  );
}
