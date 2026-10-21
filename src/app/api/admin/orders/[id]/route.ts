import { db } from "@/db";
import { orders } from "@/db/schema";
import { eq } from "drizzle-orm";
import { requireAdmin } from "@/lib/auth";

const STATUSES = ["pending", "paid", "shipped", "delivered", "cancelled"];

export async function PATCH(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const admin = await requireAdmin();
  if (!admin) return Response.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await ctx.params;
  const body = await req.json();
  const update: Partial<{ status: string; trackingNumber: string }> = {};
  if (body.status && STATUSES.includes(body.status)) update.status = body.status;
  if (body.trackingNumber !== undefined) update.trackingNumber = String(body.trackingNumber);
  if (Object.keys(update).length === 0) {
    return Response.json({ error: "Nothing to update." }, { status: 400 });
  }
  await db.update(orders).set(update).where(eq(orders.id, Number(id)));
  return Response.json({ ok: true });
}
