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
