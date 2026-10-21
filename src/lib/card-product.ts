export interface CardProduct {
  id: number;
  slug: string;
  name: string;
  price: number;
  salePrice: number | null;
  image: string;
  stock: number;
  isNew: boolean;
  isBestseller: boolean;
  avgRating: number;
  reviewCount: number;
}

export function toCardProduct(p: {
  id: number;
  slug: string;
  name: string;
  price: number;
  salePrice: number | null;
  stock: number;
  isNew: boolean;
  isBestseller: boolean;
  avgRating: number;
  reviewCount: number;
  images: { url: string }[];
}): CardProduct {
  return {
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
  };
}
