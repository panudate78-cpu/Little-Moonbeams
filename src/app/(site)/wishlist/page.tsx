"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useWishlist } from "@/components/providers";
import { ProductCard, type CardProduct } from "@/components/product-card";

export default function WishlistPage() {
  const { ids } = useWishlist();
  const [products, setProducts] = useState<CardProduct[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (ids.length === 0) {
      setProducts([]);
      setLoading(false);
      return;
    }
    fetch(`/api/products?ids=${ids.join(",")}`)
      .then((r) => r.json())
      .then((data) => setProducts(data.products ?? []))
      .finally(() => setLoading(false));
  }, [ids]);

  return (
    <div className="mx-auto max-w-7xl px-6 py-12">
      <div className="text-center">
        <p className="eyebrow">Saved for a moonlit day</p>
        <h1 className="section-title mt-2">Your Wishlist ♡</h1>
      </div>
      {loading ? (
        <p className="py-24 text-center text-inksoft">Gathering your treasures… ✦</p>
      ) : products.length === 0 ? (
        <div className="py-24 text-center">
          <p className="text-5xl">♡</p>
          <p className="mt-4 font-display text-2xl">Your wishlist is empty</p>
          <p className="mt-2 text-sm text-inksoft">
            Tap the heart on any piece you love and it will appear here.
          </p>
          <Link href="/shop" className="btn-gold mt-8">
            Discover jewellery
          </Link>
        </div>
      ) : (
        <div className="mt-10 grid grid-cols-2 gap-4 sm:gap-6 lg:grid-cols-4">
          {products.map((p) => (
            <ProductCard key={p.id} product={p} />
          ))}
        </div>
      )}
    </div>
  );
}
