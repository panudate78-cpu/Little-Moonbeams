import Image from "next/image";
import Link from "next/link";
import { db } from "@/db";
import { products, productImages, categories } from "@/db/schema";
import { asc, desc, eq } from "drizzle-orm";
import { formatPrice } from "@/lib/utils";
import { DeleteProductButton } from "@/components/admin/admin-widgets";

export const dynamic = "force-dynamic";

export default async function AdminProductsPage() {
  const [rows, images, cats] = await Promise.all([
    db.select().from(products).orderBy(desc(products.createdAt)),
    db.select().from(productImages).orderBy(asc(productImages.position)),
    db.select().from(categories),
  ]);

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="font-display text-3xl">Products ({rows.length})</h1>
        <Link href="/admin/products/new" className="btn-gold !px-5 !py-2 text-xs">
          + Add product
        </Link>
      </div>
      <div className="card mt-6 overflow-x-auto">
        <table className="w-full min-w-[800px] text-sm">
          <thead>
            <tr className="border-b border-silvermist/50 text-left text-xs tracking-wide text-inksoft uppercase">
              <th className="p-4">Product</th>
              <th className="p-4">SKU</th>
              <th className="p-4">Category</th>
              <th className="p-4">Price</th>
              <th className="p-4">Stock</th>
              <th className="p-4">Status</th>
              <th className="p-4">Flags</th>
              <th className="p-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((p) => {
              const img = images.find((i) => i.productId === p.id);
              const cat = cats.find((c) => c.id === p.categoryId);
              const low = p.stock <= p.lowStockThreshold;
              return (
                <tr key={p.id} className="border-b border-silvermist/30 hover:bg-cream/60">
                  <td className="p-4">
                    <div className="flex items-center gap-3">
                      <span className="relative h-12 w-12 shrink-0 overflow-hidden rounded-lg bg-dustyblue-light">
                        {img && (
                          <Image src={img.url} alt={p.name} fill sizes="48px" className="object-cover" />
                        )}
                      </span>
                      <div>
                        <Link href={`/admin/products/${p.id}`} className="font-semibold hover:underline">
                          {p.name}
                        </Link>
                        <p className="text-xs text-inksoft">/{p.slug}</p>
                      </div>
                    </div>
                  </td>
                  <td className="p-4 text-xs">{p.sku || "—"}</td>
                  <td className="p-4 text-xs">{cat?.name ?? "—"}</td>
                  <td className="p-4">
                    {p.salePrice !== null ? (
                      <>
                        <span className="font-semibold text-blush">{formatPrice(p.salePrice)}</span>{" "}
                        <span className="text-xs text-inksoft line-through">{formatPrice(p.price)}</span>
                      </>
                    ) : (
                      <span className="font-semibold">{formatPrice(p.price)}</span>
                    )}
                  </td>
                  <td className="p-4">
                    <span className={`font-bold ${low ? "text-blush" : ""}`}>
                      {p.stock}
                      {low && " ⚠️"}
                    </span>
                  </td>
                  <td className="p-4">
                    <span
                      className={`rounded-full px-2.5 py-0.5 text-xs font-bold uppercase ${
                        p.status === "active"
                          ? "bg-lavender-light text-lavender-deep"
                          : p.status === "draft"
                            ? "bg-silvermist/40 text-inksoft"
                            : "bg-blush-light text-blush"
                      }`}
                    >
                      {p.status}
                    </span>
                  </td>
                  <td className="p-4 text-xs">
                    {p.featured && "⭐ "}
                    {p.isNew && "✦ "}
                    {p.isBestseller && "🔥"}
                  </td>
                  <td className="p-4 text-right">
                    <div className="flex justify-end gap-2">
                      <Link
                        href={`/admin/products/${p.id}`}
                        className="rounded-full border border-silvermist px-3 py-1 text-xs font-bold uppercase hover:bg-ink hover:text-ivory"
                      >
                        Edit
                      </Link>
                      <DeleteProductButton id={p.id} name={p.name} />
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
