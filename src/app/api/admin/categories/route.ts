import { db } from "@/db";
import { categories } from "@/db/schema";
import { eq } from "drizzle-orm";
import { requireAdmin } from "@/lib/auth";
import { slugify } from "@/lib/utils";

export async function PATCH(req: Request) {
  const admin = await requireAdmin();

  if (!admin) {
    return Response.json(
      { error: "Unauthorized" },
      { status: 401 }
    );
  }

  const { id, name, description } = await req.json();

  if (!id || !name) {
    return Response.json(
      { error: "ID and Name required" },
      { status: 400 }
    );
  }

  await db
    .update(categories)
    .set({
      name: String(name),
      slug: slugify(String(name)),
      description: description ? String(description) : null,
    })
    .where(eq(categories.id, Number(id)));

  return Response.json({ ok: true });
}