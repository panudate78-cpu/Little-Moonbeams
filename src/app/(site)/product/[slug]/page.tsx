import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/db";
import { reviews } from "@/db/schema";
import { and, desc, eq } from "drizzle-orm";
import { getProductBySlug, getRelatedProducts } from "@/lib/catalog";
import { effectivePrice, formatPrice } from "@/lib/utils";
import { ProductGallery } from "@/components/product-gallery";
import { AddToCartPanel, ShareButtons } from "@/components/product-actions";
import { ProductCard } from "@/components/product-card";
import { toCardProduct } from "@/lib/card-product";
import { ReviewForm } from "@/components/review-form";
import { Stars } from "@/components/stars";

export const dynamic = "force-dynamic";

interface Props {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata(props: Props): Promise<Metadata> {
  const { slug } = await props.params;
  const product = await getProductBySlug(slug);
  if (!product) return { title: "Product not found" };
  return {
    title: product.metaTitle || product.name,
    description:
      product.metaDescription ||
      product.description.slice(0, 160) ||
      `${product.name} — handmade jewellery by Little Moonbeam's Creations.`,
    openGraph: {
      title: product.metaTitle || product.name,
      description: product.metaDescription || product.description.slice(0, 160),
      images: product.images[0] ? [product.images[0].url] : undefined,
    },
  };
}

export default async function ProductPage(props: Props) {
  const { slug } = await props.params;
  const product = await getProductBySlug(slug);
  if (!product || product.status !== "active") notFound();

  const [related, productReviews] = await Promise.all([
    getRelatedProducts(product, 4),
    db
      .select()
      .from(reviews)
      .where(and(eq(reviews.productId, product.id), eq(reviews.approved, true)))
      .orderBy(desc(reviews.createdAt)),
  ]);

  const price = effectivePrice(product);
  const onSale = price < product.price;
  const lowStock = product.stock > 0 && product.stock <= product.lowStockThreshold;

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: product.name,
    description: product.description,
    sku: product.sku,
    image: product.images.map((i) => i.url),
    brand: { "@type": "Brand", name: "Little Moonbeam's Creations" },
    offers: {
      "@type": "Offer",
      priceCurrency: "GBP",
      price: (price / 100).toFixed(2),
      availability:
        product.stock > 0 ? "https://schema.org/InStock" : "https://schema.org/OutOfStock",
    },
    ...(product.reviewCount > 0
      ? {
          aggregateRating: {
            "@type": "AggregateRating",
            ratingValue: product.avgRating.toFixed(1),
            reviewCount: product.reviewCount,
          },
        }
      : {}),
  };

