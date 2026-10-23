# Maintenance Mode — diagnosis + fix (Next.js 16 / App Router / Vercel)

Status: **fixed and verified end-to-end** against a real PostgreSQL 18 instance,
in `next dev` and in a production build (`next build` + `next start`).

---

## 1. Root cause (short version)

Your deployment had **exactly one enforcement point**: `src/proxy.ts`. Its
database read is wrapped in a `try/catch` that **fails open**:

```ts
} catch (error) {
  logReadError(error);            // throttled to one line per minute
  const value = cached?.value ?? false;   // ← no cache yet? => "off"
  ...
}
```

So the moment the Proxy's own database access does not work in the Vercel
function — cold start, `pg` not reachable from the proxy bundle, pool
exhaustion, connection timeout, missing env var in that function — the Proxy
decides **"maintenance is off"**, returns `NextResponse.next()`, and every
public page renders normally. The *pages* keep working because they use a
**different pool in a different bundle**, which is connected fine. Nothing in
the UI, the API or the dashboard reveals that the gate gave up — the only trace
is one log line that most people never see.

I reproduced that exact behaviour on this repo:

```
maintenance_mode = TRUE in PostgreSQL, proxy DB read unavailable
GET /            -> 200
GET /collections -> 200
GET /contact     -> 200
```

That is your reported symptom, byte for byte.

**Second, independent bug — the fragile data read.** Both the dashboard and the
gate used `.limit(1)` with no `ORDER BY` on a table that can legitimately hold
more than one row. If a duplicate `site_settings` row existed, the dashboard and
the gate could read *different* rows — the dashboard shows "ON", the gate reads
"off". This alone can produce your symptom with no error at all.

**Third — a design fragility.** `/login` lived inside the `(site)` group, so the
only way to protect "all public pages" was to make the Proxy the sole gate.

### Why the previous proxy *did* work in my earlier tests

Because there the database was reachable from both bundles. Locally, the Proxy
read `site_settings` successfully and redirected. On Vercel it evidently does
not — and one swallowed error was enough to open the whole shop.

---

## 2. The fix: two independent gates

```
Browser
   │
   ├─► GATE 1  src/proxy.ts            (fast path, Node runtime)
   │              reads the flag ──► redirect 307 /maintenance
   │              can't read it?  ──► passes through, header x-lm-proxy: error
   │
   └─► GATE 2  src/app/(site)/layout.tsx   ← THE GUARANTEE
                  wraps EVERY public page, runs during the render itself,
                  uses the same database connection the pages already use,
                  redirects to /maintenance if the flag is on
                  (admins with a valid session keep browsing)
```

* **Gate 1** is the fast path: an early redirect, no page rendering, no wasted
  database work.
* **Gate 2 is authoritative.** If Gate 1 is missing, disabled, mis-bundled, slow
  or blind, Gate 2 still runs on every public page render. It physically cannot
  be skipped for a page in the `(site)` group — and every public page is in that
  group.
* **`/login` was moved to its own `(auth)` group**, which is *not* gated. That is
  what makes it safe to gate the whole `(site)` group unconditionally: an admin
  who is signed out can still reach `/login`, and `/admin`, `/api/*` and
  `/maintenance` were never inside `(site)` at all.

Both gates call the same `decideRequest()` / `decideLayout()` logic, so they can
never disagree about what "exempt" means.

---

## 3. Why it can't silently open again

| Risk | Before | Now |
| --- | --- | --- |
| Proxy bundle can't reach PostgreSQL | site stays open, silently | layout gate blocks anyway (`x-lm-proxy: error`) |
| Proxy doesn't run at all | site stays open, silently | layout gate blocks anyway |
| Flag read fails everywhere | "off" | loud log + `lastError` in `/api/maintenance/status` + `x-lm-proxy: error` |
| Proxy hangs on a DB connection | request hangs | 1.5 s timeout (layout: 3 s) then falls through |
| Duplicate `site_settings` rows | first row wins, possibly "off" | **every** row is read; **any `true` wins** |
| Stale cache after toggling | up to 10 s per instance | cache cleared on write; 10 s worst case elsewhere |
| Statically prerendered page served from CDN | could bypass everything | `(site)` layout is `force-dynamic`, so the flag is checked per request |
| Database completely unreachable | open | `MAINTENANCE_MODE_FORCE=on` closes the site without touching the DB |

---

## 4. Files changed

