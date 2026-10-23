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
