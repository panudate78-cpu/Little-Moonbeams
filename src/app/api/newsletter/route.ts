import { db } from "@/db";
import { newsletterSubscribers } from "@/db/schema";

export async function POST(req: Request) {
  try {
    const { email } = await req.json();
    if (!email || !String(email).includes("@")) {
      return Response.json({ error: "A valid email is required." }, { status: 400 });
    }
    await db
      .insert(newsletterSubscribers)
      .values({ email: String(email).toLowerCase().trim() })
      .onConflictDoNothing();
    return Response.json({ ok: true });
  } catch {
    return Response.json({ error: "Could not subscribe." }, { status: 500 });
  }
}
