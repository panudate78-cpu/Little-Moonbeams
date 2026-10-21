import type { Metadata } from "next";
import { ContactForm } from "@/components/contact-form";

export const metadata: Metadata = {
  title: "Custom Orders",
  description:
    "Commission a bespoke handmade jewellery piece from Little Moonbeam's — your stones, your story, your sparkle.",
};

const STEPS = [
  { n: "1", title: "Share your vision", text: "Tell us about the piece you're dreaming of — stones, colours, occasion, budget." },
  { n: "2", title: "Design together", text: "We'll sketch ideas, suggest gemstones and send you a quote within 3 working days." },
  { n: "3", title: "Handmade for you", text: "Once approved, your piece is crafted by hand — usually within 2–3 weeks." },
  { n: "4", title: "Delivered with love", text: "Gift-wrapped, tracked and sent with care instructions and a little stardust." },
];

export default function CustomOrdersPage() {
  return (
    <div className="mx-auto max-w-5xl px-6 py-16">
      <div className="text-center">
        <p className="eyebrow">Made just for you</p>
        <h1 className="section-title mt-2">
          Custom <span className="font-script text-lavender-deep">Orders</span>
        </h1>
        <p className="mx-auto mt-4 max-w-xl text-sm leading-relaxed text-inksoft">
          Wedding jewellery, birthstone gifts, memorial pieces, or something entirely your own —
          we love bringing bespoke ideas to life.
        </p>
      </div>

      <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {STEPS.map((s) => (
          <div key={s.n} className="card p-6 text-center">
            <span className="mx-auto flex h-10 w-10 items-center justify-center rounded-full bg-lavender font-display text-lg text-white">
              {s.n}
            </span>
            <h2 className="mt-3 font-display text-lg">{s.title}</h2>
            <p className="mt-2 text-xs leading-relaxed text-inksoft">{s.text}</p>
          </div>
        ))}
      </div>

      <div className="mt-12">
        <h2 className="mb-4 text-center font-display text-2xl">Start your commission ✦</h2>
        <ContactForm
          type="custom-order"
          subjectPlaceholder="e.g. Bespoke moonstone wedding necklace"
          messagePlaceholder="Tell us about your dream piece — stones, metals, size, occasion and rough budget…"
        />
      </div>
    </div>
  );
}
