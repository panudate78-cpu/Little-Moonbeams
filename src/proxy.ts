import { NextResponse, type NextRequest } from "next/server";
import {
  MAINTENANCE_PATH,
  decideRequest,
  logDecision,
  type MaintenanceDecision,
} from "@/lib/maintenance";
import { SESSION_COOKIE } from "@/lib/session";

/**
 * ---------------------------------------------------------------------------
 * Maintenance mode gate #1 — Next.js 16 Proxy (fast path)
 * ---------------------------------------------------------------------------
 * Runs before any rendering, on the Node.js runtime (the Next.js 16 default
 * for Proxy). Its job is to redirect as early as possible.
 *
 * It is NOT the only line of defence: `src/app/(site)/layout.tsx` re-checks the
 * flag during the normal server render (gate #2). If this file does not run, or
 * if its database read fails, the layout still blocks visitors. That redundancy
 * is deliberate: a swallowed error here used to leave the site wide open.
 *
 * Every response carries `x-lm-proxy` (and `x-lm-mode` when known) so you can
 * verify from outside whether this gate executed:
 *     curl -I https://your-domain/ | grep -i x-lm
 *
 * See MAINTENANCE_MODE.md.
 */

export const config = {
  /**
   * Only skip what can never be redirected:
   *   _next/    build assets, image optimisation, HMR
   *   __nextjs  dev-overlay endpoints
   *
   * /api/* is intentionally matched: those requests are exempt in code, but
   * running the proxy over them keeps the `x-lm-proxy` diagnostic header on
   * API responses too.
   */
  matcher: ["/((?!_next/|__nextjs|favicon\\.ico).*)"],
};

/**
 * Headers you can read from outside:
 *   x-lm-proxy: exempt | pass | block | error   (did the proxy run, and what it did)
 *   x-lm-mode:  on | off                        (the flag it resolved, when known)
 */
type ProxyTag = "exempt" | "pass" | "block" | "error";

function withDiagnostics(
  request: NextRequest,
  decision: MaintenanceDecision,
  tag: ProxyTag,
): NextResponse {
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-lm-proxy", tag);

  if (decision.modeKnown) {
    requestHeaders.set("x-lm-mode", decision.maintenanceMode ? "on" : "off");
  }

  const response = NextResponse.next({ request: { headers: requestHeaders } });

  response.headers.set("x-lm-proxy", tag);
  if (decision.modeKnown) {
    response.headers.set("x-lm-mode", decision.maintenanceMode ? "on" : "off");
  }

  return response;
}

export default async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const token = request.cookies.get(SESSION_COOKIE)?.value;

  let decision: MaintenanceDecision;

  try {
    decision = await decideRequest({
      pathname,
      sessionToken: token,
      timeoutMs: 1_500,
    });
  } catch (error) {
    // decideRequest already catches database failures; this is a last resort so
    // the proxy can never turn a request into a 500. The layout gate still runs.
    console.error(
      "[maintenance][proxy] could not decide for",
      pathname,
      "— passing to the layout gate:",
      error instanceof Error ? error.message : error,
    );

    return withDiagnostics(
      request,
      {
        blocked: false,
        pathname,
        exempt: false,
        maintenanceMode: false,
        modeKnown: false,
        source: "fallback",
        admin: false,
        error: error instanceof Error ? error.message : "unknown proxy error",
        durationMs: 0,
      },
      "error",
    );
  }

  logDecision("proxy", decision);

  if (!decision.blocked) {
    return withDiagnostics(request, decision, decision.exempt ? "exempt" : "pass");
  }

  // Redirect to /maintenance. 307 = temporary, so browsers and CDNs will not
  // remember it once the shop is back online.
  const url = request.nextUrl.clone();
  url.pathname = MAINTENANCE_PATH;
  url.search = "";

  const response = NextResponse.redirect(url, 307);

  response.headers.set("Cache-Control", "no-store, must-revalidate");
  response.headers.set("x-lm-proxy", "block");
  response.headers.set("x-lm-mode", "on");

  return response;
}
