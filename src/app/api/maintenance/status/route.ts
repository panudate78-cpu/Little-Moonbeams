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
