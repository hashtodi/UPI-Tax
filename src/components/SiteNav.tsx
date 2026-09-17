import Link from "next/link";
import { XLogoIcon } from "@phosphor-icons/react/dist/ssr";
import { Logo } from "@/components/Logo";
import { X_URL } from "@/lib/site";

export function SiteNav() {
  return (
    <header className="sticky top-0 z-20 border-b border-line-soft bg-bg/85 backdrop-blur-md">
      <nav className="mx-auto flex h-[60px] w-full max-w-[1080px] items-center justify-between px-4">
        <Link href="/" aria-label="UPI Tax, home">
          <Logo />
        </Link>

        <div className="flex items-center gap-2.5">
          <Link
            href="/merchant"
            className="flex h-9 items-center rounded-full px-2.5 text-[13.5px] font-medium text-ink-2 transition-colors hover:text-ink"
          >
            Own a shop?
          </Link>

          <a
            href={X_URL}
            target="_blank"
            rel="noreferrer"
            className="flex h-9 items-center gap-2 rounded-full border border-line bg-surface px-3.5 text-[13.5px] font-medium text-ink-2 transition-[border-color,color] hover:border-accent/40 hover:text-ink"
          >
            <XLogoIcon size={14} weight="bold" />
            Harsh
          </a>
        </div>
      </nav>
    </header>
  );
}
