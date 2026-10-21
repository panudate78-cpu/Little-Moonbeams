import type { MetadataRoute } from "next";
import { db } from "@/db";
import { products, collections } from "@/db/schema";
import { eq } from "drizzle-orm";

export const dynamic = "force-dynamic";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

  const staticPages = [
    "",
    "/shop",
    "/collections",
    "/about",
    "/contact",
    "/faq",
    "/shipping-returns",
    "/privacy-policy",
    "/terms",
    "/custom-orders",
    "/reviews",
  ].map((path) => ({
    url: `${base}${path}`,
    lastModified: new Date(),
    changeFrequency: "weekly" as const,
    priority: path === "" ? 1 : 0.7,
  }));

  try {
    const [activeProducts, allCollections] = await Promise.all([
      db
        .select({ slug: products.slug, createdAt: products.createdAt })
        .from(products)
        .where(eq(products.status, "active")),
      db.select({ slug: collections.slug }).from(collections),
    ]);
    return [
      ...staticPages,
      ...activeProducts.map((p) => ({
        url: `${base}/product/${p.slug}`,
        lastModified: p.createdAt,
        changeFrequency: "weekly" as const,
        priority: 0.8,
      })),
      ...allCollections.map((c) => ({
        url: `${base}/collections/${c.slug}`,
        lastModified: new Date(),
        changeFrequency: "weekly" as const,
        priority: 0.7,
      })),
    ];
  } catch {
    return staticPages;
  }
}
