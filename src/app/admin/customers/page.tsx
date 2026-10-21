import { db } from "@/db";
import { users, orders } from "@/db/schema";
import { desc, eq, sql } from "drizzle-orm";
import { formatPrice } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function AdminCustomersPage() {
  const rows = await db
    .select({
      id: users.id,
      name: users.name,
      email: users.email,
      role: users.role,
      createdAt: users.createdAt,
      orderCount: sql<number>`count(${orders.id})`,
      totalSpent: sql<number>`coalesce(sum(${orders.total}), 0)`,
    })
    .from(users)
    .leftJoin(orders, eq(orders.userId, users.id))
    .groupBy(users.id)
    .orderBy(desc(users.createdAt));

  // Guest customers (orders without accounts)
  const guests = await db
    .select({
      email: orders.email,
      name: sql<string>`max(${orders.name})`,
      orderCount: sql<number>`count(*)`,
      totalSpent: sql<number>`coalesce(sum(${orders.total}), 0)`,
    })
    .from(orders)
    .where(sql`${orders.userId} is null`)
    .groupBy(orders.email);

  return (
    <div>
      <h1 className="font-display text-3xl">Customers</h1>
      <div className="card mt-6 overflow-x-auto">
        <table className="w-full min-w-[640px] text-sm">
          <thead>
            <tr className="border-b border-silvermist/50 text-left text-xs tracking-wide text-inksoft uppercase">
              <th className="p-4">Customer</th>
              <th className="p-4">Email</th>
              <th className="p-4">Type</th>
              <th className="p-4 text-right">Orders</th>
              <th className="p-4 text-right">Total spent</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((c) => (
              <tr key={`u-${c.id}`} className="border-b border-silvermist/30">
                <td className="p-4 font-semibold">{c.name}</td>
                <td className="p-4">{c.email}</td>
                <td className="p-4">
                  <span
                    className={`rounded-full px-2.5 py-0.5 text-xs font-bold uppercase ${
                      c.role === "admin"
                        ? "bg-gold/20 text-gold-dark"
                        : "bg-lavender-light text-lavender-deep"
                    }`}
                  >
                    {c.role === "admin" ? "Admin" : "Account"}
                  </span>
                </td>
                <td className="p-4 text-right">{Number(c.orderCount)}</td>
                <td className="p-4 text-right font-semibold">{formatPrice(Number(c.totalSpent))}</td>
              </tr>
            ))}
            {guests.map((g) => (
              <tr key={`g-${g.email}`} className="border-b border-silvermist/30">
                <td className="p-4 font-semibold">{g.name}</td>
                <td className="p-4">{g.email}</td>
                <td className="p-4">
                  <span className="rounded-full bg-silvermist/40 px-2.5 py-0.5 text-xs font-bold text-inksoft uppercase">
                    Guest
                  </span>
                </td>
                <td className="p-4 text-right">{Number(g.orderCount)}</td>
                <td className="p-4 text-right font-semibold">{formatPrice(Number(g.totalSpent))}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
