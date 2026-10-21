import { getAllCategories, getAllCollections } from "@/lib/catalog";
import { ProductForm } from "@/components/admin/product-form";

export const dynamic = "force-dynamic";

export default async function NewProductPage() {
  const [categories, collections] = await Promise.all([getAllCategories(), getAllCollections()]);
  return (
    <div>
      <h1 className="mb-6 font-display text-3xl">Add product</h1>
      <ProductForm categories={categories} collections={collections} />
    </div>
  );
}