  return (
    <div className="mx-auto max-w-7xl px-6 py-10">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <nav className="mb-6 text-xs text-inksoft">
        <Link href="/" className="hover:text-ink">Home</Link> /{" "}
        <Link href="/shop" className="hover:text-ink">Shop</Link> /{" "}
        <span className="text-ink">{product.name}</span>
      </nav>

      <div className="grid gap-10 lg:grid-cols-2">
        <ProductGallery
          images={product.images.map((i) => ({ url: i.url, alt: i.alt }))}
          name={product.name}
        />

        <div>
          <div className="flex flex-wrap gap-2">
            {product.isNew && (
              <span className="rounded-full bg-lavender px-3 py-1 text-[0.65rem] font-bold tracking-wider text-white uppercase">New ✦</span>
            )}
            {product.isBestseller && (
              <span className="rounded-full bg-gold px-3 py-1 text-[0.65rem] font-bold tracking-wider text-white uppercase">Bestseller</span>
            )}
            {onSale && (
              <span className="rounded-full bg-blush px-3 py-1 text-[0.65rem] font-bold tracking-wider text-white uppercase">Sale</span>
            )}
          </div>
          <h1 className="mt-3 font-display text-3xl text-ink sm:text-4xl">{product.name}</h1>
          {product.reviewCount > 0 && (
            <div className="mt-2 flex items-center gap-2">
              <Stars rating={product.avgRating} />
              <a href="#reviews" className="text-xs font-semibold text-inksoft hover:text-ink">
                {product.reviewCount} review{product.reviewCount === 1 ? "" : "s"}
              </a>
            </div>
          )}
          <div className="mt-4 flex items-baseline gap-3">
            <span className="font-display text-3xl text-ink">{formatPrice(price)}</span>
            {onSale && (
              <span className="text-lg text-inksoft line-through">{formatPrice(product.price)}</span>
            )}
          </div>
          <p className="mt-2 text-xs text-inksoft">
            SKU: {product.sku || "—"} · VAT included · Free UK shipping over £50
          </p>

          <div className="mt-3">
            {product.stock <= 0 ? (
              <span className="text-sm font-bold text-blush">Currently sold out — more coming soon ☾</span>
            ) : lowStock ? (
              <span className="text-sm font-bold text-gold-dark">
                ✦ Only {product.stock} left in stock — handmade in small batches
              </span>
            ) : (
              <span className="text-sm font-bold text-lavender-deep">In stock & ready to sparkle</span>
            )}
          </div>

          <p className="mt-5 leading-relaxed text-inksoft">{product.description}</p>

          <div className="mt-6">
            <AddToCartPanel
              product={{
                id: product.id,
                slug: product.slug,
                name: product.name,
                price,
                image: product.images[0]?.url ?? "",
                stock: product.stock,
              }}
            />
          </div>

          <div className="mt-6 space-y-3">
            {product.materials && (
              <details className="card group p-4" open>
                <summary className="cursor-pointer text-sm font-bold tracking-widest text-ink uppercase">
                  ✦ Materials
                </summary>
                <p className="mt-2 text-sm leading-relaxed text-inksoft">{product.materials}</p>
              </details>
            )}
            {product.stoneInfo && (
              <details className="card p-4">
                <summary className="cursor-pointer text-sm font-bold tracking-widest text-ink uppercase">
                  ☾ Stone information
                </summary>
                <p className="mt-2 text-sm leading-relaxed text-inksoft">{product.stoneInfo}</p>
              </details>
            )}
            {product.careInstructions && (
              <details className="card p-4">
                <summary className="cursor-pointer text-sm font-bold tracking-widest text-ink uppercase">
                  ♡ Care instructions
                </summary>
                <p className="mt-2 text-sm leading-relaxed text-inksoft">{product.careInstructions}</p>
              </details>
            )}
          </div>

          <div className="mt-6">
            <ShareButtons name={product.name} slug={product.slug} />
          </div>
        </div>
      </div>

      {/* Reviews */}
      <section id="reviews" className="mt-16">
        <h2 className="section-title">Customer Reviews</h2>
        <div className="mt-6 grid gap-8 lg:grid-cols-2">
          <div className="space-y-4">
            {productReviews.length === 0 ? (
              <p className="text-sm text-inksoft">
                No reviews yet — be the first to share some sparkle. ✦
              </p>
            ) : (
              productReviews.map((r) => (
                <div key={r.id} className="card p-5">
                  <div className="flex items-center justify-between">
                    <Stars rating={r.rating} />
                    <span className="text-xs text-inksoft">
                      {new Date(r.createdAt).toLocaleDateString("en-GB")}
                    </span>
                  </div>
                  {r.title && <h3 className="mt-2 font-display text-lg">{r.title}</h3>}
                  <p className="mt-1 text-sm leading-relaxed text-inksoft">{r.comment}</p>
                  <p className="mt-3 text-xs font-bold tracking-widest text-gold uppercase">{r.name}</p>
                </div>
              ))
            )}
          </div>
          <ReviewForm productId={product.id} />
        </div>
      </section>

      {/* Related */}
      {related.length > 0 && (
        <section className="mt-16">
          <h2 className="section-title">You may also love</h2>
          <div className="mt-6 grid grid-cols-2 gap-4 sm:gap-6 lg:grid-cols-4">
            {related.map((p) => (
              <ProductCard key={p.id} product={toCardProduct(p)} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