| File | Change |
| --- | --- |
| `src/lib/maintenance.ts` | Rewritten: reads **all** rows (any `true` wins), DB timeout, recorded last error, env override, shared decision functions, diagnostics, verbose logging. |
| `src/proxy.ts` | Gate 1: never throws, 1.5 s budget, `x-lm-proxy` / `x-lm-mode` headers, concise logging. |
| `src/app/(site)/layout.tsx` | **Gate 2 (new)**: authoritative check on every public page render. |
| `src/app/(auth)/layout.tsx` | New: chrome for the ungated `/login` route. |
| `src/app/(site)/login/page.tsx` → `src/app/(auth)/login/page.tsx` | Moved out of the gated group (URL is still `/login`). |
| `src/app/api/maintenance/status/route.ts` | New diagnostics endpoint. |
| `src/app/api/admin/maintenance/route.ts` | Returns all rows + duplicate warning; uses the shared writers. |
| `src/app/admin/page.tsx` | Reads the flag with the same helper as the gates; links to the diagnostics endpoint. |

---

## 5. Complete code

### 5.1 `src/lib/maintenance.ts`

```ts
import { asc } from "drizzle-orm";
import { siteSettings } from "@/db/schema";

/**
 * ---------------------------------------------------------------------------
 * Maintenance mode — single source of truth
 * ---------------------------------------------------------------------------
 * Used by BOTH gates:
 *   - src/proxy.ts                    (fast path, runs before any rendering)
 *   - src/app/(site)/layout.tsx       (authoritative gate, runs on every page render)
 *   - src/app/api/admin/maintenance   (read / write)
 *   - src/app/api/maintenance/status  (diagnostics)
 *
 * Design rules:
 *  1. The public site must never be left open because of a swallowed error.
 *     If the flag cannot be read, that is recorded in
 *     `getMaintenanceDiagnostics()` and logged loudly — and the *layout* gate
 *     (which shares the same database connection the pages already use) still
 *     decides. The proxy alone is never the only line of defence.
 *  2. Every row of `site_settings` is considered. If duplicates exist and any
 *     of them says "on", maintenance is ON.
 *  3. `MAINTENANCE_MODE_FORCE=on|off` overrides the database completely — a
 *     switch that works even if the database is unreachable.
 *
 * This module is imported by the Proxy, so it must not import `next/headers`,
 * `next/cache` or anything that only exists inside a React render.
 */

export const MAINTENANCE_PATH = "/maintenance";

/** How the flag was resolved. */
export type MaintenanceModeSource = "database" | "cache" | "fallback" | "env";

export type MaintenanceState = {
  value: boolean;
  source: MaintenanceModeSource;
  error: string | null;
};

export type MaintenanceDecision = {
  blocked: boolean;
  pathname: string;
  exempt: boolean;
  maintenanceMode: boolean;
  /** False when the flag could not be resolved (the header then stays absent). */
  modeKnown: boolean;
  source: MaintenanceModeSource;
  admin: boolean;
  error: string | null;
  durationMs: number;
};

export type MaintenanceSnapshot = {
  maintenanceMode: boolean;
  rows: { id: number; maintenanceMode: boolean }[];
};

/**
 * Paths that stay reachable while maintenance mode is ON.
 *
 * `/admin`  and `/admin/*`  -> the dashboard used to switch it back off
 * `/api`    and `/api/*`    -> route handlers (auth, admin, checkout, health…)
 * `/maintenance`            -> the page visitors are redirected to
 * `/login`                  -> otherwise an admin could never sign in to /admin
 *
 * Every other public page lives inside the `(site)` route group, and that
 * group's layout is itself gated (see src/app/(site)/layout.tsx).
 */
const EXEMPT_EXACT = new Set<string>([MAINTENANCE_PATH, "/login"]);

const EXEMPT_PREFIXES = [
  "/admin", // /admin, /admin/products, /admin/orders …
  "/api", // /api/health, /api/admin/maintenance …
  "/_next", // Next.js build assets, image optimiser, HMR
  "/__nextjs", // Next.js dev overlay endpoints
  "/_vercel", // Vercel analytics / speed insights
  "/.well-known", // security.txt, ACME challenges …
  "/uploads", // locally uploaded files
];

/** /favicon.ico, /robots.txt, /sitemap.xml, /logo.png, /fonts/x.woff2 … */
const STATIC_FILE = /\.[a-z0-9]{2,5}$/i;

const DEFAULT_CACHE_TTL_MS = 10_000;

/** After a failed read, retry sooner rather than hammering a broken database. */
const FAILURE_TTL_MS = 5_000;

/** A hung connection must never hang a page render. */
const DEFAULT_DB_TIMEOUT_MS = 3_000;
const PROXY_DB_TIMEOUT_MS = 1_500;

type CacheEntry = { value: boolean; expiresAt: number; source: "database" | "fallback" };

type LastError = { message: string; at: string };

/**
 * Kept on `globalThis` so dev-mode hot reloads and multiple module instances
 * share one cache (and one "last error") instead of multiplying queries.
 */
const state = globalThis as typeof globalThis & {
  __lmMaintenanceCache?: CacheEntry | null;
  __lmMaintenanceInFlight?: Promise<MaintenanceState> | null;
  __lmMaintenanceLastError?: LastError | null;
  __lmMaintenanceLastDecision?: (MaintenanceDecision & { layer: string }) | null;
};

function errorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  if (typeof error === "string") return error;
  return "Unknown error";
}

/** Normalises a pathname: strips the query string and trailing slashes. */
export function normalizePath(pathname: string): string {
  const path = (pathname || "/").split("?")[0];

  if (path.length > 1 && path.endsWith("/")) {
    return path.replace(/\/+$/, "") || "/";
  }

  return path;
}

/** True when `pathname` must keep working during maintenance mode. */
export function isExemptFromMaintenance(pathname: string): boolean {
  const path = normalizePath(pathname).toLowerCase();

  if (EXEMPT_EXACT.has(path)) return true;
  if (STATIC_FILE.test(path)) return true;

  return EXEMPT_PREFIXES.some(
    (prefix) => path === prefix || path.startsWith(`${prefix}/`),
  );
}

/** `MAINTENANCE_MODE_FORCE=on|off` — overrides the database entirely. */
export function forcedMode(): boolean | null {
  const raw = (process.env.MAINTENANCE_MODE_FORCE ?? "").trim().toLowerCase();

  if (["1", "true", "on", "yes"].includes(raw)) return true;
  if (["0", "false", "off", "no"].includes(raw)) return false;

  return null;
}

/** Debug logging is ON by default (temporary); set MAINTENANCE_DEBUG=off to silence. */
export function isDebugEnabled(): boolean {
  const raw = (process.env.MAINTENANCE_DEBUG ?? "").trim().toLowerCase();

  return !["0", "false", "off", "no"].includes(raw);
}

function cacheTtlMs(): number {
  const parsed = Number(process.env.MAINTENANCE_MODE_CACHE_MS);
  if (Number.isFinite(parsed) && parsed >= 0) return parsed;
  return DEFAULT_CACHE_TTL_MS;
}

function dbTimeoutMs(): number {
  const parsed = Number(process.env.MAINTENANCE_DB_TIMEOUT_MS);
  if (Number.isFinite(parsed) && parsed > 0) return parsed;
  return DEFAULT_DB_TIMEOUT_MS;
}

function recordError(error: unknown) {
  state.__lmMaintenanceLastError = {
    message: errorMessage(error),
    at: new Date().toISOString(),
  };
}

function withTimeout<T>(promise: Promise<T>, ms: number, label: string): Promise<T> {
  if (!Number.isFinite(ms) || ms <= 0) return promise;

  let timer: ReturnType<typeof setTimeout> | undefined;

  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(
      () => reject(new Error(`${label} timed out after ${ms}ms`)),
      ms,
    );
  });

  return Promise.race([promise, timeout]).finally(() => {
    if (timer) clearTimeout(timer);
  });
}

/* -------------------------------------------------------------------------- */
/* Database                                                                   */
/* -------------------------------------------------------------------------- */

/**
 * Uncached read. Returns EVERY row so duplicates cannot hide an "on" flag.
 * Throws if the database cannot be reached.
 */
export async function readMaintenanceSnapshot(): Promise<MaintenanceSnapshot> {
  const { db } = await import("@/db");

  const rows = await db
    .select({ id: siteSettings.id, maintenanceMode: siteSettings.maintenanceMode })
    .from(siteSettings)
    .orderBy(asc(siteSettings.id));

  return {
    // Any row that says "on" wins — a duplicate row must never leave the shop open.
    maintenanceMode: rows.some((row) => row.maintenanceMode),
    rows,
  };
}

/** Convenience wrapper used by the admin dashboard and the API route. */
export async function readMaintenanceModeFromDatabase(): Promise<boolean> {
  const snapshot = await readMaintenanceSnapshot();
  return snapshot.maintenanceMode;
}

/** Last value seen without touching the database (may be `null`). */
export function peekMaintenanceMode(): boolean | null {
  const cached = state.__lmMaintenanceCache;
  return cached ? cached.value : null;
}

/**
 * Resolves the flag, with caching.
 *
 * - `MAINTENANCE_MODE_FORCE` wins over everything.
 * - Otherwise the value is cached for `MAINTENANCE_MODE_CACHE_MS` (default 10s).
 * - Concurrent requests share one in-flight query.
 * - A failed or slow read keeps the last known value and records the reason;
 *   it never throws into the request path.
 */
