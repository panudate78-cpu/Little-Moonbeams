"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useCart } from "@/components/providers";
import { formatPrice, calcShipping, includedTax } from "@/lib/utils";

const PAYMENT_METHODS = [
  { id: "card", label: "Card (Stripe)", icon: "💳" },
  { id: "paypal", label: "PayPal", icon: "🅿️" },
  { id: "apple-pay", label: "Apple Pay", icon: "" },
  { id: "google-pay", label: "Google Pay", icon: "🇬" },
];

export default function CheckoutPage() {
  const { items, subtotal, clear } = useCart();
  const router = useRouter();
  const [form, setForm] = useState({
    email: "",
    name: "",
    phone: "",
    address1: "",
    address2: "",
    city: "",
    postcode: "",
    country: "United Kingdom",
  });
  const [payment, setPayment] = useState("card");
  const [code, setCode] = useState("");
  const [applied, setApplied] = useState<{ code: string; discount: number } | null>(null);
  const [codeError, setCodeError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const discount = applied?.discount ?? 0;
  const afterDiscount = Math.max(0, subtotal - discount);
  const shipping = calcShipping(afterDiscount);
  const total = afterDiscount + shipping;
  const tax = includedTax(total);

  function update(field: string, value: string) {
    setForm((f) => ({ ...f, [field]: value }));
  }

  async function applyCode() {
    setCodeError("");
    try {
      const res = await fetch("/api/discounts/validate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code, subtotal }),
      });
      const data = await res.json();
      if (!res.ok) {
        setCodeError(data.error ?? "Invalid code");
        setApplied(null);
        return;
      }
      setApplied({ code: data.code, discount: data.discount });
    } catch {
      setCodeError("Could not validate code");
    }
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError("");
    try {
      const res = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          paymentMethod: payment,
          discountCode: applied?.code ?? null,
          items: items.map((i) => ({ id: i.id, qty: i.qty })),
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Checkout failed. Please try again.");
        setSubmitting(false);
        return;
      }
      clear();
      router.push(`/checkout/success?order=${encodeURIComponent(data.orderNumber)}`);
    } catch {
      setError("Checkout failed. Please try again.");
      setSubmitting(false);
    }
  }

  if (items.length === 0) {
    return (
      <div className="mx-auto max-w-3xl px-6 py-24 text-center">
        <p className="text-5xl">☾</p>
        <h1 className="section-title mt-4">Nothing to check out</h1>
        <Link href="/shop" className="btn-gold mt-8">
          Browse the shop
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl px-6 py-12">
      <h1 className="section-title">Secure Checkout 🔒</h1>
      <p className="mt-2 text-sm text-inksoft">
        Guest checkout available — or{" "}
        <Link href="/login?next=/checkout" className="text-lavender-deep underline">
          sign in
        </Link>{" "}
        to save your order history.
      </p>
      <form onSubmit={submit} className="mt-8 grid gap-10 lg:grid-cols-[1fr_380px]">
        <div className="space-y-8">
          <section>
            <h2 className="mb-4 font-display text-xl">Contact details</h2>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="label">Email *</label>
                <input type="email" required className="input" value={form.email} onChange={(e) => update("email", e.target.value)} />
              </div>
              <div>
                <label className="label">Full name *</label>
                <input required className="input" value={form.name} onChange={(e) => update("name", e.target.value)} />
              </div>
              <div className="sm:col-span-2">
                <label className="label">Phone</label>
                <input className="input" value={form.phone} onChange={(e) => update("phone", e.target.value)} />
              </div>
            </div>
          </section>
          <section>
            <h2 className="mb-4 font-display text-xl">Delivery address</h2>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <label className="label">Address line 1 *</label>
                <input required className="input" value={form.address1} onChange={(e) => update("address1", e.target.value)} />
              </div>
              <div className="sm:col-span-2">
                <label className="label">Address line 2</label>
                <input className="input" value={form.address2} onChange={(e) => update("address2", e.target.value)} />
              </div>
              <div>
                <label className="label">City *</label>
                <input required className="input" value={form.city} onChange={(e) => update("city", e.target.value)} />
              </div>
              <div>
                <label className="label">Postcode *</label>
                <input required className="input" value={form.postcode} onChange={(e) => update("postcode", e.target.value)} />
              </div>
              <div className="sm:col-span-2">
                <label className="label">Country *</label>
                <select className="input" value={form.country} onChange={(e) => update("country", e.target.value)}>
                  <option>United Kingdom</option>
                  <option>Ireland</option>
                  <option>United States</option>
                  <option>Canada</option>
                  <option>Australia</option>
                  <option>Germany</option>
                  <option>France</option>
                </select>
              </div>
            </div>
          </section>
          <section>
            <h2 className="mb-4 font-display text-xl">Payment method</h2>
            <div className="grid gap-3 sm:grid-cols-2">
              {PAYMENT_METHODS.map((m) => (
                <label
                  key={m.id}
                  className={`flex cursor-pointer items-center gap-3 rounded-xl border p-4 transition ${
                    payment === m.id ? "border-lavender bg-lavender-light" : "border-silvermist bg-ivory"
                  }`}
                >
                  <input
                    type="radio"
                    name="payment"
                    value={m.id}
                    checked={payment === m.id}
                    onChange={() => setPayment(m.id)}
                    className="accent-lavender"
                  />
                  <span className="text-sm font-semibold">
                    {m.icon} {m.label}
                  </span>
                </label>
              ))}
            </div>
            <p className="mt-3 text-xs text-inksoft">
              Payments are processed securely. This demo store simulates the payment step — no real
              charge is made.
            </p>
          </section>
        </div>

        <aside className="card h-fit p-6">
          <h2 className="font-display text-xl">Your order</h2>
          <ul className="mt-4 space-y-3">
            {items.map((i) => (
              <li key={i.id} className="flex items-center gap-3 text-sm">
                <span className="relative h-12 w-12 shrink-0 overflow-hidden rounded-lg bg-dustyblue-light">
                  {i.image && <Image src={i.image} alt={i.name} fill sizes="48px" className="object-cover" />}
                </span>
                <span className="flex-1">
                  {i.name} <span className="text-inksoft">× {i.qty}</span>
                </span>
                <span className="font-semibold">{formatPrice(i.price * i.qty)}</span>
              </li>
            ))}
          </ul>
          <div className="mt-4 flex gap-2">
            <input
              className="input"
              placeholder="Discount code"
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
            />
            <button type="button" onClick={applyCode} className="btn-outline !px-4 !py-2 text-xs">
              Apply
            </button>
          </div>
          {codeError && <p className="mt-2 text-xs text-blush">{codeError}</p>}
          {applied && (
            <p className="mt-2 text-xs font-semibold text-lavender-deep">
              ✦ Code {applied.code} applied — you saved {formatPrice(applied.discount)}
            </p>
          )}
          <dl className="mt-4 space-y-2 border-t border-silvermist/50 pt-4 text-sm">
            <div className="flex justify-between">
              <dt className="text-inksoft">Subtotal</dt>
              <dd>{formatPrice(subtotal)}</dd>
            </div>
            {discount > 0 && (
              <div className="flex justify-between text-lavender-deep">
                <dt>Discount</dt>
                <dd>−{formatPrice(discount)}</dd>
              </div>
            )}
            <div className="flex justify-between">
              <dt className="text-inksoft">Shipping</dt>
              <dd>{shipping === 0 ? "Free ✦" : formatPrice(shipping)}</dd>
            </div>
            <div className="flex justify-between text-xs text-inksoft">
              <dt>Includes VAT (20%)</dt>
              <dd>{formatPrice(tax)}</dd>
            </div>
            <div className="flex justify-between border-t border-silvermist/50 pt-3 text-base font-bold">
              <dt>Total</dt>
              <dd>{formatPrice(total)}</dd>
            </div>
          </dl>
          {error && <p className="mt-3 rounded-xl bg-blush-light p-3 text-sm text-blush">{error}</p>}
          <button disabled={submitting} className="btn-gold mt-5 w-full">
            {submitting ? "Processing payment…" : `Pay ${formatPrice(total)}`}
          </button>
          <p className="mt-3 text-center text-xs text-inksoft">🔒 256-bit SSL encrypted checkout</p>
        </aside>
      </form>
    </div>
  );
}
