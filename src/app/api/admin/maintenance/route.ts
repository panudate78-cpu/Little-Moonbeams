import { db } from "@/db";
import { siteSettings } from "@/db/schema";
import { requireAdmin } from "@/lib/auth";

export async function POST(req: Request) {
  const admin = await requireAdmin();

  if (!admin) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { enabled } = await req.json();

  await db
    .update(siteSettings)
    .set({
      maintenanceMode: enabled,
    });

  return Response.json({ ok: true });
}