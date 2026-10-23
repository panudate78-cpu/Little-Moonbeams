# Maintenance Mode — Next.js 16 (App Router)

A complete, tested maintenance-mode system for this repo.

**Goal**

| `site_settings.maintenance_mode` | Result |
| --- | --- |
| `false` | The whole site works normally |
| `true` | Every public URL 307-redirects to `/maintenance`; `/admin`, `/admin/*`, `/api/*`, `/maintenance` and `/login` keep working |

---

## 1. TL;DR — what was actually broken

Your `middleware.ts` was in the **repository root**:

```
Little-Moonbeams/
├── app/  ← actually src/app/
├── middleware.ts   ← ignored by the Next 16 compiler/runtime
└── src/
    └── app/
```

This project uses a `src/` directory. In Next.js 16 the Proxy (formerly
Middleware) file is resolved **relative to the source root** — i.e. `src/`.
A root-level `middleware.ts` is still *discovered* (it even appeared in
`.next/dev/server/middleware-manifest.json`), but it is **never invoked** for
requests routed to `src/app`.

That is exactly why `throw new Error("MIDDLEWARE TEST")` produced
`GET / 200` instead of a 500: the code simply never ran.

Verified in this repo with Next.js 16.2.6:

| File location | `GET /` with the same file |
| --- | --- |
| `middleware.ts` (repo root) | `200`, body = the storefront, no log line |
| `src/middleware.ts` | `307 → /maintenance`, log line printed |
| `src/proxy.ts` (recommended) | `307 → /maintenance`, log line printed |

Two further Next 16 facts matter here:

1. **`middleware` has been renamed to `proxy`.** Next 16 logs
   `⚠ The "middleware" file convention is deprecated. Please use "proxy" instead.`
   The file is `src/proxy.ts`, the function is `proxy()` (default export or
   named `proxy`).
2. **Proxy now runs on the Node.js runtime by default.** That means it can use
   `pg` / Drizzle ORM directly — no Edge restrictions, no "fetch an internal
   API route" workaround, no duplicated flag in a cookie or in Edge Config.
   (Route-segment config such as `export const runtime = 'nodejs'` is *not
   allowed* in the Proxy file — Node is already the default.)

So: **Proxy is the correct Next.js 16 App Router solution** — the previous
attempt failed because of the file location, not because middleware/proxy is
the wrong tool.

---

## 2. Architecture

```
Browser ──► Vercel ──► src/proxy.ts  ──────────────► route
                       │  (Node runtime)
                       │
                       │ 1. is the path exempt?  /admin, /api, /maintenance, /login,
                       │    /_next, static files        ──► allow (next())
                       │
                       │ 2. read site_settings.maintenance_mode
                       │    (Drizzle + pg, cached ~10 s per instance)
                       │        false ──────────────────► allow (next())
                       │        true
                       │ 3. is the visitor a signed-in admin?
                       │        yes ────────────────────► allow (next())
                       │        no
                       └────────────────► 307 + Cache-Control: no-store
                                          Location: /maintenance
```

One enforcement point, one DB read (cached), zero per-route changes. Nothing in
`(site)/*` knows that maintenance mode exists.

---

## 3. Files

| File | Status | Why |
| --- | --- | --- |
| `src/proxy.ts` | **new** | The gate. Lives next to `app/` so Next actually runs it. |
| `src/lib/maintenance.ts` | **new** | Single source of truth: exempt-path rules, cached flag read, writable flag, admin check. |
| `src/lib/session.ts` | **new** | Token → user lookup shared by `auth.ts` **and** the Proxy (the Proxy has no `cookies()` helper). |
| `src/lib/auth.ts` | modified | Re-uses `session.ts` instead of duplicating the query; exports `SESSION_COOKIE`. |
| `src/app/api/admin/maintenance/route.ts` | rewritten | Real `UPDATE … WHERE id`, insert-if-missing, validation, cache invalidation, `GET` for the UI. |
| `src/components/admin/maintenance-toggle.tsx` | rewritten | Pending/error states, disables the button that matches the current state. |
| `src/app/admin/page.tsx` | small edit | Toggle was rendered *inside* the status badge; moved it into the card. |
| `src/app/maintenance/page.tsx` | modified | `noindex` metadata + copy; still a plain page outside `(site)`. |
| `src/app/(site)/page.tsx` | modified | Removed the homepage-replacement hack (`return <MaintenancePage />;`) — requirement #11. |
| `middleware.ts` (root) | **deleted** | Superseded by `src/proxy.ts`. |

