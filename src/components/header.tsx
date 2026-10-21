"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Logo } from "@/components/logo";
import { useCart, useWishlist } from "@/components/providers";

const NAV = [
  { href: "/shop", label: "Shop" },
  { href: "/collections", label: "Collections" },
  { href: "/custom-orders", label: "Custom Orders" },
  { href: "/about", label: "About" },
  { href: "/reviews", label: "Reviews" },
  { href: "/contact", label: "Contact" },
];

export function Header() {
  const { count } = useCart();
  const { ids } = useWishlist();
  const [open, setOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [q, setQ] = useState("");
  const router = useRouter();

  function submitSearch(e: React.FormEvent) {
    e.preventDefault();
    setSearchOpen(false);
    setOpen(false);
    router.push(`/shop?q=${encodeURIComponent(q)}`);
  }

  return (
    <header className="sticky top-0 z-50 border-b border-silvermist/40 bg-ivory/90 backdrop-blur">
      <div className="bg-night py-1.5 text-center text-[0.7rem] font-semibold tracking-[0.2em] text-ivory/90 uppercase">
        ✦ Free UK shipping on orders over £50 ✦ Handmade with love under the moonlight ☾
      </div>
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-3 sm:px-6">
        <Logo />
        <nav className="hidden items-center gap-6 lg:flex">
          {NAV.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="text-sm font-semibold text-inksoft transition hover:text-lavender-deep"
            >
              {item.label}
            </Link>
          ))}
        </nav>
        <div className="flex items-center gap-1 sm:gap-2">
          <button
            onClick={() => setSearchOpen((v) => !v)}
            aria-label="Search"
            className="rounded-full p-2 text-inksoft transition hover:bg-lavender-light hover:text-ink"
          >
            <svg className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24">
              <circle cx="11" cy="11" r="7" />
              <path d="m20 20-3.5-3.5" strokeLinecap="round" />
            </svg>
          </button>
          <Link
            href="/account"
            aria-label="Account"
            className="rounded-full p-2 text-inksoft transition hover:bg-lavender-light hover:text-ink"
          >
            <svg className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24">
              <circle cx="12" cy="8" r="4" />
              <path d="M4 21c1.5-4 4.5-6 8-6s6.5 2 8 6" strokeLinecap="round" />
            </svg>
          </Link>
          <Link
            href="/wishlist"
            aria-label="Wishlist"
            className="relative rounded-full p-2 text-inksoft transition hover:bg-lavender-light hover:text-ink"
          >
            <svg className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24">
              <path d="M12 21s-7.5-4.8-9.5-9.2C.9 8 3 4.5 6.5 4.5c2.2 0 3.9 1.3 5.5 3.4 1.6-2.1 3.3-3.4 5.5-3.4 3.5 0 5.6 3.5 4 7.3C19.5 16.2 12 21 12 21Z" />
            </svg>
            {ids.length > 0 && (
              <span className="absolute -top-0.5 -right-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-blush text-[0.6rem] font-bold text-white">
                {ids.length}
              </span>
            )}
          </Link>
          <Link
            href="/cart"
            aria-label="Cart"
            className="relative rounded-full p-2 text-inksoft transition hover:bg-lavender-light hover:text-ink"
          >
            <svg className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24">
              <path d="M6 7h12l1.3 12.2a1.5 1.5 0 0 1-1.5 1.8H6.2a1.5 1.5 0 0 1-1.5-1.8L6 7Z" />
              <path d="M9 10V6a3 3 0 0 1 6 0v4" strokeLinecap="round" />
            </svg>
            {count > 0 && (
              <span className="absolute -top-0.5 -right-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-lavender text-[0.6rem] font-bold text-white">
                {count}
              </span>
            )}
          </Link>
          <button
            onClick={() => setOpen((v) => !v)}
            aria-label="Menu"
            className="rounded-full p-2 text-inksoft lg:hidden"
          >
            <svg className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24">
              {open ? (
                <path d="M6 6l12 12M18 6 6 18" strokeLinecap="round" />
              ) : (
                <path d="M4 7h16M4 12h16M4 17h16" strokeLinecap="round" />
              )}
            </svg>
          </button>
        </div>
      </div>
      {searchOpen && (
        <div className="border-t border-silvermist/40 bg-ivory px-4 py-3">
          <form onSubmit={submitSearch} className="mx-auto flex max-w-xl gap-2">
            <input
              autoFocus
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search moonstone, amethyst, silver…"
              className="input"
            />
            <button className="btn-primary !py-2">Search</button>
          </form>
        </div>
      )}
      {open && (
        <nav className="border-t border-silvermist/40 bg-ivory px-6 py-4 lg:hidden">
          <div className="flex flex-col gap-3">
            {NAV.concat([
              { href: "/faq", label: "FAQ" },
              { href: "/shipping-returns", label: "Shipping & Returns" },
            ]).map((item) => (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setOpen(false)}
                className="text-sm font-semibold text-inksoft"
              >
                {item.label}
              </Link>
            ))}
          </div>
        </nav>
      )}
    </header>
  );
}
