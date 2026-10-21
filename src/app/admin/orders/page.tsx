import { db } from "@/db";
import { orders, orderItems } from "@/db/schema";
import { desc, inArray } from "drizzle-orm";
import { formatPrice } from "@/lib/utils";
import { OrderActions } from "@/components/admin/admin-widgets";

export const dynamic = "force-dynamic";

export default async function AdminOrdersPage() {
  const rows = await db.select().from(orders).orderBy(desc(orders.createdAt));
  const items =
    rows.length > 0
      ? await db
          .select()
          .from(orderItems)
          .where(inArray(orderItems.orderId, rows.map((o) => o.id)))
      : [];

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="font-display text-3xl">Orders ({rows.length})</h1>
        <a href="/api/admin/orders/export" className="btn-outline !px-5 !py-2 text-xs">
          ⬇ Export CSV
        </a>
      </div>
      {rows.length === 0 ? (
        <div className="card mt-6 p-12 text-center text-inksoft">No orders yet. ☾</div>
      ) : (
        <div className="mt-6 space-y-4">
          {rows.map((o) => (
            <div key={o.id} className="card p-5">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <p className="font-bold">
                    {o.orderNumber}{" "}
                    <span className="ml-2 text-xs font-normal text-inksoft">
                      {new Date(o.createdAt).toLocaleString("en-GB")}
                    </span>
                  </p>
                  <p className="mt-1 text-sm">
                    {o.name} · {o.email} {o.phone && `· ${o.phone}`}
                  </p>
                  <p className="text-xs text-inksoft">
                    {o.address1}
                    {o.address2 && `, ${o.address2}`}, {o.city}, {o.postcode}, {o.country}
                  </p>
                  <ul className="mt-2 text-sm text-inksoft">
                    {items
                      .filter((i) => i.orderId === o.id)
                      .map((i) => (
                        <li key={i.id}>
                          {i.quantity} × {i.name} — {formatPrice(i.price * i.quantity)}
                        </li>
                      ))}
                  </ul>
                  <p className="mt-2 text-xs text-inksoft">
                    Subtotal {formatPrice(o.subtotal)}
                    {o.discount > 0 && ` · Discount −${formatPrice(o.discount)} (${o.discountCode})`} ·
                    Shipping {formatPrice(o.shipping)} · Payment: {o.paymentMethod}
                  </p>
                </div>
                <div className="flex flex-col items-end gap-3">
                  <span className="font-display text-2xl">{formatPrice(o.total)}</span>
                  <OrderActions id={o.id} status={o.status} trackingNumber={o.trackingNumber} />
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
