import type { Metadata } from "next";
import Link from "next/link";
import { db } from "@/db";
import { reviews, products } from "@/db/schema";
import { desc, eq, sql } from "drizzle-orm";
import { Stars } from "@/components/stars";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Customer Reviews",
  description: "Read what customers say about Little Moonbeam's Creations handmade jewellery.",
};

export default async function ReviewsPage() {
  const [allReviews, stats] = await Promise.all([
    db
      .select({
        id: reviews.id,
        name: reviews.name,
        rating: reviews.rating,
        title: reviews.title,
        comment: reviews.comment,
        createdAt: reviews.createdAt,
        productName: products.name,
        productSlug: products.slug,
      })
      .from(reviews)
      .leftJoin(products, eq(reviews.productId, products.id))
      .where(eq(reviews.approved, true))
      .orderBy(desc(reviews.createdAt)),
    db
      .select({
        avg: sql<number>`coalesce(avg(${reviews.rating}), 0)`,
        count: sql<number>`count(*)`,
      })
      .from(reviews)
      .where(eq(reviews.approved, true)),
  ]);

  const avg = Number(stats[0]?.avg ?? 0);
  const count = Number(stats[0]?.count ?? 0);

  return (
    <div className="mx-auto max-w-5xl px-6 py-16">
      <div className="text-center">
        <p className="eyebrow">Kind words from our customers</p>
        <h1 className="section-title mt-2">Customer Reviews</h1>
        {count > 0 && (
          <div className="mt-4 flex items-center justify-center gap-3">
            <Stars rating={avg} size="text-xl" />
            <span className="text-sm font-bold text-inksoft">
              {avg.toFixed(1)} / 5 from {count} review{count === 1 ? "" : "s"}
            </span>
          </div>
        )}
      </div>

      {allReviews.length === 0 ? (
        <p className="py-24 text-center text-inksoft">
          No reviews yet — be the first to share some sparkle ✦
        </p>
      ) : (
        <div className="mt-10 columns-1 gap-4 sm:columns-2 lg:columns-3 [&>*]:mb-4 [&>*]:break-inside-avoid">
          {allReviews.map((r) => (
            <div key={r.id} className="card p-5">
              <div className="flex items-center justify-between">
                <Stars rating={r.rating} />
                <span className="text-xs text-inksoft">
                  {new Date(r.createdAt).toLocaleDateString("en-GB")}
                </span>
              </div>
              {r.title && <h2 className="mt-2 font-display text-lg">{r.title}</h2>}
              <p className="mt-1 text-sm leading-relaxed text-inksoft">{r.comment}</p>
              <p className="mt-3 text-xs font-bold tracking-widest text-gold uppercase">{r.name}</p>
              {r.productSlug && (
                <Link
                  href={`/product/${r.productSlug}`}
                  className="mt-1 block text-xs text-lavender-deep hover:underline"
                >
                  ↳ {r.productName}
                </Link>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
