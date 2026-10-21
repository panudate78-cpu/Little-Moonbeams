import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";

export const metadata: Metadata = {
  title: "About Us",
  description:
    "The story of Little Moonbeam's — handmade jewellery crafted from precious stones, crystals and sterling silver, inspired by nature and moonlight.",
};

const VALUES = [
  {
    icon: "☾",
    title: "Moonlit Inspiration",
    text: "Every design begins with a sketch under the night sky — the moon's phases, constellations and the soft shimmer of starlight guide our hands.",
  },
  {
    icon: "🌿",
    title: "Nature's Treasures",
    text: "We source ethically-mined gemstones, responsibly gathered natural materials and recycled sterling silver wherever possible.",
  },
  {
    icon: "🤲",
    title: "Truly Handmade",
    text: "No factories, no mass production. Each piece is shaped, wired, polished and blessed with a little wish at our studio workbench.",
  },
];

export default function AboutPage() {
  return (
    <div>
      <section className="mx-auto grid max-w-7xl gap-10 px-6 py-16 lg:grid-cols-2 lg:items-center">
        <div>
          <p className="eyebrow">Our story</p>
          <h1 className="section-title mt-3">
            Born from a love of <span className="font-script text-lavender-deep">moonlight</span> &
            precious stones
          </h1>
          <div className="mt-6 space-y-4 leading-relaxed text-inksoft">
            <p>
              Little Moonbeam&apos;s began at a kitchen table, with a pouch of moonstones, a spool
              of sterling silver wire, and a head full of midnight daydreams. What started as gifts
              for friends soon grew into a tiny studio filled with crystals, beads and the quiet
              joy of making things by hand.
            </p>
            <p>
              Today, every Little Moonbeam&apos;s piece is still crafted the same way: slowly,
              carefully, and with genuine delight. We work with rainbow moonstone, amethyst,
              labradorite, rose quartz, freshwater pearls and dozens of other natural treasures —
              each stone chosen by hand for its colour, character and sparkle.
            </p>
            <p>
              We believe jewellery should feel personal, a little magical, and made to be loved
              for a lifetime. Thank you for supporting handmade. ✦
            </p>
          </div>
          <Link href="/shop" className="btn-gold mt-8">
            Shop our jewellery
          </Link>
        </div>
        <div className="relative aspect-[4/5] overflow-hidden rounded-3xl">
          <Image
            src="/images/about.jpg"
            alt="Hands crafting gemstone jewellery at the Little Moonbeam's studio"
            fill
            sizes="(max-width: 1024px) 100vw, 50vw"
            className="object-cover"
          />
        </div>
      </section>

      <section className="bg-lavender-light/60 py-16">
        <div className="mx-auto grid max-w-6xl gap-8 px-6 md:grid-cols-3">
          {VALUES.map((v) => (
            <div key={v.title} className="card p-8 text-center">
              <span className="text-3xl">{v.icon}</span>
              <h2 className="mt-3 font-display text-xl">{v.title}</h2>
              <p className="mt-3 text-sm leading-relaxed text-inksoft">{v.text}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-3xl px-6 py-16 text-center">
        <p className="font-script text-3xl text-lavender-deep">
          “Handcrafted jewellery inspired by nature and moonlight.”
        </p>
        <p className="mt-4 text-sm text-inksoft">— The Little Moonbeam&apos;s promise</p>
      </section>
    </div>
  );
}
