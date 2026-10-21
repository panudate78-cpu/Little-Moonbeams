import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "FAQ",
  description: "Frequently asked questions about Little Moonbeam's handmade jewellery.",
};

const FAQS = [
  {
    q: "Is every piece really handmade?",
    a: "Yes! Every single piece is made by hand in our studio using precious stones, crystals, sterling silver, natural materials and artisan components. Because of this, small variations are part of each piece's charm — no two are ever identical.",
  },
  {
    q: "Are your gemstones genuine?",
    a: "We use genuine, natural gemstones and crystals sourced from trusted, ethical suppliers. Each product page lists full stone information so you know exactly what you're wearing.",
  },
  {
    q: "How long does delivery take?",
    a: "In-stock items are dispatched within 1–2 working days. UK standard delivery takes 2–4 working days; international delivery typically takes 7–14 working days. Orders over £50 ship free within the UK.",
  },
  {
    q: "Do you offer gift wrapping?",
    a: "Every order arrives beautifully packaged in our signature moonlit gift box with a care card — perfect for gifting at no extra charge.",
  },
  {
    q: "Can I return my jewellery?",
    a: "Of course. We offer 30-day returns on unworn items in their original packaging. Custom and personalised pieces are non-returnable unless faulty. See our Shipping & Returns page for details.",
  },
  {
    q: "How do I care for my jewellery?",
    a: "Keep your pieces away from water, perfume and lotions. Store them in the pouch provided, and polish sterling silver gently with the included cloth. Each product page has stone-specific care instructions.",
  },
  {
    q: "Do you take custom orders?",
    a: "Yes — bespoke commissions are one of our favourite things! Visit the Custom Orders page to share your idea and we'll reply with sketches and a quote within 3 working days.",
  },
  {
    q: "Which payment methods do you accept?",
    a: "We accept all major credit and debit cards via Stripe, plus PayPal, Apple Pay and Google Pay. All payments are 256-bit SSL encrypted.",
  },
];

export default function FaqPage() {
  return (
    <div className="mx-auto max-w-3xl px-6 py-16">
      <div className="text-center">
        <p className="eyebrow">Need a hand?</p>
        <h1 className="section-title mt-2">Frequently Asked Questions</h1>
      </div>
      <div className="mt-10 space-y-3">
        {FAQS.map((f) => (
          <details key={f.q} className="card group p-5">
            <summary className="cursor-pointer font-display text-lg text-ink">
              ✦ {f.q}
            </summary>
            <p className="mt-3 text-sm leading-relaxed text-inksoft">{f.a}</p>
          </details>
        ))}
      </div>
    </div>
  );
}
