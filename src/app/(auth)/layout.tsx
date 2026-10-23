import type { ReactNode } from "react";
import { Header } from "@/components/header";
import { Footer } from "@/components/footer";

/**
 * ---------------------------------------------------------------------------
 * (auth) route group — deliberately NOT gated
 * ---------------------------------------------------------------------------
 * /login must stay reachable while maintenance mode is ON, otherwise an admin
 * who signs out (or whose session expires) can never reach /admin to switch the
 * shop back on.
 *
 * Every public page lives in the `(site)` group instead, which IS gated.
 */
export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col">
      <Header />
      <main className="flex-1">{children}</main>
      <Footer />
    </div>
  );
}