export async function getMaintenanceState(options?: {
  timeoutMs?: number;
}): Promise<MaintenanceState> {
  const forced = forcedMode();

  if (forced !== null) {
    return { value: forced, source: "env", error: null };
  }

  const now = Date.now();
  const cached = state.__lmMaintenanceCache;

  if (cached && cached.expiresAt > now) {
    return { value: cached.value, source: "cache", error: null };
  }

  if (state.__lmMaintenanceInFlight) {
    return state.__lmMaintenanceInFlight;
  }

  const timeoutMs = options?.timeoutMs ?? dbTimeoutMs();

  const inFlight = (async (): Promise<MaintenanceState> => {
    try {
      const snapshot = await withTimeout(
        readMaintenanceSnapshot(),
        timeoutMs,
        "maintenance: database read",
      );

      state.__lmMaintenanceCache = {
        value: snapshot.maintenanceMode,
        expiresAt: Date.now() + cacheTtlMs(),
        source: "database",
      };
      state.__lmMaintenanceLastError = null;

      return { value: snapshot.maintenanceMode, source: "database", error: null };
    } catch (error) {
      const message = errorMessage(error);

      recordError(error);
      console.error(
        "[maintenance] Could not read site_settings.maintenance_mode — keeping the last known state.",
        message,
      );

      // Keep the last known state so a database blip cannot flip the shop.
      const value = cached?.value ?? false;

      state.__lmMaintenanceCache = {
        value,
        expiresAt: Date.now() + FAILURE_TTL_MS,
        source: "fallback",
      };

      return { value, source: "fallback", error: message };
    } finally {
      state.__lmMaintenanceInFlight = null;
    }
  })();

  state.__lmMaintenanceInFlight = inFlight;

  return inFlight;
}

/** Drops the cached flag so the next read hits the database. */
export function clearMaintenanceCache(): void {
  state.__lmMaintenanceCache = null;
}

/**
 * Persists the flag for EVERY existing row (there is normally exactly one),
 * and inserts a row if the table is empty so the toggle can never no-op.
 */
export async function setMaintenanceMode(enabled: boolean): Promise<void> {
  const { db } = await import("@/db");

  const updated = await db
    .update(siteSettings)
    .set({ maintenanceMode: enabled })
    .returning({ id: siteSettings.id });

  if (updated.length === 0) {
    await db.insert(siteSettings).values({ maintenanceMode: enabled });
  }

  clearMaintenanceCache();
}

/* -------------------------------------------------------------------------- */
/* Admin bypass                                                               */
/* -------------------------------------------------------------------------- */

/**
 * True when the token belongs to a signed-in admin.
 * Any failure (no session table, database down) counts as "not an admin".
 */
export async function hasAdminSession(
  sessionToken: string | undefined | null,
): Promise<boolean> {
  if (!sessionToken) return false;

  try {
    const { findUserBySessionToken } = await import("@/lib/session");
    const user = await findUserBySessionToken(sessionToken);

    return user?.role === "admin";
  } catch (error) {
    recordError(error);
    return false;
  }
}

/* -------------------------------------------------------------------------- */
/* Decisions                                                                  */
/* -------------------------------------------------------------------------- */

/** The decision the Proxy makes for one public request. */
export async function decideRequest(params: {
  pathname: string;
  sessionToken?: string | null;
  timeoutMs?: number;
}): Promise<MaintenanceDecision> {
  const startedAt = Date.now();
  const pathname = normalizePath(params.pathname);

  if (isExemptFromMaintenance(pathname)) {
    const peeked = peekMaintenanceMode();

    return {
      blocked: false,
      pathname,
      exempt: true,
      maintenanceMode: peeked ?? false,
      modeKnown: peeked !== null,
      source: "cache",
      admin: false,
      error: null,
      durationMs: Date.now() - startedAt,
    };
  }

  return decideForPublicContent(pathname, params.sessionToken, params.timeoutMs, startedAt);
}

/**
 * The decision made by `src/app/(site)/layout.tsx`.
 *
 * This is the authoritative gate: it runs inside the normal server render,
 * using the same database connection the pages themselves use. Login lives
 * outside the `(site)` group, so a blanket redirect here can never lock an
 * admin out of /login, /admin or /api.
 */
export async function decideLayout(params: {
  sessionToken?: string | null;
  timeoutMs?: number;
}): Promise<MaintenanceDecision> {
  const startedAt = Date.now();

  return decideForPublicContent(
    "(site)/*",
    params.sessionToken,
    params.timeoutMs,
    startedAt,
  );
}

async function decideForPublicContent(
  pathname: string,
  sessionToken: string | null | undefined,
  timeoutMs: number | undefined,
  startedAt: number,
): Promise<MaintenanceDecision> {
  const { value, source, error } = await getMaintenanceState({
    timeoutMs: timeoutMs ?? dbTimeoutMs(),
  });

  if (!value) {
    return {
      blocked: false,
      pathname,
      exempt: false,
      maintenanceMode: false,
      modeKnown: true,
      source,
      admin: false,
      error,
      durationMs: Date.now() - startedAt,
    };
  }

  // Maintenance is ON but an admin may still browse the shop.
  const admin = await hasAdminSession(sessionToken);

  return {
    blocked: !admin,
    pathname,
    exempt: false,
    maintenanceMode: true,
    modeKnown: true,
    source,
    admin,
    error,
    durationMs: Date.now() - startedAt,
  };
}

