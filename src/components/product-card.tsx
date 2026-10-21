"use client";

import Image from "next/image";
import Link from "next/link";
import { useCart, useWishlist } from "@/components/providers";
import { Stars } from "@/components/stars";
import { formatPrice } from "@/lib/utils";
import type { CardProduct } from "@/lib/card-product";

export type { CardProduct };

export function ProductCard({ product }: { product: CardProduct }) {
  const { addItem } = useCart();
  const { has, toggle } = useWishlist();
  const onSale = product.salePrice !== null && product.salePrice < product.price;
  const price = onSale ? (product.salePrice as number) : product.price;
  const out = product.stock <= 0;

  return (
    <div className="group card relative overflow-hidden transition hover:-translate-y-1 hover:shadow-xl">
      <Link href={`/product/${product.slug}`} className="block">
        <div className="relative aspect-square overflow-hidden bg-dustyblue-light">
          
          <div className="absolute top-3 left-3 flex flex-col gap-1.5">
            {onSale && (
              <span className="rounded-full bg-blush px-2.5 py-1 text-[0.65rem] font-bold tracking-wider text-white uppercase">
                Sale
              </span>
            )}
            {product.isNew && (
              <span className="rounded-full bg-lavender px-2.5 py-1 text-[0.65rem] font-bold tracking-wider text-white uppercase">
                New ✦
              </span>
            )}
            {product.isBestseller && (
              <span className="rounded-full bg-gold px-2.5 py-1 text-[0.65rem] font-bold tracking-wider text-white uppercase">
                Bestseller
              </span>
            )}
            {out && (
              <span className="rounded-full bg-ink/70 px-2.5 py-1 text-[0.65rem] font-bold tracking-wider text-white uppercase">
                Sold out
              </span>
            )}
          </div>
        </div>
      </Link>
      <button
        onClick={() => toggle(product.id)}
        aria-label="Toggle wishlist"
        className={`absolute top-3 right-3 flex h-9 w-9 items-center justify-center rounded-full bg-ivory/90 shadow transition hover:scale-110 ${
          has(product.id) ? "text-blush" : "text-inksoft"
        }`}
      >
        <svg
          className="h-4.5 w-4.5"
          viewBox="0 0 24 24"
          fill={has(product.id) ? "currentColor" : "none"}
          stroke="currentColor"
          strokeWidth="1.8"
        >
          <path d="M12 21s-7.5-4.8-9.5-9.2C.9 8 3 4.5 6.5 4.5c2.2 0 3.9 1.3 5.5 3.4 1.6-2.1 3.3-3.4 5.5-3.4 3.5 0 5.6 3.5 4 7.3C19.5 16.2 12 21 12 21Z" />
        </svg>
      </button>
      <div className="p-4">
        <Link href={`/product/${product.slug}`}>
          <h3 className="font-display text-lg leading-snug text-ink transition group-hover:text-lavender-deep">
            {product.name}
          </h3>
        </Link>
        {product.reviewCount > 0 && (
          <div className="mt-1 flex items-center gap-1.5">
            <Stars rating={product.avgRating} size="text-xs" />
            <span className="text-xs text-inksoft">({product.reviewCount})</span>
          </div>
        )}
        <div className="mt-2 flex items-center justify-between">
          <div className="flex items-baseline gap-2">
            <span className="font-semibold text-ink">{formatPrice(price)}</span>
            {onSale && (
              <span className="text-sm text-inksoft line-through">{formatPrice(product.price)}</span>
            )}
          </div>
          <button
            disabled={out}
            onClick={() =>
              addItem({
                id: product.id,
                slug: product.slug,
                name: product.name,
                price,
                image: product.image,
                stock: product.stock,
              })
            }
            className="rounded-full border border-ink/20 px-3 py-1.5 text-xs font-bold tracking-wide text-ink uppercase transition hover:bg-ink hover:text-ivory disabled:opacity-40"
          >
            {out ? "Sold out" : "Add"}
          </button>
        </div>
      </div>
    </div>
  );
}
