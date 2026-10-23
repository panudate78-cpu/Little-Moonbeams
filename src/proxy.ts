import { NextResponse, type NextRequest } from "next/server";
import {
  MAINTENANCE_PATH,
  shouldBlockPublicRequest,
} from "@/lib/maintenance";
import { SESSION_COOKIE } from "@/lib/session";

/**
 * ---------------------------------------------------------------------------
 * Maintenance mode gate — Next.js 16 Proxy
 * ---------------------------------------------------------------------------
 * Runs on the Node.js runtime (Next.js 16 default for Proxy), which is why it
 * can talk to PostgreSQL through Drizzle ORM.
 *
 * In a project that uses a `src/` directory this file MUST live in `src/`
 * next to `app/`. A root-level `middleware.ts` is compiled but never invoked
 * here — that was the reason the previous attempt "did not execute".
 *
 * See MAINTENANCE_MODE.md for the full explanation.
 */

export const config = {
  /**
   * Skip the Proxy for requests that can never be redirected:
   *  - api/       route handlers (must keep working, also exempted in code)
   *  - _next/     build assets, image optimisation, HMR
   *  - __nextjs   dev-overlay endpoints
   *
   * Everything else is evaluated, then `isExemptFromMaintenance()` decides.
   */
  matcher: ["/((?!api/|_next/|__nextjs|favicon\\.ico).*)"],
};

export default async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const blocked = await shouldBlockPublicRequest(
    pathname,
    request.cookies.get(SESSION_COOKIE)?.value,
  );

  if (!blocked) return NextResponse.next();

  // Redirect to /maintenance. 307 = temporary, so browsers and CDNs will not
  // remember it once the shop is back online. (`url.search` is cleared so the
  // Location header stays canonical.)
  const url = request.nextUrl.clone();
  url.pathname = MAINTENANCE_PATH;
  url.search = "";

  const response = NextResponse.redirect(url, 307);

  // Guarantees the redirect itself is never cached by Vercel's CDN.
  response.headers.set("Cache-Control", "no-store, must-revalidate");
  response.headers.set("x-lm-maintenance", "on");

  return response;
}