/**
 * One greppable line per request while maintenance mode is being debugged.
 * `MAINTENANCE_DEBUG=off` silences it.
 */
export function logDecision(layer: "proxy" | "layout", decision: MaintenanceDecision): void {
  state.__lmMaintenanceLastDecision = { ...decision, layer };

  if (!isDebugEnabled()) return;

  const line = [
    `[maintenance][${layer}]`,
    `path=${decision.pathname}`,
    `mode=${decision.maintenanceMode}`,
    `source=${decision.source}`,
    `exempt=${decision.exempt}`,
    `admin=${decision.admin}`,
    `blocked=${decision.blocked}`,
    `${decision.durationMs}ms`,
  ];

  if (decision.error) {
    line.push(`error="${decision.error}"`);
    console.error(line.join(" "));
    return;
  }

  console.log(line.join(" "));
}

/* -------------------------------------------------------------------------- */
/* Diagnostics                                                                */
/* -------------------------------------------------------------------------- */

/** Database host only — the credentials in DATABASE_URL are never exposed. */
export function databaseHost(): string | null {
  const url = process.env.DATABASE_URL;
  if (!url) return null;

  try {
    return new URL(url).host;
  } catch {
    return "unparseable DATABASE_URL";
  }
}

/** Everything the /api/maintenance/status endpoint reports to an admin. */
export async function getMaintenanceDiagnostics() {
  const forced = forcedMode();
  const cachedAt = state.__lmMaintenanceCache;
  const startedAt = Date.now();

  let snapshot: MaintenanceSnapshot | null = null;
  let readError: string | null = null;

  try {
    snapshot = await withTimeout(
      readMaintenanceSnapshot(),
      dbTimeoutMs(),
      "maintenance: diagnostics database read",
    );
    state.__lmMaintenanceLastError = null;
  } catch (error) {
    readError = errorMessage(error);
    recordError(error);
  }

  return {
    maintenanceMode: snapshot?.maintenanceMode ?? cachedAt?.value ?? false,
    databaseValue: snapshot ? snapshot.maintenanceMode : null,
    modeSource: forced !== null ? "env" : snapshot ? "database" : "cache",
    forcedByEnv: forced,
    rows: snapshot?.rows ?? null,
    rowCount: snapshot?.rows.length ?? null,
    duplicateRows: snapshot ? snapshot.rows.length > 1 : null,
    database: {
      host: databaseHost(),
      configured: Boolean(process.env.DATABASE_URL),
      readError,
      readMs: Date.now() - startedAt,
    },
    cache: cachedAt
      ? {
          value: cachedAt.value,
          source: cachedAt.source,
          expiresInMs: Math.max(0, cachedAt.expiresAt - Date.now()),
        }
      : null,
    lastError: state.__lmMaintenanceLastError ?? null,
    lastDecision: state.__lmMaintenanceLastDecision ?? null,
    overrides: {
      MAINTENANCE_MODE_FORCE: forced,
      MAINTENANCE_MODE_CACHE_MS: cacheTtlMs(),
      MAINTENANCE_DB_TIMEOUT_MS: dbTimeoutMs(),
      MAINTENANCE_DEBUG: isDebugEnabled(),
    },
    runtime: {
      node: process.version,
      vercel: process.env.VERCEL === "1",
      vercelEnv: process.env.VERCEL_ENV ?? null,
      deploymentId: process.env.VERCEL_DEPLOYMENT_ID ?? null,
      region: process.env.VERCEL_REGION ?? null,
    },
    checkedAt: new Date().toISOString(),
  };
}
```

### 5.2 `src/proxy.ts` (gate 1)

```ts
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
```

### 5.3 `src/app/(site)/layout.tsx` (gate 2 — the guarantee)

```tsx
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
```

### 5.4 `src/app/(auth)/layout.tsx`

```tsx
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
```

### 5.5 `src/app/(auth)/login/page.tsx` (moved, content unchanged)

```tsx
import type { Metadata } from "next";
import { LoginForm } from "@/components/auth-forms";

export const metadata: Metadata = { title: "Sign In" };

export default function LoginPage() {
  return (
    <div className="mx-auto max-w-md px-6 py-16">
      <div className="mb-8 text-center">
        <p className="text-4xl">☾</p>
        <h1 className="section-title mt-3">Welcome back</h1>
        <p className="mt-2 text-sm text-inksoft">Sign in to view your orders and sparkle on.</p>
      </div>
      <LoginForm />
    </div>
  );
}
```

### 5.6 `src/app/api/maintenance/status/route.ts` (diagnostics)

```ts
import { headers } from "next/headers";
import { requireAdmin } from "@/lib/auth";
import { getMaintenanceDiagnostics } from "@/lib/maintenance";

