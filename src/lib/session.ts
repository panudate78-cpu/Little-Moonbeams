import { db } from "@/db";
import { sessions, users, type User } from "@/db/schema";
import { and, eq, gt } from "drizzle-orm";

/**
 * Name of the session cookie. Kept in its own module (no `next/headers`
 * import) so it can also be imported by `src/proxy.ts`, which only has
 * access to `request.cookies`.
 */
export const SESSION_COOKIE = "lm_session";

/**
 * Looks up the user that owns a session token.
 * Returns null for unknown / expired tokens.
 */
export async function findUserBySessionToken(
  token: string | undefined | null,
): Promise<User | null> {
  if (!token) return null;

  const rows = await db
    .select({ user: users })
    .from(sessions)
    .innerJoin(users, eq(sessions.userId, users.id))
    .where(and(eq(sessions.token, token), gt(sessions.expiresAt, new Date())))
    .limit(1);

  return rows[0]?.user ?? null;
}
