import Link from "next/link";

export function MoonMark({ className = "h-9 w-9" }: { className?: string }) {
  return (
    <svg viewBox="0 0 48 48" fill="none" className={className} aria-hidden="true">
      <circle cx="24" cy="24" r="22" stroke="currentColor" strokeWidth="1.2" opacity="0.35" />
      <path
        d="M30 8.5a17.5 17.5 0 1 0 8 29.5A19 19 0 0 1 30 8.5Z"
        fill="currentColor"
        opacity="0.9"
      />
      <path d="M33 14l.9 2.1L36 17l-2.1.9L33 20l-.9-2.1L30 17l2.1-.9L33 14Z" fill="currentColor" />
      <path d="M38 24l.6 1.4 1.4.6-1.4.6L38 28l-.6-1.4-1.4-.6 1.4-.6L38 24Z" fill="currentColor" />
    </svg>
  );
}

export function Logo({ light = false }: { light?: boolean }) {
  return (
    <Link href="/" className="group flex items-center gap-2.5">
      <span className={light ? "text-ivory" : "text-lavender-deep"}>
        <MoonMark className="h-9 w-9 transition group-hover:rotate-12" />
      </span>
      <span className="flex flex-col leading-none">
        <span
          className={`font-script text-2xl sm:text-[1.7rem] ${light ? "text-ivory" : "text-ink"}`}
        >
          Little Moonbeam's Creations
        </span>
        <span
          className={`mt-1 hidden text-[0.6rem] font-bold tracking-[0.28em] uppercase sm:block ${
            light ? "text-ivory/60" : "text-inksoft/70"
          }`}
        >
          Handcrafted Jewellery
        </span>
      </span>
    </Link>
  );
}
