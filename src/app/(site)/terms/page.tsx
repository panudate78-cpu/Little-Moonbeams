import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Terms & Conditions",
  description: "Terms and conditions for shopping with Little Moonbeam's.",
};

export default function TermsPage() {
  return (
    <div className="mx-auto max-w-3xl px-6 py-16">
      <div className="text-center">
        <p className="eyebrow">The small print, with sparkle</p>
        <h1 className="section-title mt-2">Terms & Conditions</h1>
        <p className="mt-2 text-xs text-inksoft">Last updated: January 2026</p>
      </div>
      <div className="card mt-10 space-y-6 p-8 text-sm leading-relaxed text-inksoft">
        <section>
          <h2 className="font-display text-xl text-ink">1. About these terms</h2>
          <p className="mt-2">
            These terms apply to all purchases made from Little Moonbeam&apos;s. By placing an
            order you agree to these terms. Nothing in them affects your statutory rights.
          </p>
        </section>
        <section>
          <h2 className="font-display text-xl text-ink">2. Products</h2>
          <p className="mt-2">
            All jewellery is handmade using natural gemstones and materials. Minor variations in
            colour, shape and pattern are natural characteristics, not defects. Product images are
            as accurate as possible, but screens may display colours differently.
          </p>
        </section>
        <section>
          <h2 className="font-display text-xl text-ink">3. Pricing & payment</h2>
          <p className="mt-2">
            Prices are shown in GBP and include VAT. Payment is taken at the time of order via
            Stripe, PayPal, Apple Pay or Google Pay. We reserve the right to correct pricing
            errors; if an error affects your order we&apos;ll contact you before dispatch.
          </p>
        </section>
        <section>
          <h2 className="font-display text-xl text-ink">4. Delivery</h2>
          <p className="mt-2">
            Delivery estimates are set out on our Shipping & Returns page. We are not liable for
            delays caused by couriers or customs, but we will always help chase a wandering parcel.
          </p>
        </section>
        <section>
          <h2 className="font-display text-xl text-ink">5. Returns</h2>
          <p className="mt-2">
            You may return unworn items within 30 days of delivery as described in our Shipping &
            Returns policy. Earrings and custom pieces are excluded unless faulty.
          </p>
        </section>
        <section>
          <h2 className="font-display text-xl text-ink">6. Custom orders</h2>
          <p className="mt-2">
            Bespoke commissions require a 50% non-refundable deposit once the design is approved.
            Completed custom pieces are non-returnable unless faulty.
          </p>
        </section>
        <section>
          <h2 className="font-display text-xl text-ink">7. Intellectual property</h2>
          <p className="mt-2">
            All designs, photography and content on this site belong to Little Moonbeam&apos;s and
            may not be reproduced without permission.
          </p>
        </section>
        <section>
          <h2 className="font-display text-xl text-ink">8. Governing law</h2>
          <p className="mt-2">These terms are governed by the laws of England and Wales.</p>
        </section>
      </div>
    </div>
  );
}
