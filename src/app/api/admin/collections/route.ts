import { db } from "@/db";
import { collections } from "@/db/schema";
import { eq } from "drizzle-orm";
import { requireAdmin } from "@/lib/auth";
import { slugify } from "@/lib/utils";

export async function POST(req: Request) {
  const admin = await requireAdmin();
  if (!admin) return Response.json({ error: "Unauthorized" }, { status: 401 });
  const { name, description, image } = await req.json();
  if (!name) return Response.json({ error: "Name required" }, { status: 400 });
  try {
    await db.insert(collections).values({
      name: String(name),
      slug: slugify(String(name)),
      description: description ? String(description) : null,
      image: image ? String(image) : null,
    });
    return Response.json({ ok: true });
  } catch {
    return Response.json({ error: "Collection already exists." }, { status: 409 });
  }
}

export async function DELETE(req: Request) {
  const admin = await requireAdmin();
  if (!admin) return Response.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await req.json();
  await db.delete(collections).where(eq(collections.id, Number(id)));
  return Response.json({ ok: true });
}
export async function PATCH(req: Request) {
  const admin = await requireAdmin();

  if (!admin) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id, name, description, image } = await req.json();

  if (!id || !name) {
    return Response.json(
      { error: "ID and Name required" },
      { status: 400 }
    );
  }

  await db
    .update(collections)
    .set({
      name: String(name),
      slug: slugify(String(name)),
      description: description ? String(description) : null,
      image: image ? String(image) : null,
    })
    .where(eq(collections.id, Number(id)));

  return Response.json({ ok: true });
}