import "server-only";
import { db } from "@/db";
import {
  products,
  productImages,
  categories,
  collections,
  reviews,
  type Product,
  type ProductImage,
} from "@/db/schema";
import { and, asc, desc, eq, ilike, inArray, or, sql, type SQL } from "drizzle-orm";

export interface ProductWithImages extends Product {
  images: ProductImage[];
  avgRating: number;
  reviewCount: number;
}

async function attachExtras(rows: Product[]): Promise<ProductWithImages[]> {
  if (rows.length === 0) return [];
  const ids = rows.map((p) => p.id);
  const imgs = await db
    .select()
    .from(productImages)
    .where(inArray(productImages.productId, ids))
    .orderBy(asc(productImages.position));
  const ratings = await db
    .select({
      productId: reviews.productId,
      avg: sql<number>`coalesce(avg(${reviews.rating}), 0)`,
      count: sql<number>`count(*)`,
    })
    .from(reviews)
    .where(and(inArray(reviews.productId, ids), eq(reviews.approved, true)))
    .groupBy(reviews.productId);
  return rows.map((p) => {
    const r = ratings.find((x) => x.productId === p.id);
    return {
      ...p,
      images: imgs.filter((i) => i.productId === p.id),
      avgRating: r ? Number(r.avg) : 0,
      reviewCount: r ? Number(r.count) : 0,
    };
  });
}

export interface ShopFilters {
  q?: string;
  category?: string;
  collection?: string;
  sort?: string;
  maxPrice?: number;
  onSale?: boolean;
  inStock?: boolean;
}

export async function getShopProducts(filters: ShopFilters): Promise<ProductWithImages[]> {
  const conditions: SQL[] = [eq(products.status, "active")];

  if (filters.q) {
    const term = `%${filters.q}%`;
    const c = or(
      ilike(products.name, term),
      ilike(products.description, term),
      ilike(products.stoneInfo, term),
      ilike(products.materials, term)
    );
    if (c) conditions.push(c);
  }
  if (filters.category) {
    const cat = await db
      .select()
      .from(categories)
      .where(eq(categories.slug, filters.category))
      .limit(1);
    if (cat[0]) conditions.push(eq(products.categoryId, cat[0].id));
  }
  if (filters.collection) {
    const col = await db
      .select()
      .from(collections)
      .where(eq(collections.slug, filters.collection))
      .limit(1);
    if (col[0]) conditions.push(eq(products.collectionId, col[0].id));
  }
  if (filters.maxPrice) {
    conditions.push(
      sql`coalesce(${products.salePrice}, ${products.price}) <= ${filters.maxPrice}`
    );
  }
  if (filters.onSale) {
    conditions.push(
      sql`${products.salePrice} is not null and ${products.salePrice} < ${products.price}`
    );
  }
  if (filters.inStock) {
    conditions.push(sql`${products.stock} > 0`);
  }

  let orderBy;
  switch (filters.sort) {
    case "price-asc":
      orderBy = asc(sql`coalesce(${products.salePrice}, ${products.price})`);
      break;
    case "price-desc":
      orderBy = desc(sql`coalesce(${products.salePrice}, ${products.price})`);
      break;
    case "name":
      orderBy = asc(products.name);
      break;
    case "newest":
    default:
      orderBy = desc(products.createdAt);
  }

  const rows = await db
    .select()
    .from(products)
    .where(and(...conditions))
    .orderBy(orderBy);
  return attachExtras(rows);
}

export async function getProductBySlug(slug: string): Promise<ProductWithImages | null> {
  const rows = await db.select().from(products).where(eq(products.slug, slug)).limit(1);
  if (!rows[0]) return null;
  const [withExtras] = await attachExtras(rows);
  return withExtras;
}

export async function getProductsByFlag(
  flag: "featured" | "isNew" | "isBestseller",
  limit = 4
): Promise<ProductWithImages[]> {
  const col =
    flag === "featured" ? products.featured : flag === "isNew" ? products.isNew : products.isBestseller;
  const rows = await db
    .select()
    .from(products)
    .where(and(eq(products.status, "active"), eq(col, true)))
    .orderBy(desc(products.createdAt))
    .limit(limit);
  return attachExtras(rows);
}

export async function getRelatedProducts(product: Product, limit = 4): Promise<ProductWithImages[]> {
  const rows = await db
    .select()
    .from(products)
    .where(
      and(
        eq(products.status, "active"),
        sql`${products.id} <> ${product.id}`,
        product.categoryId ? eq(products.categoryId, product.categoryId) : sql`true`
      )
    )
    .limit(limit);
  return attachExtras(rows);
}

export async function getProductsByIds(ids: number[]): Promise<ProductWithImages[]> {
  if (ids.length === 0) return [];
  const rows = await db
    .select()
    .from(products)
    .where(and(inArray(products.id, ids), eq(products.status, "active")));
  return attachExtras(rows);
}

export async function getAllCategories() {
  return db.select().from(categories).orderBy(asc(categories.name));
}

export async function getAllCollections() {
  return db.select().from(collections).orderBy(asc(collections.name));
}
