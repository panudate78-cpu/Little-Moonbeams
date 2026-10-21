import { db } from "@/db";
import { discountCodes } from "@/db/schema";
import { eq } from "drizzle-orm";

function computeDiscount(
  dc: { type: string; value: number },
  subtotal: number
): number {
  if (dc.type === "percent") return Math.round((subtotal * dc.value) / 100);
  return Math.min(dc.value, subtotal);
}

export async function POST(req: Request) {
  try {
    const { code, subtotal } = await req.json();
    if (!code) return Response.json({ error: "Enter a code." }, { status: 400 });
    const [dc] = await db
      .select()
      .from(discountCodes)
      .where(eq(discountCodes.code, String(code).toUpperCase().trim()))
      .limit(1);
    if (!dc || !dc.active) {
      return Response.json({ error: "This code is not valid." }, { status: 404 });
    }
    if (dc.expiresAt && new Date(dc.expiresAt) < new Date()) {
      return Response.json({ error: "This code has expired." }, { status: 400 });
    }
    if (dc.usageLimit !== null && dc.usedCount >= dc.usageLimit) {
      return Response.json({ error: "This code has reached its usage limit." }, { status: 400 });
    }
    const sub = Number(subtotal) || 0;
    if (sub < dc.minSubtotal) {
      return Response.json(
        { error: `This code requires a minimum spend of £${(dc.minSubtotal / 100).toFixed(2)}.` },
        { status: 400 }
      );
    }
    return Response.json({ code: dc.code, discount: computeDiscount(dc, sub) });
  } catch {
    return Response.json({ error: "Could not validate code." }, { status: 500 });
  }
}
