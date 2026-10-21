import { db } from "@/db";
import { users } from "@/db/schema";
import { eq } from "drizzle-orm";
import { createSession, hashPassword } from "@/lib/auth";

export async function POST(req: Request) {
  try {
    const { name, email, password } = await req.json();
    if (!name || !email || !password || String(password).length < 8) {
      return Response.json(
        { error: "Please provide your name, email and a password of at least 8 characters." },
        { status: 400 }
      );
    }
    const normalized = String(email).toLowerCase().trim();
    const existing = await db.select().from(users).where(eq(users.email, normalized)).limit(1);
    if (existing.length > 0) {
      return Response.json({ error: "An account with this email already exists." }, { status: 409 });
    }
    const [user] = await db
      .insert(users)
      .values({ name: String(name).trim(), email: normalized, passwordHash: hashPassword(password) })
      .returning();
    await createSession(user.id);
    return Response.json({ ok: true, role: user.role });
  } catch {
    return Response.json({ error: "Could not create account." }, { status: 500 });
  }
}
