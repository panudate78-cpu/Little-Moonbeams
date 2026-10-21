import type { Metadata } from "next";
import Link from "next/link";
import { getAllCategories, getShopProducts } from "@/lib/catalog";
import { ProductCard } from "@/components/product-card";
import { toCardProduct } from "@/lib/card-product";
import { SortSelect, FilterToggle, PriceFilter } from "@/components/shop-controls";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Shop Handmade Jewellery",
  description:
    "Browse handmade necklaces, bracelets, earrings and rings crafted from precious stones, crystals and sterling silver.",
};

interface ShopSearchParams {
  q?: string;
  category?: string;
  collection?: string;
  sort?: string;
  max?: string;
  sale?: string;
  instock?: string;
}

export default async function ShopPage(props: { searchParams: Promise<ShopSearchParams> }) {
  const sp = await props.searchParams;
  const [products, categories] = await Promise.all([
    getShopProducts({
      q: sp.q,
      category: sp.category,
      collection: sp.collection,
      sort: sp.sort,
      maxPrice: sp.max ? Number(sp.max) : undefined,
      onSale: sp.sale === "1",
      inStock: sp.instock === "1",
    }),
    getAllCategories(),
  ]);

  function categoryHref(slug?: string) {
    const params = new URLSearchParams();
    if (sp.q) params.set("q", sp.q);
    if (sp.sort) params.set("sort", sp.sort);
    if (slug) params.set("category", slug);
    const qs = params.toString();
    return qs ? `/shop?${qs}` : "/shop";
  }

  return (
    <div className="mx-auto max-w-7xl px-6 py-12">
      <div className="text-center">
        <p className="eyebrow">The full collection</p>
        <h1 className="section-title mt-2">Shop Handmade Jewellery</h1>
        {sp.q && (
          <p className="mt-3 text-sm text-inksoft">
            Showing results for <strong>“{sp.q}”</strong> ·{" "}
            <Link href="/shop" className="text-lavender-deep underline">
              clear search
            </Link>
          </p>
        )}
      </div>

      {/* Category chips */}
      <div className="mt-8 flex flex-wrap justify-center gap-2">
        <Link
          href={categoryHref()}
          className={`rounded-full border px-4 py-1.5 text-xs font-bold tracking-wide uppercase transition ${
            !sp.category
              ? "border-ink bg-ink text-ivory"
              : "border-silvermist bg-ivory text-inksoft hover:border-ink"
          }`}
        >
          All
        </Link>
        {categories.map((c) => (
          <Link
            key={c.id}
            href={categoryHref(c.slug)}
            className={`rounded-full border px-4 py-1.5 text-xs font-bold tracking-wide uppercase transition ${
              sp.category === c.slug
                ? "border-ink bg-ink text-ivory"
                : "border-silvermist bg-ivory text-inksoft hover:border-ink"
            }`}
          >
            {c.name}
          </Link>
        ))}
      </div>

      {/* Filters & sort */}
      <div className="mt-6 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-silvermist/40 bg-ivory p-3">
        <div className="flex flex-wrap items-center gap-2">
          <FilterToggle param="sale" label="On sale" />
          <FilterToggle param="instock" label="In stock" />
          <PriceFilter />
        </div>
        <div className="flex items-center gap-3">
          <span className="text-xs font-bold tracking-widest text-inksoft uppercase">
            {products.length} pieces
          </span>
          <SortSelect />
        </div>
      </div>

      {products.length === 0 ? (
        <div className="py-24 text-center">
          <p className="text-4xl">☾</p>
          <p className="mt-4 font-display text-2xl">No treasures found</p>
          <p className="mt-2 text-sm text-inksoft">Try a different search or clear your filters.</p>
          <Link href="/shop" className="btn-outline mt-6">
            View everything
          </Link>
        </div>
      ) : (
        <div className="mt-8 grid grid-cols-2 gap-4 sm:gap-6 lg:grid-cols-4">
          {products.map((p) => (
            <ProductCard key={p.id} product={toCardProduct(p)} />
          ))}
        </div>
      )}
    </div>
  );
}
