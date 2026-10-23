import type { ReactNode } from "react";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { Header } from "@/components/header";
import { Footer } from "@/components/footer";
import {
  MAINTENANCE_PATH,
  decideLayout,
  logDecision,
} from "@/lib/maintenance";
import { SESSION_COOKIE } from "@/lib/session";

/**
 * ---------------------------------------------------------------------------
 * Maintenance mode gate #2 — authoritative
 * ---------------------------------------------------------------------------
 * This layout wraps EVERY public page (/ , /shop, /collections, /products,
 * /contact, /custom-orders, /cart, /account, /checkout …). Checking the flag
 * here means a visitor can never see a public page while maintenance mode is
 * ON — even if `src/proxy.ts` does not run, or its database read fails.
 *
 * /login deliberately lives outside this group (src/app/(auth)), so this
 * blanket redirect can never lock an admin out of the sign-in page, /admin or
 * /api. Admins keep browsing the shop because the check honours their session.
 *
 * `force-dynamic` guarantees the check runs on every request instead of at
 * build time (otherwise a statically prerendered page would be served from the
 * CDN without ever consulting the flag).
 */
export const dynamic = "force-dynamic";

export default async function SiteLayout({ children }: { children: ReactNode }) {
  const cookieStore = await cookies();

  const decision = await decideLayout({
    sessionToken: cookieStore.get(SESSION_COOKIE)?.value,
  });

  logDecision("layout", decision);

  if (decision.blocked) {
    redirect(MAINTENANCE_PATH);
  }

  return (
    <div className="flex min-h-screen flex-col">
      <Header />
      <main className="flex-1">{children}</main>
      <Footer />
    </div>
  );
}
