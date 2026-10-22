import type { Metadata } from "next";
import type { ReactNode } from "react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/auth";
import { MoonMark } from "@/components/logo";
import { LogoutButton } from "@/components/auth-forms";

export const metadata: Metadata = {
  title: "Admin Dashboard",
  robots: { index: false, follow: false },
};

const NAV = [
  { href: "/admin", label: "Dashboard", icon: "📊" },
  { href: "/admin/catalog", label: "Categories & Collections", icon: "🗂" },
  { href: "/admin/products", label: "Products", icon: "💎" },
  { href: "/admin/orders", label: "Orders", icon: "📦" },
  { href: "/admin/customers", label: "Customers", icon: "👥" },
  { href: "/admin/discounts", label: "Discount Codes", icon: "🏷" },
];

export default async function AdminLayout({ children }: { children: ReactNode }) {
  const admin = await requireAdmin();
  if (!admin) redirect("/login?next=/admin");

  return (
    <div className="flex min-h-screen bg-cream">
      <aside className="hidden w-64 shrink-0 flex-col border-r border-silvermist/40 bg-night text-ivory lg:flex">
        <div className="flex items-center gap-2 border-b border-ivory/10 p-5">
          <span className="text-lavender">
            <MoonMark className="h-8 w-8" />
          </span>
          <div>
            <p className="font-script text-xl leading-none">Little Moonbeam&apos;s Creations</p>
            <p className="mt-1 text-[0.6rem] font-bold tracking-[0.25em] text-gold uppercase">
              Admin Studio
            </p>
          </div>
        </div>
        <nav className="flex-1 space-y-1 p-4">
          {NAV.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="flex items-center gap-3 rounded-xl px-4 py-2.5 text-sm font-semibold text-ivory/75 transition hover:bg-ivory/10 hover:text-ivory"
            >
              <span>{item.icon}</span> {item.label}
            </Link>
          ))}
        </nav>
        <div className="border-t border-ivory/10 p-4 text-xs text-ivory/60">
          <p className="mb-2">Signed in as {admin.name}</p>
          <Link href="/" className="font-semibold text-gold hover:underline">
            ← View shop
          </Link>
        </div>
      </aside>
      <div className="flex-1">
        <header className="flex items-center justify-between border-b border-silvermist/40 bg-ivory px-6 py-4">
          <div className="lg:hidden">
            <p className="font-script text-xl">Admin Studio ☾</p>
          </div>
          <nav className="hidden gap-4 text-xs font-bold tracking-wide uppercase lg:flex">
            {NAV.map((n) => (
              <Link key={n.href} href={n.href} className="text-inksoft hover:text-ink">
                {n.label}
              </Link>
            ))}
          </nav>
          <LogoutButton />
        </header>
        <main className="p-6">{children}</main>
      </div>
    </div>
  );
}