No other route, page, layout, API route or config file had to change.

---

## 4. Complete code

### 4.1 `src/proxy.ts` (new)

```ts
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
```

### 4.2 `src/lib/maintenance.ts` (new)

```ts
import { asc, eq } from "drizzle-orm";
import { siteSettings } from "@/db/schema";

/**
 * ---------------------------------------------------------------------------
 * Maintenance mode
 * ---------------------------------------------------------------------------
 * Single source of truth for "is the public site closed?".
 *
 * Used by:
 *   - src/proxy.ts                              (the actual request gate)
 *   - src/app/api/admin/maintenance/route.ts    (read + write)
 *
 * The flag lives in `site_settings.maintenance_mode` (one row).
 *
 * IMPORTANT: this module is imported by the Proxy (Next.js 16 runs Proxy on
 * the Node.js runtime), so it must not import `next/headers`, `next/cache`
 * or anything else that only exists inside a React Server Component render.
 *
 * `@/db` is imported *lazily* on purpose: `src/db/index.ts` throws at import
 * time when DATABASE_URL is missing. A static import would therefore crash the
 * Proxy (and with it every single request, including /maintenance). Importing
 * it inside the function keeps that failure contained and lets us "fail open".
 */

export const MAINTENANCE_PATH = "/maintenance";

/**
 * Paths that stay reachable while maintenance mode is ON.
 *
 * `/admin`  and `/admin/*`  -> the dashboard used to switch it back off
 * `/api`    and `/api/*`    -> route handlers (auth, admin, checkout, health…)
 * `/maintenance`            -> the page visitors are redirected to
 * `/login`                  -> otherwise an admin could never sign in to /admin
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

/** When the database read fails, back off briefly instead of retrying every request. */
const FAILURE_TTL_MS = 2_000;

type FlagCache = { value: boolean; expiresAt: number };

/**
 * Kept on `globalThis` so dev-mode hot reloads / multiple module instances
 * share one cache instead of multiplying database queries.
 */
const state = globalThis as typeof globalThis & {
  __lmMaintenanceCache?: FlagCache | null;
  __lmMaintenanceInFlight?: Promise<boolean> | null;
  __lmMaintenanceLastErrorLog?: number;
};

/** Removes the last path segment duplicates and trailing slashes. */
export function normalizePath(pathname: string): string {
  const path = (pathname || "/").split("?")[0];

  if (path.length > 1 && path.endsWith("/")) {
    return path.replace(/\/+$/, "") || "/";
  }

  return path;
}

/**
 * True when `pathname` must keep working during maintenance mode.
 */
export function isExemptFromMaintenance(pathname: string): boolean {
  const path = normalizePath(pathname).toLowerCase();

  if (EXEMPT_EXACT.has(path)) return true;
  if (STATIC_FILE.test(path)) return true;

  return EXEMPT_PREFIXES.some(
    (prefix) => path === prefix || path.startsWith(`${prefix}/`),
  );
}

function cacheTtlMs(): number {
  const parsed = Number(process.env.MAINTENANCE_MODE_CACHE_MS);

  if (Number.isFinite(parsed) && parsed >= 0) return parsed;

  return DEFAULT_CACHE_TTL_MS;
}

function logReadError(error: unknown): void {
  const now = Date.now();
  const last = state.__lmMaintenanceLastErrorLog ?? 0;

  // One log line per minute instead of one per request.
  if (now - last < 60_000) return;

  state.__lmMaintenanceLastErrorLog = now;
  console.error(
    "[maintenance] Could not read site_settings.maintenance_mode — keeping the last known state.",
    error,
  );
}

/**
 * Uncached read straight from PostgreSQL.
 * Throws if the database cannot be reached.
 */
export async function readMaintenanceModeFromDatabase(): Promise<boolean> {
  const { db } = await import("@/db");

  const rows = await db
    .select({ maintenanceMode: siteSettings.maintenanceMode })
    .from(siteSettings)
    .orderBy(asc(siteSettings.id))
    .limit(1);

  // No row yet == maintenance off.
  return rows[0]?.maintenanceMode ?? false;
}

/**
 * Cached read used on the hot path (every request).
 *
 * - Cached for `MAINTENANCE_MODE_CACHE_MS` (default 10s) per server instance.
 * - Concurrent requests share a single in-flight query.
 * - On failure it keeps the last known value (or `false` if there is none) and
 *   retries in 2s. A database hiccup therefore never throws inside the Proxy,
 *   never takes the shop offline, and never keeps it offline either.
 */
