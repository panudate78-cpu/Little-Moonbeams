import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Shipping & Returns",
  description: "Little Moonbeam's shipping rates, delivery times and 30-day returns policy.",
};

export default function ShippingReturnsPage() {
  return (
    <div className="mx-auto max-w-3xl px-6 py-16">
      <div className="text-center">
        <p className="eyebrow">The practical sparkle</p>
        <h1 className="section-title mt-2">Shipping & Returns</h1>
      </div>

      <section className="card mt-10 p-8">
        <h2 className="font-display text-2xl">📦 Shipping</h2>
        <div className="mt-4 space-y-3 text-sm leading-relaxed text-inksoft">
          <p>All in-stock orders are lovingly packed and dispatched within 1–2 working days.</p>
          <table className="w-full border-collapse text-left">
            <thead>
              <tr className="border-b border-silvermist/60 text-xs tracking-widest text-ink uppercase">
                <th className="py-2">Service</th>
                <th className="py-2">Time</th>
                <th className="py-2">Cost</th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-b border-silvermist/30">
                <td className="py-2">UK Standard (Tracked)</td>
                <td className="py-2">2–4 working days</td>
                <td className="py-2">£3.95 (free over £50)</td>
              </tr>
              <tr className="border-b border-silvermist/30">
                <td className="py-2">UK Express</td>
                <td className="py-2">1–2 working days</td>
                <td className="py-2">£6.95</td>
              </tr>
              <tr>
                <td className="py-2">International (Tracked)</td>
                <td className="py-2">7–14 working days</td>
                <td className="py-2">from £9.95</td>
              </tr>
            </tbody>
          </table>
          <p>
            Every parcel is sent tracked — you&apos;ll receive your tracking number by email the
            moment your treasures leave the studio.
          </p>
        </div>
      </section>

      <section className="card mt-6 p-8">
        <h2 className="font-display text-2xl">↩️ Returns & Exchanges</h2>
        <div className="mt-4 space-y-3 text-sm leading-relaxed text-inksoft">
          <p>
            We want you to adore your jewellery. If something isn&apos;t quite right, you have{" "}
            <strong>30 days</strong> from delivery to return unworn items in their original
            packaging for a full refund or exchange.
          </p>
          <p>
            To start a return, simply email <strong>hello@littlemoonbeams.co.uk</strong> with your
            order number. Refunds are processed within 5 working days of receiving your return.
          </p>
          <p>
            <strong>Please note:</strong> earrings (for hygiene reasons) and custom or
            personalised pieces are non-returnable unless faulty. Faulty items are always repaired,
            replaced or refunded with our sincerest apologies.
          </p>
        </div>
      </section>
    </div>
  );
}
