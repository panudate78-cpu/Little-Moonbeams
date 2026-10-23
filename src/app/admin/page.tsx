import { MaintenanceToggle } from "@/components/admin/maintenance-toggle";
import { siteSettings } from "@/db/schema";
import Link from "next/link";
import { db } from "@/db";
import {
  orders,
  orderItems,
  users,
  products,
  newsletterSubscribers,
  contactMessages,
} from "@/db/schema";
import { and, desc, eq, gte, ne, sql } from "drizzle-orm";
import { formatPrice } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function AdminDashboard() {
  const since = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000);

  const [revenueRow, orderCountRow, customerCountRow, subsRow, msgRow, lowStock, recentOrders, daily, topProducts, settings] =
    await Promise.all([
      db
        .select({ total: sql<number>`coalesce(sum(${orders.total}), 0)` })
        .from(orders)
        .where(ne(orders.status, "cancelled")),
      db.select({ count: sql<number>`count(*)` }).from(orders),
      db.select({ count: sql<number>`count(*)` }).from(users).where(eq(users.role, "customer")),
      db.select({ count: sql<number>`count(*)` }).from(newsletterSubscribers),
      db.select({ count: sql<number>`count(*)` }).from(contactMessages),
      db
        .select()
        .from(products)
        .where(and(eq(products.status, "active"), sql`${products.stock} <= ${products.lowStockThreshold}`))
        .orderBy(products.stock)
        .limit(8),
      db.select().from(orders).orderBy(desc(orders.createdAt)).limit(8),
      db
        .select({
          day: sql<string>`to_char(${orders.createdAt}, 'YYYY-MM-DD')`,
          total: sql<number>`coalesce(sum(${orders.total}), 0)`,
          count: sql<number>`count(*)`,
        })
        .from(orders)
        .where(and(gte(orders.createdAt, since), ne(orders.status, "cancelled")))
        .groupBy(sql`to_char(${orders.createdAt}, 'YYYY-MM-DD')`)
        .orderBy(sql`to_char(${orders.createdAt}, 'YYYY-MM-DD')`),
      db
        .select({
          name: orderItems.name,
          qty: sql<number>`sum(${orderItems.quantity})`,
          revenue: sql<number>`sum(${orderItems.quantity} * ${orderItems.price})`,
        })
        .from(orderItems)
        .groupBy(orderItems.name)
        .orderBy(desc(sql`sum(${orderItems.quantity})`))
        .limit(5),
        db.select().from(siteSettings).limit(1),
    ]);
  const maintenanceMode = settings[0]?.maintenanceMode ?? false;
  const revenue = Number(revenueRow[0]?.total ?? 0);
  const orderCount = Number(orderCountRow[0]?.count ?? 0);
  const customerCount = Number(customerCountRow[0]?.count ?? 0);
  const aov = orderCount > 0 ? Math.round(revenue / orderCount) : 0;
  const maxDaily = Math.max(1, ...daily.map((d) => Number(d.total)));

  const stats = [
    { label: "Total revenue", value: formatPrice(revenue), icon: "💰" },
    { label: "Orders", value: String(orderCount), icon: "📦" },
    { label: "Customers", value: String(customerCount), icon: "👥" },
    { label: "Avg. order value", value: formatPrice(aov), icon: "✨" },
    { label: "Newsletter subscribers", value: String(Number(subsRow[0]?.count ?? 0)), icon: "✉️" },
    { label: "Messages & enquiries", value: String(Number(msgRow[0]?.count ?? 0)), icon: "💬" },
  ];

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="font-display text-3xl">Dashboard</h1>
        <div className="flex gap-2">
          <Link href="/admin/products/new" className="btn-gold !px-5 !py-2 text-xs">
            + Add product
          </Link>
          <a href="/api/admin/orders/export" className="btn-outline !px-5 !py-2 text-xs">
            ⬇ Export orders CSV
          </a>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-3 xl:grid-cols-6">
        {stats.map((s) => (
          <div key={s.label} className="card p-4">
            <p className="text-xl">{s.icon}</p>
            <p className="mt-2 font-display text-xl">{s.value}</p>
            <p className="text-xs font-bold tracking-wide text-inksoft uppercase">{s.label}</p>
          </div>
        ))}
      </div>

      <div className="card p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="font-display text-xl">Store Settings</h2>
            <p className="mt-1 text-sm text-inksoft">
              Maintenance mode closes every public page. Admins keep access to{" "}
              <code className="rounded bg-cream px-1">/admin</code>,{" "}
              <code className="rounded bg-cream px-1">/api/*</code> and{" "}
              <code className="rounded bg-cream px-1">/maintenance</code>.
            </p>
          </div>

          <span
            className={`rounded-full px-3 py-1 text-xs font-bold ${
              maintenanceMode
                ? "bg-red-100 text-red-700"
                : "bg-green-100 text-green-700"
            }`}
          >
            Maintenance {maintenanceMode ? "ON" : "OFF"}
          </span>
        </div>

        <MaintenanceToggle enabled={maintenanceMode} />
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        {/* Sales chart */}
        <div className="card p-6">
          <h2 className="font-display text-xl">Revenue — last 14 days</h2>
          {daily.length === 0 ? (
            <p className="mt-6 text-sm text-inksoft">No sales in this period yet. ☾</p>
          ) : (
            <div className="mt-6 flex h-40 items-end gap-1.5">
              {daily.map((d) => (
                <div key={d.day} className="group flex flex-1 flex-col items-center gap-1">
                  <span className="text-[0.6rem] text-inksoft opacity-0 transition group-hover:opacity-100">
                    {formatPrice(Number(d.total))}
                  </span>
                  <div
                    className="w-full rounded-t-md bg-gradient-to-t from-lavender to-dustyblue"
                    style={{ height: `${Math.max(6, (Number(d.total) / maxDaily) * 100)}%` }}
                  />
                  <span className="text-[0.6rem] text-inksoft">{d.day.slice(8)}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Top products */}
        <div className="card p-6">
          <h2 className="font-display text-xl">Best selling products</h2>
          {topProducts.length === 0 ? (
            <p className="mt-6 text-sm text-inksoft">No sales data yet.</p>
          ) : (
            <table className="mt-4 w-full text-sm">
              <thead>
                <tr className="border-b border-silvermist/50 text-left text-xs tracking-wide text-inksoft uppercase">
                  <th className="py-2">Product</th>
                  <th className="py-2 text-right">Sold</th>
                  <th className="py-2 text-right">Revenue</th>
                </tr>
              </thead>
              <tbody>
                {topProducts.map((p) => (
                  <tr key={p.name} className="border-b border-silvermist/30">
                    <td className="py-2">{p.name}</td>
                    <td className="py-2 text-right font-semibold">{Number(p.qty)}</td>
                    <td className="py-2 text-right">{formatPrice(Number(p.revenue))}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        {/* Low stock */}
        <div className="card p-6">
          <h2 className="font-display text-xl">⚠️ Low stock alerts</h2>
          {lowStock.length === 0 ? (
            <p className="mt-4 text-sm text-inksoft">All stocked up — nothing running low. ✦</p>
          ) : (
            <ul className="mt-4 space-y-2">
              {lowStock.map((p) => (
                <li
                  key={p.id}
                  className="flex items-center justify-between rounded-xl bg-blush-light px-4 py-2.5 text-sm"
                >
                  <Link href={`/admin/products/${p.id}`} className="font-semibold hover:underline">
                    {p.name}
                  </Link>
                  <span className="font-bold text-blush">
                    {p.stock === 0 ? "Out of stock" : `${p.stock} left`}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Recent orders */}
        <div className="card p-6">
          <div className="flex items-center justify-between">
            <h2 className="font-display text-xl">Recent orders</h2>
            <Link href="/admin/orders" className="text-xs font-bold text-lavender-deep uppercase hover:underline">
              View all →
            </Link>
          </div>
          {recentOrders.length === 0 ? (
            <p className="mt-4 text-sm text-inksoft">No orders yet.</p>
          ) : (
            <ul className="mt-4 space-y-2">
              {recentOrders.map((o) => (
                <li key={o.id} className="flex items-center justify-between rounded-xl bg-cream px-4 py-2.5 text-sm">
                  <span>
                    <span className="font-semibold">{o.orderNumber}</span>
                    <span className="ml-2 text-inksoft">{o.name}</span>
                  </span>
                  <span className="flex items-center gap-3">
                    <span className="rounded-full bg-lavender-light px-2.5 py-0.5 text-xs font-bold text-lavender-deep uppercase">
                      {o.status}
                    </span>
                    <span className="font-bold">{formatPrice(o.total)}</span>
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