export async function getMaintenanceMode(): Promise<boolean> {
  const now = Date.now();
  const cached = state.__lmMaintenanceCache;

  if (cached && cached.expiresAt > now) return cached.value;

  const inFlight =
    state.__lmMaintenanceInFlight ??
    (state.__lmMaintenanceInFlight = (async () => {
      try {
        const value = await readMaintenanceModeFromDatabase();

        state.__lmMaintenanceCache = {
          value,
          expiresAt: Date.now() + cacheTtlMs(),
        };

        return value;
      } catch (error) {
        logReadError(error);

        // Keep the last known state so a database blip cannot flip the shop.
        const value = cached?.value ?? false;
        state.__lmMaintenanceCache = {
          value,
          expiresAt: Date.now() + FAILURE_TTL_MS,
        };

        return value;
      } finally {
        state.__lmMaintenanceInFlight = null;
      }
    })());

  return inFlight;
}

/** Drops the cached flag so the next read hits the database. */
export function clearMaintenanceCache(): void {
  state.__lmMaintenanceCache = null;
}

/**
 * Persists the flag. Updates the existing row (there is normally exactly one),
 * and inserts it if the table is empty so the toggle can never silently no-op.
 */
export async function setMaintenanceMode(enabled: boolean): Promise<void> {
  const { db } = await import("@/db");

  const existing = await db
    .select({ id: siteSettings.id })
    .from(siteSettings)
    .orderBy(asc(siteSettings.id))
    .limit(1);

  if (existing[0]) {
    await db
      .update(siteSettings)
      .set({ maintenanceMode: enabled })
      .where(eq(siteSettings.id, existing[0].id));
  } else {
    await db.insert(siteSettings).values({ maintenanceMode: enabled });
  }

  clearMaintenanceCache();
}

/**
 * True when the request carries a valid session belonging to an admin.
 *
 * Admins are never locked out: they can browse the storefront while
 * maintenance mode is ON (handy for checking the shop before re-opening).
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
    logReadError(error);
    return false;
  }
}

/**
 * The decision the Proxy makes for one request.
 */
export async function shouldBlockPublicRequest(
  pathname: string,
  sessionToken?: string | null,
): Promise<boolean> {
  if (isExemptFromMaintenance(pathname)) return false;
  if (!(await getMaintenanceMode())) return false;
  if (await hasAdminSession(sessionToken)) return false;

  return true;
}
```

### 4.3 `src/lib/session.ts` (new)

```ts
import { db } from "@/db";
import { sessions, users, type User } from "@/db/schema";
import { and, eq, gt } from "drizzle-orm";

/**
 * Name of the session cookie. Kept in its own module (no `next/headers`
 * import) so it can also be imported by `src/proxy.ts`, which only has
 * access to `request.cookies`.
 */
export const SESSION_COOKIE = "lm_session";

/**
 * Looks up the user that owns a session token.
 * Returns null for unknown / expired tokens.
 */
export async function findUserBySessionToken(
  token: string | undefined | null,
): Promise<User | null> {
  if (!token) return null;

  const rows = await db
    .select({ user: users })
    .from(sessions)
    .innerJoin(users, eq(sessions.userId, users.id))
    .where(and(eq(sessions.token, token), gt(sessions.expiresAt, new Date())))
    .limit(1);

  return rows[0]?.user ?? null;
}
```

### 4.4 `src/lib/auth.ts` (modified)

```ts
import "server-only";
import crypto from "crypto";
import { cookies } from "next/headers";
import { db } from "@/db";
import { sessions, type User } from "@/db/schema";
import { eq } from "drizzle-orm";
import { SESSION_COOKIE, findUserBySessionToken } from "@/lib/session";

const SESSION_DAYS = 30;

export { SESSION_COOKIE };

export function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16).toString("hex");
  const hash = crypto.scryptSync(password, salt, 64).toString("hex");
  return `${salt}:${hash}`;
}

export function verifyPassword(password: string, stored: string): boolean {
  const [salt, hash] = stored.split(":");
  if (!salt || !hash) return false;
  const candidate = crypto.scryptSync(password, salt, 64);
  const expected = Buffer.from(hash, "hex");
  if (candidate.length !== expected.length) return false;
  return crypto.timingSafeEqual(candidate, expected);
}

