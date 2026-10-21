import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { getAllCollections } from "@/lib/catalog";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Collections",
  description:
    "Explore Little Moonbeam's curated jewellery collections — celestial, crystal and nature-inspired handmade pieces.",
};

export default async function CollectionsPage() {
  const collections = await getAllCollections();

  return (
    <div className="mx-auto max-w-7xl px-6 py-12">
      <div className="text-center">
        <p className="eyebrow">Curated with care</p>
        <h1 className="section-title mt-2">Our Collections</h1>
        <p className="mx-auto mt-4 max-w-xl text-sm leading-relaxed text-inksoft">
          Each collection tells its own story — of moonlit skies, wildflower meadows, rolling
          oceans and the quiet magic of crystals.
        </p>
      </div>
      <div className="mt-10 grid gap-6 sm:grid-cols-2">
        {collections.map((c) => (
          <Link
            key={c.id}
            href={`/collections/${c.slug}`}
            className="group relative block aspect-[16/9] overflow-hidden rounded-2xl"
          >
            <Image
              src={c.image || "/images/hero.jpg"}
              alt={c.name}
              fill
              sizes="(max-width: 640px) 100vw, 50vw"
              className="object-cover transition duration-500 group-hover:scale-105"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-night/85 via-night/20 to-transparent" />
            <div className="absolute bottom-0 p-6">
              <h2 className="font-display text-2xl text-ivory">{c.name}</h2>
              {c.description && (
                <p className="mt-1 max-w-sm text-sm text-ivory/75">{c.description}</p>
              )}
              <p className="mt-2 text-xs font-bold tracking-widest text-gold uppercase">
                Shop the collection →
              </p>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
