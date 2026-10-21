import { db } from "@/db";
import { products, productImages, inventoryLogs } from "@/db/schema";
import { eq } from "drizzle-orm";
import { requireAdmin } from "@/lib/auth";
import { slugify } from "@/lib/utils";

type Ctx = { params: Promise<{ id: string }> };

export async function PUT(req: Request, ctx: Ctx) {
  const admin = await requireAdmin();
  if (!admin) return Response.json({ error: "Unauthorized" }, { status: 401 });
  try {
    const { id } = await ctx.params;
    const productId = Number(id);
    const body = await req.json();

    const [existing] = await db.select().from(products).where(eq(products.id, productId)).limit(1);
    if (!existing) return Response.json({ error: "Not found" }, { status: 404 });

    const newStock = Math.max(0, Math.round(Number(body.stock) || 0));

    await db
      .update(products)
      .set({
        name: String(body.name ?? existing.name),
        slug: body.slug ? slugify(body.slug) : existing.slug,
        sku: String(body.sku ?? existing.sku),
        description: String(body.description ?? ""),
        materials: String(body.materials ?? ""),
        stoneInfo: String(body.stoneInfo ?? ""),
        careInstructions: String(body.careInstructions ?? ""),
        price: Math.round(Number(body.price) || existing.price),
        salePrice: body.salePrice ? Math.round(Number(body.salePrice)) : null,
        stock: newStock,
        lowStockThreshold: Math.max(0, Math.round(Number(body.lowStockThreshold) || 3)),
        status: ["active", "draft", "archived"].includes(body.status) ? body.status : existing.status,
        featured: Boolean(body.featured),
        isNew: Boolean(body.isNew),
        isBestseller: Boolean(body.isBestseller),
        categoryId: body.categoryId ? Number(body.categoryId) : null,
        collectionId: body.collectionId ? Number(body.collectionId) : null,
        metaTitle: body.metaTitle ? String(body.metaTitle) : null,
        metaDescription: body.metaDescription ? String(body.metaDescription) : null,
      })
      .where(eq(products.id, productId));

    if (newStock !== existing.stock) {
      await db.insert(inventoryLogs).values({
        productId,
        change: newStock - existing.stock,
        reason: "Manual stock adjustment",
      });
    }

    if (Array.isArray(body.images)) {
      await db.delete(productImages).where(eq(productImages.productId, productId));
      if (body.images.length > 0) {
        await db.insert(productImages).values(
          body.images.map((img: { url: string; alt?: string }, i: number) => ({
            productId,
            url: String(img.url),
            alt: String(img.alt ?? body.name ?? existing.name),
            position: i,
          }))
        );
      }
    }
    return Response.json({ ok: true });
  } catch (err) {
    console.error("[admin products PUT]", err);
    return Response.json({ error: "Could not update product." }, { status: 500 });
  }
}

export async function DELETE(_req: Request, ctx: Ctx) {
  const admin = await requireAdmin();
  if (!admin) return Response.json({ error: "Unauthorized" }, { status: 401 });
  try {
    const { id } = await ctx.params;
    await db.delete(products).where(eq(products.id, Number(id)));
    return Response.json({ ok: true });
  } catch {
    return Response.json({ error: "Could not delete product." }, { status: 500 });
  }
}
