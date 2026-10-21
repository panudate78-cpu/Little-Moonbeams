import { getAllCategories, getAllCollections } from "@/lib/catalog";
import { CatalogManager } from "@/components/admin/admin-widgets";

export const dynamic = "force-dynamic";

export default async function AdminCatalogPage() {
  const [categories, collections] = await Promise.all([getAllCategories(), getAllCollections()]);
  return (
    <div>
      <h1 className="font-display text-3xl">Categories & Collections</h1>
      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <CatalogManager title="Categories" endpoint="/api/admin/categories" items={categories} />
        <CatalogManager
          title="Collections"
          endpoint="/api/admin/collections"
          items={collections}
          withImage
        />
      </div>
    </div>
  );
}
