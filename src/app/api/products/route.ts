import { getProductsByIds } from "@/lib/catalog";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const ids = (url.searchParams.get("ids") ?? "")
    .split(",")
    .map((s) => Number(s))
    .filter((n) => Number.isFinite(n) && n > 0);
  const products = await getProductsByIds(ids);
  return Response.json({
    products: products.map((p) => ({
      id: p.id,
      slug: p.slug,
      name: p.name,
      price: p.price,
      salePrice: p.salePrice,
      image: p.images[0]?.url ?? "",
      stock: p.stock,
      isNew: p.isNew,
      isBestseller: p.isBestseller,
      avgRating: p.avgRating,
      reviewCount: p.reviewCount,
    })),
  });
}