export async function createSession(userId: number): Promise<void> {
  const token = crypto.randomBytes(48).toString("hex");
  const expiresAt = new Date(Date.now() + SESSION_DAYS * 24 * 60 * 60 * 1000);
  await db.insert(sessions).values({ token, userId, expiresAt });
  const store = await cookies();
  store.set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    expires: expiresAt,
  });
}

export async function destroySession(): Promise<void> {
  const store = await cookies();
  const token = store.get(SESSION_COOKIE)?.value;
  if (token) {
    await db.delete(sessions).where(eq(sessions.token, token));
  }
  store.delete(SESSION_COOKIE);
}

export async function getCurrentUser(): Promise<User | null> {
  try {
    const store = await cookies();
    const token = store.get(SESSION_COOKIE)?.value;

    // The lookup itself lives in `@/lib/session` so the Proxy can reuse it.
    return await findUserBySessionToken(token);
  } catch {
    return null;
  }
}

export async function requireAdmin(): Promise<User | null> {
  const user = await getCurrentUser();
  if (!user || user.role !== "admin") return null;
  return user;
}
```

### 4.5 `src/app/api/admin/maintenance/route.ts` (rewritten)

```ts
import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth";
import {
  clearMaintenanceCache,
  getMaintenanceMode,
  readMaintenanceModeFromDatabase,
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
    const maintenanceMode = await readMaintenanceModeFromDatabase();
    return json({ maintenanceMode });
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

    return json({ ok: true, maintenanceMode: await getMaintenanceMode() });
  } catch (error) {
    console.error("[maintenance] POST failed", error);
    return json({ error: "Could not update maintenance mode" }, 500);
  }
}
```

### 4.6 `src/components/admin/maintenance-toggle.tsx` (rewritten)

```tsx
"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

type Props = {
  enabled: boolean;
};

export function MaintenanceToggle({ enabled }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const working = busy || isPending;

  async function update(value: boolean) {
    if (
      value &&
      !window.confirm(
        "Turn maintenance mode ON?\n\nVisitors will be redirected to /maintenance. Admins keep full access.",
      )
    ) {
      return;
    }

    setBusy(true);
    setError(null);

    try {
      const response = await fetch("/api/admin/maintenance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ enabled: value }),
        cache: "no-store",
      });

      if (!response.ok) {
        const data = (await response.json().catch(() => null)) as
          | { error?: string }
          | null;
        throw new Error(data?.error ?? `Request failed (${response.status})`);
      }

      // Re-render the dashboard so the badge picks up the new value.
      startTransition(() => router.refresh());
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Something went wrong");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mt-4">
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={() => update(true)}
          disabled={working || enabled}
          className="btn-primary !px-5 !py-2 text-xs disabled:opacity-40"
        >
          {working && !enabled ? "Turning on…" : "Turn ON"}
        </button>

        <button
          type="button"
          onClick={() => update(false)}
          disabled={working || !enabled}
          className="btn-outline !px-5 !py-2 text-xs disabled:opacity-40"
        >
          {working && enabled ? "Turning off…" : "Turn OFF"}
        </button>

        <span className="text-xs text-inksoft">
          {enabled ? "Storefront is closed to visitors." : "Storefront is live."}
        </span>
      </div>

      {error && (
        <p role="alert" className="mt-2 text-xs font-semibold text-red-600">
          {error}
        </p>
      )}
    </div>
  );
}
```

### 4.7 `src/app/maintenance/page.tsx` (modified)

```tsx
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "We'll be back shortly",
  description:
    "Little Moonbeam's Creations is being updated. Please check back shortly.",
  robots: {
    // Never let search engines index the maintenance page.
    index: false,
    follow: false,
  },
};

/**
 * Shown to every visitor while `site_settings.maintenance_mode = true`.
 *
 * This route lives OUTSIDE the `(site)` route group and is exempt in
 * `src/proxy.ts`, so it can never redirect to itself (no loop).
 */
export default function MaintenancePage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-ivory px-6">
      <div className="max-w-lg text-center">
        <p className="text-4xl text-lavender">☾</p>

        <h1 className="mt-4 font-display text-5xl sm:text-6xl">
          Little Moonbeam&apos;s Creations
        </h1>

        <p className="mt-6 text-xl leading-relaxed">
          Our little shop is currently being polished.
          We&apos;re adding new treasures, product photography and a few finishing
          touches.
        </p>

        <p className="mt-3 text-inksoft">Please check back shortly ✦</p>
      </div>
    </div>
  );
}
```

### 4.8 `src/app/admin/page.tsx` (only the Store Settings card changed)

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
      </div>
```

