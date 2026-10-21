"use client";

import { useState } from "react";
import { useCart, useWishlist } from "@/components/providers";

interface ActionProduct {
  id: number;
  slug: string;
  name: string;
  price: number;
  image: string;
  stock: number;
}

export function AddToCartPanel({ product }: { product: ActionProduct }) {
  const { addItem } = useCart();
  const { has, toggle } = useWishlist();
  const [qty, setQty] = useState(1);
  const [added, setAdded] = useState(false);
  const out = product.stock <= 0;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center rounded-full border border-silvermist bg-ivory">
          <button
            onClick={() => setQty((q) => Math.max(1, q - 1))}
            className="px-4 py-2.5 text-lg text-inksoft hover:text-ink"
            aria-label="Decrease quantity"
          >
            −
          </button>
          <span className="w-8 text-center text-sm font-bold">{qty}</span>
          <button
            onClick={() => setQty((q) => Math.min(product.stock || 1, q + 1))}
            className="px-4 py-2.5 text-lg text-inksoft hover:text-ink"
            aria-label="Increase quantity"
          >
            +
          </button>
        </div>
        <button
          disabled={out}
          onClick={() => {
            addItem(product, qty);
            setAdded(true);
            setTimeout(() => setAdded(false), 2000);
          }}
          className="btn-gold flex-1"
        >
          {out ? "Sold Out" : added ? "✦ Added to bag!" : "Add to Bag"}
        </button>
        <button
          onClick={() => toggle(product.id)}
          aria-label="Toggle wishlist"
          className={`flex h-12 w-12 items-center justify-center rounded-full border transition hover:scale-105 ${
            has(product.id)
              ? "border-blush bg-blush-light text-blush"
              : "border-silvermist bg-ivory text-inksoft"
          }`}
        >
          <svg
            className="h-5 w-5"
            viewBox="0 0 24 24"
            fill={has(product.id) ? "currentColor" : "none"}
            stroke="currentColor"
            strokeWidth="1.8"
          >
            <path d="M12 21s-7.5-4.8-9.5-9.2C.9 8 3 4.5 6.5 4.5c2.2 0 3.9 1.3 5.5 3.4 1.6-2.1 3.3-3.4 5.5-3.4 3.5 0 5.6 3.5 4 7.3C19.5 16.2 12 21 12 21Z" />
          </svg>
        </button>
      </div>
    </div>
  );
}

export function ShareButtons({ name, slug }: { name: string; slug: string }) {
  const [copied, setCopied] = useState(false);
  const url = typeof window !== "undefined" ? `${window.location.origin}/product/${slug}` : `/product/${slug}`;
  const text = encodeURIComponent(`${name} — handmade by Little Moonbeam's ☾`);

  return (
    <div className="flex items-center gap-3 text-sm text-inksoft">
      <span className="font-semibold">Share:</span>
      <a
        href={`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`}
        target="_blank"
        rel="noreferrer"
        className="transition hover:text-lavender-deep"
      >
        Facebook
      </a>
      <a
        href={`https://twitter.com/intent/tweet?text=${text}&url=${encodeURIComponent(url)}`}
        target="_blank"
        rel="noreferrer"
        className="transition hover:text-lavender-deep"
      >
        X
      </a>
      <a
        href={`https://pinterest.com/pin/create/button/?url=${encodeURIComponent(url)}&description=${text}`}
        target="_blank"
        rel="noreferrer"
        className="transition hover:text-lavender-deep"
      >
        Pinterest
      </a>
      <button
        onClick={() => {
          navigator.clipboard.writeText(url);
          setCopied(true);
          setTimeout(() => setCopied(false), 1500);
        }}
        className="transition hover:text-lavender-deep"
      >
        {copied ? "Copied ✦" : "Copy link"}
      </button>
    </div>
  );
}
