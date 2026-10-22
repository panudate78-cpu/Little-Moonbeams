import type { Metadata } from "next";
import Image from "next/image";
import { notFound } from "next/navigation";
import { db } from "@/db";
import { collections } from "@/db/schema";
import { eq } from "drizzle-orm";
import { getShopProducts } from "@/lib/catalog";
import { ProductCard } from "@/components/product-card";
import { toCardProduct } from "@/lib/card-product";

export const dynamic = "force-dynamic";

interface Props {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata(props: Props): Promise<Metadata> {
  const { slug } = await props.params;
  const [collection] = await db.select().from(collections).where(eq(collections.slug, slug)).limit(1);
  if (!collection) return { title: "Collection not found" };
  return {
    title: `${collection.name} Collection`,
    description: collection.description ?? `Shop the ${collection.name} collection by Little Moonbeam's Creations.`,
  };
}

export default async function CollectionPage(props: Props) {
  const { slug } = await props.params;
  const [collection] = await db.select().from(collections).where(eq(collections.slug, slug)).limit(1);
  if (!collection) notFound();

  const products = await getShopProducts({ collection: slug });

  return (
    <div>
      <section className="relative overflow-hidden bg-night">
       
        <div className="relative mx-auto max-w-7xl px-6 py-20 text-center">
          <p className="eyebrow">A Little Moonbeam&apos;s Creations collection</p>
          <h1 className="mt-2 font-display text-4xl text-ivory sm:text-5xl">{collection.name}</h1>
          {collection.description && (
            <p className="mx-auto mt-4 max-w-xl text-sm leading-relaxed text-ivory/80">
              {collection.description}
            </p>
          )}
        </div>
      </section>
      <div className="mx-auto max-w-7xl px-6 py-12">
        {products.length === 0 ? (
          <p className="py-16 text-center text-inksoft">
            New pieces for this collection are being crafted under the next full moon. ☾
          </p>
        ) : (
          <div className="grid grid-cols-2 gap-4 sm:gap-6 lg:grid-cols-4">
            {products.map((p) => (
              <ProductCard key={p.id} product={toCardProduct(p)} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
