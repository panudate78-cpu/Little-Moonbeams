"use client";

import Image from "next/image";
import Link from "next/link";
import { useCart } from "@/components/providers";
import { formatPrice, calcShipping, FREE_SHIPPING_THRESHOLD } from "@/lib/utils";

export default function CartPage() {
  const { items, setQty, removeItem, subtotal } = useCart();
  const shipping = calcShipping(subtotal);

  if (items.length === 0) {
    return (
      <div className="mx-auto max-w-3xl px-6 py-24 text-center">
        <p className="text-5xl">☾</p>
        <h1 className="section-title mt-4">Your bag is empty</h1>
        <p className="mt-3 text-sm text-inksoft">
          Fill it with a little moonlight — browse our handmade treasures.
        </p>
        <Link href="/shop" className="btn-gold mt-8">
          Start shopping
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl px-6 py-12">
      <h1 className="section-title">Your Bag</h1>
      <div className="mt-8 grid gap-8 lg:grid-cols-[1fr_340px]">
        <div className="space-y-4">
          {items.map((item) => (
            <div key={item.id} className="card flex gap-4 p-4">
              <Link
                href={`/product/${item.slug}`}
                className="relative h-24 w-24 shrink-0 overflow-hidden rounded-xl bg-dustyblue-light"
              >
                {item.image && (
                  <Image src={item.image} alt={item.name} fill sizes="96px" className="object-cover" />
                )}
              </Link>
              <div className="flex flex-1 flex-col justify-between">
                <div className="flex items-start justify-between gap-2">
                  <Link href={`/product/${item.slug}`} className="font-display text-lg leading-snug">
                    {item.name}
                  </Link>
                  <button
                    onClick={() => removeItem(item.id)}
                    className="text-xs font-bold text-inksoft uppercase hover:text-blush"
                  >
                    Remove
                  </button>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center rounded-full border border-silvermist">
                    <button onClick={() => setQty(item.id, item.qty - 1)} className="px-3 py-1 text-inksoft">−</button>
                    <span className="w-6 text-center text-sm font-bold">{item.qty}</span>
                    <button onClick={() => setQty(item.id, item.qty + 1)} className="px-3 py-1 text-inksoft">+</button>
                  </div>
                  <span className="font-semibold">{formatPrice(item.price * item.qty)}</span>
                </div>
              </div>
            </div>
          ))}
        </div>

        <aside className="card h-fit p-6">
          <h2 className="font-display text-xl">Order Summary</h2>
          <dl className="mt-4 space-y-2 text-sm">
            <div className="flex justify-between">
              <dt className="text-inksoft">Subtotal</dt>
              <dd className="font-semibold">{formatPrice(subtotal)}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-inksoft">Shipping</dt>
              <dd className="font-semibold">{shipping === 0 ? "Free ✦" : formatPrice(shipping)}</dd>
            </div>
            <div className="flex justify-between border-t border-silvermist/50 pt-3 text-base">
              <dt className="font-bold">Total</dt>
              <dd className="font-bold">{formatPrice(subtotal + shipping)}</dd>
            </div>
          </dl>
          {subtotal < FREE_SHIPPING_THRESHOLD && (
            <p className="mt-3 rounded-xl bg-lavender-light p-3 text-xs text-lavender-deep">
              ✦ Spend {formatPrice(FREE_SHIPPING_THRESHOLD - subtotal)} more for free UK shipping!
            </p>
          )}
          <Link href="/checkout" className="btn-gold mt-5 w-full">
            Secure Checkout 🔒
          </Link>
          <p className="mt-3 text-center text-xs text-inksoft">
            Stripe · PayPal · Apple Pay · Google Pay
          </p>
        </aside>
      </div>
    </div>
  );
}
