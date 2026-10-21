import { db } from "@/db";
import { products, productImages, inventoryLogs } from "@/db/schema";
import { eq } from "drizzle-orm";
import { requireAdmin } from "@/lib/auth";
import { slugify } from "@/lib/utils";

export async function POST(req: Request) {
  const admin = await requireAdmin();
  if (!admin) return Response.json({ error: "Unauthorized" }, { status: 401 });
  try {
    const body = await req.json();
    if (!body.name || body.price === undefined) {
      return Response.json({ error: "Name and price are required." }, { status: 400 });
    }
    let slug = slugify(body.slug || body.name);
    const existing = await db.select().from(products).where(eq(products.slug, slug)).limit(1);
    if (existing.length > 0) slug = `${slug}-${Date.now().toString(36)}`;

    const [product] = await db
      .insert(products)
      .values({
        name: String(body.name),
        slug,
        sku: String(body.sku ?? ""),
        description: String(body.description ?? ""),
        materials: String(body.materials ?? ""),
        stoneInfo: String(body.stoneInfo ?? ""),
        careInstructions: String(body.careInstructions ?? ""),
        price: Math.round(Number(body.price) || 0),
        salePrice: body.salePrice ? Math.round(Number(body.salePrice)) : null,
        stock: Math.max(0, Math.round(Number(body.stock) || 0)),
        lowStockThreshold: Math.max(0, Math.round(Number(body.lowStockThreshold) || 3)),
        status: ["active", "draft", "archived"].includes(body.status) ? body.status : "active",
        featured: Boolean(body.featured),
        isNew: Boolean(body.isNew),
        isBestseller: Boolean(body.isBestseller),
        categoryId: body.categoryId ? Number(body.categoryId) : null,
        collectionId: body.collectionId ? Number(body.collectionId) : null,
        metaTitle: body.metaTitle ? String(body.metaTitle) : null,
        metaDescription: body.metaDescription ? String(body.metaDescription) : null,
      })
      .returning();

    const images: { url: string; alt?: string }[] = Array.isArray(body.images) ? body.images : [];
    if (images.length > 0) {
      await db.insert(productImages).values(
        images.map((img, i) => ({
          productId: product.id,
          url: String(img.url),
          alt: String(img.alt ?? body.name),
          position: i,
        }))
      );
    }
    if (product.stock > 0) {
      await db.insert(inventoryLogs).values({
        productId: product.id,
        change: product.stock,
        reason: "Initial stock",
      });
    }
    return Response.json({ ok: true, id: product.id });
  } catch (err) {
    console.error("[admin products POST]", err);
    return Response.json({ error: "Could not create product." }, { status: 500 });
  }
}
