import type { Metadata } from "next";
import { ContactForm } from "@/components/contact-form";

export const metadata: Metadata = {
  title: "Contact Us",
  description: "Get in touch with Little Moonbeam's — questions, orders, or just to say hello.",
};

export default function ContactPage() {
  return (
    <div className="mx-auto max-w-5xl px-6 py-16">
      <div className="text-center">
        <p className="eyebrow">We&apos;d love to hear from you</p>
        <h1 className="section-title mt-2">Contact Us</h1>
        <p className="mx-auto mt-4 max-w-xl text-sm leading-relaxed text-inksoft">
          Questions about an order, a stone, or a sparkle emergency? Send us a message and
          we&apos;ll reply within 1–2 working days.
        </p>
      </div>
      <div className="mt-10 grid gap-8 lg:grid-cols-[1fr_300px]">
        <ContactForm />
        <aside className="space-y-4">
          <div className="card p-6">
            <h2 className="font-display text-lg">✉️ Email</h2>
            <p className="mt-1 text-sm text-inksoft">hello@littlemoonbeams.co.uk</p>
          </div>
          <div className="card p-6">
            <h2 className="font-display text-lg">🕰 Studio hours</h2>
            <p className="mt-1 text-sm text-inksoft">
              Monday – Friday, 9am – 5pm GMT
              <br />
              (and the occasional moonlit night)
            </p>
          </div>
          <div className="card p-6">
            <h2 className="font-display text-lg">📍 Studio</h2>
            <p className="mt-1 text-sm text-inksoft">
              The Moonbeam Studio
              <br />
              Cotswolds, United Kingdom
            </p>
          </div>
        </aside>
      </div>
    </div>
  );
}
