import Image from "next/image";
import Link from "next/link";
import { db } from "@/db";
import { reviews, products as productsTable } from "@/db/schema";
import { and, desc, eq, gte, isNotNull } from "drizzle-orm";
import { getProductsByFlag, getAllCollections } from "@/lib/catalog";
import { ProductCard } from "@/components/product-card";
import { toCardProduct } from "@/lib/card-product";
import { TrustBadges } from "@/components/trust-badges";
import { NewsletterForm } from "@/components/newsletter-form";
import { Stars } from "@/components/stars";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const [featured, newArrivals, bestsellers, collections, testimonials] = await Promise.all([
    getProductsByFlag("featured", 4),
    getProductsByFlag("isNew", 4),
    getProductsByFlag("isBestseller", 4),
    getAllCollections(),
    db
      .select({
        id: reviews.id,
        name: reviews.name,
        rating: reviews.rating,
        comment: reviews.comment,
        productName: productsTable.name,
      })
      .from(reviews)
      .leftJoin(productsTable, eq(reviews.productId, productsTable.id))
      .where(and(eq(reviews.approved, true), gte(reviews.rating, 4), isNotNull(reviews.productId)))
      .orderBy(desc(reviews.createdAt))
      .limit(3),
  ]);

  return (
    <>
      {/* Hero */}
      <section className="relative overflow-hidden bg-night">
        <div className="absolute inset-0">
          <div className="absolute inset-0 bg-gradient-to-r from-night/90 via-night/50 to-transparent" />
        </div>
        <div className="relative mx-auto flex max-w-7xl flex-col justify-center px-6 py-24 sm:py-36">
          <span className="mb-3 text-ivory/70">
            <span className="twinkle inline-block">✦</span>{" "}
            <span className="text-xs font-bold tracking-[0.3em] uppercase">Handmade in small batches</span>
          </span>
          <h1 className="max-w-xl font-display text-4xl leading-tight text-ivory sm:text-6xl">
            Jewellery kissed by
            <span className="font-script block pt-2 text-gold"> moonlight ☾</span>
          </h1>
          <p className="mt-5 max-w-md text-base leading-relaxed text-ivory/80">
            Handcrafted jewellery inspired by nature and moonlight — precious stones, crystals and
            sterling silver, made with love and a sprinkle of magic.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link href="/shop" className="btn-gold">
              Shop the Collection
            </Link>
            <Link
              href="/custom-orders"
              className="inline-flex items-center justify-center rounded-full border border-ivory/40 px-7 py-3 text-sm font-semibold text-ivory transition hover:bg-ivory hover:text-ink"
            >
              Create a Custom Piece
            </Link>
          </div>
        </div>
      </section>

      <TrustBadges />

      {/* Welcome */}
      <section className="mx-auto max-w-3xl px-6 py-16 text-center">
        <p className="eyebrow">Welcome to our little studio</p>
        <h2 className="section-title mt-3">
          Where nature&apos;s treasures become <span className="font-script text-lavender-deep">wearable magic</span>
        </h2>
        <p className="mt-5 leading-relaxed text-inksoft">
          Every Little Moonbeam's Creations piece begins with a hand-picked stone — a luminous moonstone, a
          whisper of amethyst, a flash of labradorite — and is lovingly shaped with sterling silver,
          natural materials and artisan beads. No two pieces are ever quite the same, just like the
          phases of the moon.
        </p>
        <div className="mt-6 text-lavender">✦ ☾ ✦</div>
      </section>

      {/* Featured */}
      {featured.length > 0 && (
        <section className="mx-auto max-w-7xl px-6 pb-16">
          <div className="mb-8 flex items-end justify-between">
            <div>
              <p className="eyebrow">Hand-picked for you</p>
              <h2 className="section-title mt-2">Featured Treasures</h2>
            </div>
            <Link href="/shop" className="text-sm font-bold text-lavender-deep hover:underline">
              View all →
            </Link>
          </div>
          <div className="grid grid-cols-2 gap-4 sm:gap-6 lg:grid-cols-4">
            {featured.map((p) => (
              <ProductCard key={p.id} product={toCardProduct(p)} />
            ))}
          </div>
        </section>
      )}

      {/* Collection highlights */}
      {collections.length > 0 && (
        <section className="bg-lavender-light/60 py-16">
          <div className="mx-auto max-w-7xl px-6">
            <div className="mb-8 text-center">
              <p className="eyebrow">Curated with care</p>
              <h2 className="section-title mt-2">Our Collections</h2>
            </div>
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
              {collections.slice(0, 4).map((c) => (
                <Link
  key={c.id}
  href={`/collections/${c.slug}`}
  className="group relative block aspect-[4/5] overflow-hidden rounded-2xl"
>
  {c.image && (
   <Image
  src={c.image}
  alt={c.name}
  fill
  priority
  sizes="(max-width: 768px) 100vw, 25vw"
  className="object-cover transition duration-500 group-hover:scale-105"
/>
  )}

  <div className="absolute inset-0 bg-gradient-to-t from-night/80 via-transparent" />

  <div className="absolute bottom-0 p-5">
    <h3 className="font-display text-xl text-ivory">{c.name}</h3>
    <p className="mt-1 text-xs font-bold tracking-widest text-gold uppercase">
      Explore →
    </p>
  </div>
</Link>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* New arrivals */}
      {newArrivals.length > 0 && (
        <section className="mx-auto max-w-7xl px-6 py-16">
          <div className="mb-8 flex items-end justify-between">
            <div>
              <p className="eyebrow">Fresh from the workbench</p>
              <h2 className="section-title mt-2">New Arrivals ✦</h2>
            </div>
            <Link href="/shop?sort=newest" className="text-sm font-bold text-lavender-deep hover:underline">
              View all →
            </Link>
          </div>
          <div className="grid grid-cols-2 gap-4 sm:gap-6 lg:grid-cols-4">
            {newArrivals.map((p) => (
              <ProductCard key={p.id} product={toCardProduct(p)} />
            ))}
          </div>
        </section>
      )}

      {/* Bestsellers */}
      {bestsellers.length > 0 && (
        <section className="mx-auto max-w-7xl px-6 pb-16">
          <div className="mb-8 flex items-end justify-between">
            <div>
              <p className="eyebrow">Loved by moon-gazers everywhere</p>
              <h2 className="section-title mt-2">Best Sellers</h2>
            </div>
            <Link href="/shop" className="text-sm font-bold text-lavender-deep hover:underline">
              View all →
            </Link>
          </div>
          <div className="grid grid-cols-2 gap-4 sm:gap-6 lg:grid-cols-4">
            {bestsellers.map((p) => (
              <ProductCard key={p.id} product={toCardProduct(p)} />
            ))}
          </div>
        </section>
      )}

      {/* Testimonials */}
      <section className="bg-night py-16 text-ivory">
        <div className="mx-auto max-w-7xl px-6">
          <div className="mb-10 text-center">
            <p className="eyebrow">Kind words</p>
            <h2 className="mt-2 font-display text-3xl sm:text-4xl">What our customers say</h2>
          </div>
          <div className="grid gap-6 md:grid-cols-3">
            {(testimonials.length > 0
              ? testimonials
              : [
                  { id: 1, name: "Emily R.", rating: 5, comment: "The moonstone necklace is even more beautiful in person. Truly magical!", productName: "Moonstone Necklace" },
                  { id: 2, name: "Sophie T.", rating: 5, comment: "Gorgeous packaging and the bracelet feels so special. Will be back!", productName: "Rose Quartz Bracelet" },
                  { id: 3, name: "Hannah M.", rating: 5, comment: "A custom piece made for my wedding day — absolutely perfect.", productName: "Custom Order" },
                ]
            ).map((t) => (
              <figure key={t.id} className="rounded-2xl border border-ivory/10 bg-ivory/5 p-6">
                <Stars rating={t.rating} />
                <blockquote className="mt-3 text-sm leading-relaxed text-ivory/85">
                  “{t.comment}”
                </blockquote>
                <figcaption className="mt-4 text-xs font-bold tracking-widest text-gold uppercase">
                  {t.name} · {t.productName ?? "Verified buyer"}
                </figcaption>
              </figure>
            ))}
          </div>
          <div className="mt-8 text-center">
            <Link href="/reviews" className="text-sm font-bold text-gold hover:underline">
              Read all reviews →
            </Link>
          </div>
        </div>
      </section>

      {/* Newsletter */}
      <section className="mx-auto max-w-3xl px-6 pb-4 text-center">
        <div className="card bg-gradient-to-br from-lavender-light via-ivory to-blush-light p-10">
          <span className="text-3xl">☾</span>
          <h2 className="section-title mt-2">Join the Moonbeam Club</h2>
          <p className="mx-auto mt-3 max-w-md text-sm text-inksoft">
            10% off your first order, early access to new collections, and a little sparkle in
            your inbox with every full moon.
          </p>
          <div className="mx-auto mt-6 max-w-md">
            <NewsletterForm />
          </div>
        </div>
      </section>
    </>
  );
}
