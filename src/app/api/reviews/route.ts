import { db } from "@/db";
import { reviews } from "@/db/schema";
import { getCurrentUser } from "@/lib/auth";

export async function POST(req: Request) {
  try {
    const { productId, name, rating, title, comment } = await req.json();
    const r = Number(rating);
    if (!productId || !name || !comment || !r || r < 1 || r > 5) {
      return Response.json({ error: "Invalid review." }, { status: 400 });
    }
    const user = await getCurrentUser();
    await db.insert(reviews).values({
      productId: Number(productId),
      userId: user?.id ?? null,
      name: String(name).slice(0, 120),
      rating: r,
      title: String(title ?? "").slice(0, 160),
      comment: String(comment),
    });
    return Response.json({ ok: true });
  } catch {
    return Response.json({ error: "Could not submit review." }, { status: 500 });
  }
}