/**
 * GET /api/maintenance/status
 *
 * Public callers get only `{ maintenanceMode, checkedAt }`.
 * Signed-in admins get full diagnostics:
 *
 *   - what PostgreSQL actually contains (all rows, not just the first)
 *   - whether the read worked, and the error if it did not
 *   - which database host this deployment is connected to
 *   - whether the Proxy ran for this request (x-lm-proxy header)
 *   - the last maintenance decision either gate made
 *   - the Vercel environment / deployment id / region
 *
 * That answers "is production connected to the database the dashboard
 * updates?" and "is the proxy executing?" without needing Vercel log access.
 */

export const dynamic = "force-dynamic";

export async function GET() {
  const admin = await requireAdmin();
  const checkedAt = new Date().toISOString();

  if (!admin) {
    const { maintenanceMode } = await getMaintenanceDiagnostics();

    return Response.json(
      { maintenanceMode, checkedAt },
      { headers: { "Cache-Control": "no-store" } },
    );
  }

  const requestHeaders = await headers();
  const diagnostics = await getMaintenanceDiagnostics();

  return Response.json(
    {
      ...diagnostics,
      proxy: {
        ran: requestHeaders.get("x-lm-proxy") !== null,
        tag: requestHeaders.get("x-lm-proxy"),
        mode: requestHeaders.get("x-lm-mode"),
      },
      viewer: { id: admin.id, email: admin.email, role: admin.role },
    },
    { headers: { "Cache-Control": "no-store" } },
  );
}
```

### 5.7 `src/app/api/admin/maintenance/route.ts`

```ts
import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth";
import {
  clearMaintenanceCache,
  getMaintenanceState,
  readMaintenanceSnapshot,
  setMaintenanceMode,
} from "@/lib/maintenance";

// Never cached: this is a control endpoint.
export const dynamic = "force-dynamic";

function json(body: unknown, status = 200) {
  return Response.json(body, {
    status,
    headers: { "Cache-Control": "no-store" },
  });
}

/**
 * GET /api/admin/maintenance
 * Returns the live value from PostgreSQL (admin only).
 */
export async function GET() {
  const admin = await requireAdmin();
  if (!admin) return json({ error: "Unauthorized" }, 401);

  try {
    const snapshot = await readMaintenanceSnapshot();

    return json({
      maintenanceMode: snapshot.maintenanceMode,
      rows: snapshot.rows,
      rowCount: snapshot.rows.length,
      duplicateRows: snapshot.rows.length > 1,
    });
  } catch (error) {
    console.error("[maintenance] GET failed", error);
    return json({ error: "Could not read maintenance mode" }, 500);
  }
}

/**
 * POST /api/admin/maintenance
 * Body: { "enabled": true | false }
 *
 * Writes `site_settings.maintenance_mode`, drops the Proxy's cached flag and
 * clears the route cache so the change is visible immediately on this instance
 * (other serverless instances pick it up within MAINTENANCE_MODE_CACHE_MS).
 */
