import { notFound } from "next/navigation";
import { db } from "@/db";
import { products, productImages } from "@/db/schema";
import { asc, eq } from "drizzle-orm";
import { getAllCategories, getAllCollections } from "@/lib/catalog";
import { ProductForm } from "@/components/admin/product-form";

export const dynamic = "force-dynamic";

export default async function EditProductPage(props: { params: Promise<{ id: string }> }) {
  const { id } = await props.params;
  const productId = Number(id);
  if (!Number.isFinite(productId)) notFound();

  const [[product], images, categories, collections] = await Promise.all([
    db.select().from(products).where(eq(products.id, productId)).limit(1),
    db
      .select()
      .from(productImages)
      .where(eq(productImages.productId, productId))
      .orderBy(asc(productImages.position)),
    getAllCategories(),
    getAllCollections(),
  ]);
  if (!product) notFound();

  return (
    <div>
      <h1 className="mb-6 font-display text-3xl">Edit: {product.name}</h1>
      <ProductForm
        categories={categories}
        collections={collections}
        initial={{
          id: product.id,
          name: product.name,
          slug: product.slug,
          sku: product.sku,
          description: product.description,
          materials: product.materials,
          stoneInfo: product.stoneInfo,
          careInstructions: product.careInstructions,
          price: product.price,
          salePrice: product.salePrice,
          stock: product.stock,
          lowStockThreshold: product.lowStockThreshold,
          status: product.status,
          featured: product.featured,
          isNew: product.isNew,
          isBestseller: product.isBestseller,
          categoryId: product.categoryId,
          collectionId: product.collectionId,
          metaTitle: product.metaTitle,
          metaDescription: product.metaDescription,
          images: images.map((i) => ({ url: i.url, alt: i.alt })),
        }}
      />
    </div>
  );
}