### 4.9 `src/app/(site)/page.tsx` (homepage hack removed)

```diff
-import MaintenancePage from "../maintenance/page";
 import Image from "next/image";
@@
 export default async function HomePage() {
-  return <MaintenancePage />;
   const [featured, newArrivals, bestsellers, collections, testimonials] = await Promise.all([
```

(`return <MaintenancePage />;` made everything below it dead code, which is why
the storefront could never render. The stray `/` text node that sat in the hero
`<div>` was also removed.)

### 4.10 `middleware.ts` (root) — delete

```bash
git rm middleware.ts
```

Do **not** keep both a `middleware` and a `proxy` file: Next 16 throws
`E900: Both middleware file … and proxy file … are detected`.

---

## 5. Behaviour matrix (all verified against this repo)

Maintenance **OFF**

| Request | Result |
| --- | --- |
| `/`, `/shop`, `/collections`, `/contact`, `/custom-orders`, `/faq`, `/cart`, `/checkout`, … | `200` |
| `/api/health`, `/api/products`, … | `200` |
| `/admin` (no cookie) | `307 → /login?next=/admin` (unchanged) |

Maintenance **ON**, no session cookie

| Request | Result |
| --- | --- |
| `/` | `307 → /maintenance` |
| `/collections`, `/products`, `/contact`, `/custom-orders`, `/shop`, `/product/…`, `/faq`, `/cart`, `/account`, `/checkout`, `/privacy-policy` | `307 → /maintenance` |
| **statically generated** pages (`/faq`, `/terms`, `/contact` …) | `307 → /maintenance` (the Proxy runs in front of the CDN cache) |
| `/maintenance` | `200` |
| `/login` | `200` (an admin must be able to sign in) |
| `/admin`, `/admin/products` | reachable; redirects to `/login` only because the admin layout requires a session |
| `/api/*` | `200` |
| `/_next/*` assets, images, `/favicon.ico`, `/robots.txt`, `/sitemap.xml` | `200` |
| `HEAD /contact`, RSC/prefetch requests | `307 → /maintenance` |

Maintenance **ON**, with cookies

| Request | Result |
| --- | --- |
| `/` with an **admin** session cookie | `200` — admins can preview the shop |
| `/admin` with an admin session cookie | `200` |
| `/` with a **customer** session cookie | `307 → /maintenance` |

Redirect response headers:

```
HTTP/1.1 307 Temporary Redirect
cache-control: no-store, must-revalidate
location: /maintenance
x-lm-maintenance: on
```

---

## 6. Why there is no redirect loop

* `/maintenance` is **exempt** (`EXEMPT_EXACT`) — it never redirects to itself.
* The Proxy only ever *redirects to* `/maintenance`; it never *redirects away*
  from it, so there is no A → B → A cycle.
* Prefix matching is segment-aware: `/admin` matches `/admin` and `/admin/...`
  but **not** `/administrator`; same for `/api`.
* `/login` is exempt, otherwise an admin who is logged out during maintenance
  would land on `/login` → `/maintenance` and could never reach `/admin`.
* `307` (temporary) is used deliberately — never `308`. A permanent redirect
  would be cached by browsers and would survive after the shop re-opens.
* `Cache-Control: no-store` on the redirect keeps Vercel's CDN from caching it.

---

## 7. Caching and propagation

| Layer | Behaviour |
| --- | --- |
| Proxy → PostgreSQL | One single-row `SELECT` per server instance per `MAINTENANCE_MODE_CACHE_MS` (default `10 000` ms). Concurrent requests share one in-flight query. |
| Toggle → DB → Proxy | `POST /api/admin/maintenance` writes the row, then calls `clearMaintenanceCache()`, so the instance that served the request flips instantly. Other serverless instances follow within the TTL. |
| DB unreachable | The last known value is reused for 2 s and then retried. A database blip never throws inside the Proxy and never silently flips the store's state. Errors are logged once per minute. |

Want instant propagation everywhere? Drop `MAINTENANCE_MODE_CACHE_MS=0`. You
then trade ~10 s of staleness for one extra single-row query per request.

---

## 8. Local development & Vercel

* **Local**: `npm run dev` (Turbopack) and `next build && next start` were both
  tested. The Proxy is listed in the build output as `ƒ Proxy (Middleware)`.
* **Vercel**: no `vercel.json` changes, no Edge runtime configuration. Proxy
  runs on Node.js in Next 16 and is bundled with `pg`/Drizzle.