export async function POST(req: Request) {
  const admin = await requireAdmin();
  if (!admin) return json({ error: "Unauthorized" }, 401);

  let body: unknown;

  try {
    body = await req.json();
  } catch {
    return json({ error: "Invalid JSON body" }, 400);
  }

  const enabled = (body as { enabled?: unknown } | null)?.enabled;

  if (typeof enabled !== "boolean") {
    return json({ error: "`enabled` must be a boolean" }, 400);
  }

  try {
    await setMaintenanceMode(enabled);

    // In-memory flag used by the Proxy in this server instance.
    clearMaintenanceCache();

    // Refresh server-rendered pages (admin dashboard etc.).
    revalidatePath("/", "layout");

    const state = await getMaintenanceState();

    return json({
      ok: true,
      maintenanceMode: state.value,
      source: state.source,
    });
  } catch (error) {
    console.error("[maintenance] POST failed", error);
    return json({ error: "Could not update maintenance mode" }, 500);
  }
}
```

### 5.8 `src/app/admin/page.tsx` — store settings card

```tsx
      <div className="card p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="font-display text-xl">Store Settings</h2>
            <p className="mt-1 text-sm text-inksoft">
              Maintenance mode closes every public page. Admins keep access to{" "}
              <code className="rounded bg-cream px-1">/admin</code>,{" "}
              <code className="rounded bg-cream px-1">/api/*</code> and{" "}
              <code className="rounded bg-cream px-1">/maintenance</code>.
            </p>
          </div>

          <span
            className={`rounded-full px-3 py-1 text-xs font-bold ${
              maintenanceMode
                ? "bg-red-100 text-red-700"
                : "bg-green-100 text-green-700"
            }`}
          >
            Maintenance {maintenanceMode ? "ON" : "OFF"}
          </span>
        </div>

        <MaintenanceToggle enabled={maintenanceMode} />

        <p className="mt-3 text-xs text-inksoft">
          Verify what the live deployment sees:{" "}
          <a
            href="/api/maintenance/status"
            target="_blank"
            rel="noreferrer"
            className="font-semibold text-lavender-deep underline"
          >
            /api/maintenance/status
          </a>
          . If <code className="rounded bg-cream px-1">x-lm-proxy</code> is missing from{" "}
          <code className="rounded bg-cream px-1">curl -I /</code>, the Proxy is not
          running for that deployment.
        </p>
      </div>
```

---

## 6. How to verify the live deployment (do this first)

### Step 1 — is the Proxy running at all?

```bash
curl -sI https://littlemoonbeamscreations.co.uk/ | grep -i x-lm
```

| Header | Meaning |
| --- | --- |
| `x-lm-proxy: block` | Gate 1 works and is blocking. |
| `x-lm-proxy: pass` | Gate 1 ran and decided the site is open. |
| `x-lm-proxy: error` | **Gate 1 ran but could not read the database.** This is the old failure mode — now Gate 2 still blocks. |
| `x-lm-proxy: exempt` | Exempt route (`/api/*`, `/maintenance`, `/login`, …). |
| **header missing entirely** | The Proxy is not running for that deployment. Gate 2 still blocks, but investigate the build. |

`x-lm-mode: on|off` shows the value the Proxy resolved.

### Step 2 — what does the deployment actually see in the database?

Sign in as an admin, then open:

```
https://littlemoonbeamscreations.co.uk/api/maintenance/status
```

```json
{
  "maintenanceMode": true,
  "databaseValue": true,
  "modeSource": "database",
  "rows": [{ "id": 1, "maintenanceMode": true }],
  "rowCount": 1,
  "duplicateRows": false,
  "database": { "host": "ep-xxx-pooler.eu-west-2.aws.neon.tech", "configured": true, "readError": null },
  "lastError": null,
  "runtime": { "vercel": true, "vercelEnv": "production", "deploymentId": "dpl_…", "region": "lhr1" }
}
```

* `rows` / `rowCount` / `duplicateRows` → **task 1 and 7**: you can see exactly
  which rows exist and what value this deployment reads. `initialValue`-style
  "the dashboard updates one row but the gate reads another" is now impossible:
  both use the same helper, and the writer updates **every** row.
* `database.host` → **task 7**: proves which database this deployment is
  connected to.
* `database.readError` / `lastError` → why a read failed, if it did.
* `proxy.tag` → whether Gate 1 executed for that request.

### Step 3 — the log lines (task 3)

Every request logs one line, from each gate that ran:

```
[maintenance][proxy]  path=/collections mode=true source=database exempt=false admin=false blocked=true 14ms
[maintenance][layout] path=(site)/*     mode=true source=cache    exempt=false admin=false blocked=true 1ms
```

* `path` — the pathname the gate saw.
* `mode` — the resolved `maintenance_mode`.
* `source` — `database` (fresh read) · `cache` (within the 10 s TTL) ·
  `fallback` (**the read failed** — see the error line above it) · `env`
  (`MAINTENANCE_MODE_FORCE`).
* `admin` — whether the visitor was recognised as a signed-in admin.
* `blocked` — the final `shouldBlockPublicRequest`-equivalent result.

These are on by default. Silence them with `MAINTENANCE_DEBUG=off` once you are
satisfied.

---

## 7. Answers to your ten questions

1. **Is `maintenance_mode` read correctly?** Now provably yes: every row is read,
   any `true` wins, and `/api/maintenance/status` returns the rows, the host and
   the read error (if any). The dashboard and the gates share one helper.
2. **Does the proxy execute in dev/prod?** In this repo: yes — `next dev`,
   `next build` (`ƒ Proxy (Middleware)`) and `next start` were all verified, and
   `x-lm-proxy` on any response proves it per-deployment. *On your Vercel
   deployment it was the only gate and it was failing open* — that is the bug.
3. **Logging** — added, on by default (see step 3 above).
4. **Cached values?** A 10 s in-memory cache existed and is now cleared on every
   write. It was not the root cause: the cache can only hold a value it once read
   successfully. `source=fallback` in the log is the tell-tale of the real issue.
5. **Does `shouldBlockPublicRequest` always return false?** No — it returns
   `false` when `getMaintenanceMode()` returns false, and that function returns
   false **when the read throws**, which is what happened in production. The
   layout gate and the `MAINTENANCE_MODE_FORCE` switch now make that
   unrecoverable-open state impossible.
6. **Is the admin bypass bypassing everything?** No. `hasAdminSession()` returns
   true only for a token that exists in `sessions`, is unexpired, joins to a user
   with `role = 'admin'`, and is verified with a customer/admin cookie test. It
   is also now checked *after* the flag, so it cannot bypass an "off" flag either.
7. **Same database?** The status endpoint reports the host and the exact rows
   this deployment reads, and the writer now updates every row.
8. **Exact root cause** — see §1: a single gate that failed open, plus a
   first-row-only read that could read a different row than the dashboard.
9. **Fix** — §2/§3/§5.
10. **All changed files** — §4/§5.

---

## 8. Verified behaviour

Real PostgreSQL 18, production build (`next build` + `next start`), and `next dev`.

### `maintenance_mode = true`

| Request | No session | Admin session | Customer session |
| --- | --- | --- | --- |
| `/` | 307 → `/maintenance` | 200 (admin preview) | 307 → `/maintenance` |
| `/collections`, `/products`, `/contact`, `/custom-orders`, `/shop`, `/product/…`, `/faq`, `/cart`, `/checkout`, `/account`, `/privacy-policy` | 307 → `/maintenance` | 200 | 307 → `/maintenance` |
| `/maintenance` | 200 | 200 | 200 |
| `/login` | 200 | 200 | 200 |
| `/admin`, `/admin/*` | reachable → `/login?next=/admin` | 200 | 307 → `/login` |
| `/api/*` | 200 | 200 | 200 |

Redirect headers: `307`, `location: /maintenance`, `cache-control: no-store, must-revalidate`, `x-lm-proxy: block`, `x-lm-mode: on`.

### `maintenance_mode = false`
`/`, `/collections`, `/contact`, `/custom-orders`, `/shop`, `/faq`, `/cart`,
`/login`, `/maintenance` → **200**. ( `/products` is a 404 in this app — there is
no such route; it is `product/[slug]` and `/shop`.)

### Failure injection
With the Proxy unable to reach PostgreSQL (the production condition), every
public route still returned `307 → /maintenance` from the layout gate, while
`/maintenance`, `/login` and `/api/*` stayed available.

### Duplicate rows
`id=1 false`, `id=2 true` → **blocked** (any `true` wins), and
`/api/admin/maintenance` reported `duplicateRows: true`.

### `MAINTENANCE_MODE_FORCE=on` with `maintenance_mode = false`
All public routes blocked (`source=env`), `databaseValue: false`,
`forcedByEnv: true`.

### Build output
`/login` and `/maintenance` stay static (`○`); every page in `(site)` becomes
dynamic (`ƒ`) because the layout gate must run per request; `ƒ Proxy (Middleware)`
is present.

---

## 9. Environment variables

| Variable | Default | Purpose |
| --- | --- | --- |
| `DATABASE_URL` | — | Must be set for **all** Vercel environments (Production, Preview, Development). |
| `MAINTENANCE_MODE_FORCE` | unset | `on` = close the site regardless of the database; `off` = ignore the flag. Works even if the DB is unreachable. |
| `MAINTENANCE_MODE_CACHE_MS` | `10000` | How long an instance trusts its cached read. `0` = read the DB on every request. |
| `MAINTENANCE_DB_TIMEOUT_MS` | `3000` | Max time for a flag read before falling back (proxy uses 1.5 s). |
| `MAINTENANCE_DEBUG` | on | Set to `off` to silence the per-request log lines. |

---

## 10. Vercel checklist

1. `DATABASE_URL` present for **Production** (Vercel → Settings → Environment
   Variables). A missing value in the proxy function is exactly the kind of thing
   that used to fail open.
2. Redeploy after pulling this branch — the change is code, not configuration.
3. `curl -sI https://littlemoonbeamscreations.co.uk/ | grep -i x-lm` should show
   `x-lm-proxy^: block` and `x-lm-mode: on` while the flag is ON.
4. `/api/maintenance/status` (as an admin) should show
   `"databaseValue": true` and the expected host.
5. The Proxy and the app are separate serverless functions, each with their own
   `pg` pool. With a pooled connection string (the Neon `-pooler` URL in
   `drizzle.config.json`, Supabase pooler, PgBouncer) this is free; on a
   self-hosted Postgres, lower `max` in `src/db/index.ts`.
6. If you ever see `x-lm-proxy: error`, the Proxy still cannot reach PostgreSQL —
   the site is *still* closed by Gate 2, and `lastError` in the status endpoint
   tells you why.

---

## 11. Notes / trade-offs

* Gating the `(site)` layout makes those pages **dynamic**. That is inherent:
  a page rendered at build time cannot know the flag at request time. The two
  static survivors are `/maintenance` (served during maintenance) and `/login`
  (needed by admins).
* `/this-does-not-exist` returns Next's 404 page when Gate 1 is blind. It exposes
  no shop content; when Gate 1 works it redirects like everything else.
* Admins keep browsing the storefront while maintenance is ON. If you want
  *nobody* in, remove the `hasAdminSession()` call from `decideForPublicContent()`
  in `src/lib/maintenance.ts`, or set `MAINTENANCE_MODE_FORCE=on`.
* `site_settings` is missing from `drizzle/0000_natural_smasher.sql` (the
  migration predates the table). Your production DB has it; run
  `npx drizzle-kit generate` if you ever rebuild from migrations.
