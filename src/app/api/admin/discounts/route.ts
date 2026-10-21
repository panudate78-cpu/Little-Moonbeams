import { db } from "@/db";
import { discountCodes } from "@/db/schema";
import { eq } from "drizzle-orm";
import { requireAdmin } from "@/lib/auth";

export async function POST(req: Request) {
  const admin = await requireAdmin();
  if (!admin) return Response.json({ error: "Unauthorized" }, { status: 401 });
  const body = await req.json();
  if (!body.code || !body.value) {
    return Response.json({ error: "Code and value are required." }, { status: 400 });
  }
  try {
    await db.insert(discountCodes).values({
      code: String(body.code).toUpperCase().trim(),
      type: body.type === "fixed" ? "fixed" : "percent",
      value: Math.round(Number(body.value)),
      minSubtotal: Math.round(Number(body.minSubtotal) || 0),
      usageLimit: body.usageLimit ? Math.round(Number(body.usageLimit)) : null,
      expiresAt: body.expiresAt ? new Date(body.expiresAt) : null,
      active: true,
    });
    return Response.json({ ok: true });
  } catch {
    return Response.json({ error: "Code already exists." }, { status: 409 });
  }
}

export async function PATCH(req: Request) {
  const admin = await requireAdmin();
  if (!admin) return Response.json({ error: "Unauthorized" }, { status: 401 });
  const { id, active } = await req.json();
  await db
    .update(discountCodes)
    .set({ active: Boolean(active) })
    .where(eq(discountCodes.id, Number(id)));
  return Response.json({ ok: true });
}

export async function DELETE(req: Request) {
  const admin = await requireAdmin();
  if (!admin) return Response.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await req.json();
  await db.delete(discountCodes).where(eq(discountCodes.id, Number(id)));
  return Response.json({ ok: true });
}
