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
  __lmMaintenanceLastErrorLogAt?: number;
};

/** Error lines are throttled so a broken database cannot flood the logs. */
const ERROR_LOG_INTERVAL_MS = 60_000;

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

      const now = Date.now();
      const lastLog = state.__lmMaintenanceLastErrorLogAt ?? 0;

      if (now - lastLog > ERROR_LOG_INTERVAL_MS) {
        state.__lmMaintenanceLastErrorLogAt = now;
        console.error(
          "[maintenance] Could not read site_settings.maintenance_mode — keeping the last known state.",
          message,
        );
      }

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
