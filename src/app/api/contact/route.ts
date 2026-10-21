import { db } from "@/db";
import { contactMessages } from "@/db/schema";

export async function POST(req: Request) {
  try {
    const { name, email, subject, message, type } = await req.json();
    if (!name || !email || !message) {
      return Response.json({ error: "Name, email and message are required." }, { status: 400 });
    }
    await db.insert(contactMessages).values({
      name: String(name).slice(0, 120),
      email: String(email).slice(0, 255),
      subject: String(subject ?? "").slice(0, 200),
      message: String(message),
      type: type === "custom-order" ? "custom-order" : "contact",
    });
    return Response.json({ ok: true });
  } catch {
    return Response.json({ error: "Could not send message." }, { status: 500 });
  }
}