* The Proxy is a separate function on Vercel and therefore keeps **its own `pg`
  pool** (`src/db/index.ts`). With a pooled connection string (the Neon
  `-pooler` URL used here, Supabase pooler, PgBouncer…) this is free. On a
  self-hosted Postgres with a low `max_connections`, lower `max` in the pool
  config.
* Make sure `DATABASE_URL` is set in Vercel for **all** environments
  (Production, Preview, Development). If it is missing, `src/db/index.ts`
  throws on import; the maintenance module imports it lazily so the Proxy
  degrades to "maintenance off" instead of crashing every request.
* `/maintenance` is statically rendered and marked `noindex`, so it is fast and
  never shows up in search results.

---

## 9. Smoke test

```bash
# 1. everything is live
curl -I http://localhost:3000/                 # 200

# 2. turn it on (as an admin, from the browser devtools cookie jar: lm_session=…)
curl -X POST http://localhost:3000/api/admin/maintenance \
  -H 'Content-Type: application/json' \
  -b 'lm_session=<your-admin-session-token>' \
  -d '{"enabled":true}'
# {"ok":true,"maintenanceMode":true}

# 3. public routes are closed
curl -I http://localhost:3000/
# HTTP/1.1 307 Temporary Redirect … location: /maintenance
curl -I http://localhost:3000/collections
curl -I http://localhost:3000/contact

# 4. the allowed routes still work
curl -I http://localhost:3000/maintenance          # 200
curl -I http://localhost:3000/login                # 200
curl -I http://localhost:3000/api/health           # 200
curl -I -b 'lm_session=<admin-token>' http://localhost:3000/admin   # 200

# 5. and back off again
curl -X POST http://localhost:3000/api/admin/maintenance \
  -H 'Content-Type: application/json' \
  -b 'lm_session=<your-admin-session-token>' \
  -d '{"enabled":false}'
curl -I http://localhost:3000/                     # 200
```

If `GET /` still returns `200` while maintenance is ON, the Proxy is not being
loaded — check that the file is `src/proxy.ts` (not the repo root) and that
neither `middleware.ts` nor a second `proxy.ts` exists.

---

## 10. Operating it

**Add a route that must stay reachable** — one line in `src/lib/maintenance.ts`:

```ts
const EXEMPT_EXACT = new Set<string>([MAINTENANCE_PATH, "/login", "/status"]);
// or
const EXEMPT_PREFIXES = ["/admin", "/api", "/status"];
```

**Let only admins in** — already done: `hasAdminSession()` checks the
`lm_session` cookie against `sessions` + `users.role = 'admin'`. Admins see a
live shop while visitors see `/maintenance`; remove that call from
`shouldBlockPublicRequest()` if you want *nobody* in.

**The row is missing** — `readMaintenanceModeFromDatabase()` treats "no row" as
`false`, and `setMaintenanceMode()` inserts the row if the table is empty, so
the toggle can never silently no-op.

**Schema note** — `site_settings` is defined in `src/db/schema.ts`, but the
existing migration `drizzle/0000_natural_smasher.sql` predates it. If you ever
rebuild a database from migrations, run `npx drizzle-kit generate` to add the
missing `site_settings` migration (the production DB already has the table).

---

## 11. Alternatives that were considered (and why not)

| Option | Verdict |
| --- | --- |
| **`src/proxy.ts` + DB (this)** | ✅ One file, real gate before rendering, no per-route edits, no extra services. |
| Root `middleware.ts` | ❌ Not invoked in this `src/`-directory project (the original bug), and deprecated in Next 16. |
| Check the flag in every page / `generateStaticParams` | ❌ Requirement #12, easy to forget a page. |
| Check the flag in `src/app/(site)/layout.tsx` | ⚠️ Possible, but: a layout cannot see the pathname, so `/login` (which lives in `(site)`) would also be blocked and admins could lock themselves out; it makes every public page dynamic (most pages are currently static); and it runs *after* the page has already started rendering. The Proxy runs before both. |
| Edge Middleware + `fetch('/api/…')` | ⚠️ Unnecessary in Next 16 — Proxy is Node.js by default. Adds a network hop, a recursion guard and cold-start latency. |
| Vercel Edge Config / KV | ✅ Great for zero-latency flags if you already use it, but it adds a service and a second source of truth to keep in sync. Not needed at this scale. |
| Homepage replacement | ❌ The hack that was in `src/app/(site)/page.tsx`; left every other route reachable. |
