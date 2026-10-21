import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { db } from "@/db";
import { orders, orderItems } from "@/db/schema";
import { desc, eq, inArray, or } from "drizzle-orm";
import { getCurrentUser } from "@/lib/auth";
import { formatPrice } from "@/lib/utils";
import { LogoutButton } from "@/components/auth-forms";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "My Account" };

const STATUS_STYLES: Record<string, string> = {
  pending: "bg-silvermist/40 text-inksoft",
  paid: "bg-lavender-light text-lavender-deep",
  shipped: "bg-dustyblue-light text-dustyblue",
  delivered: "bg-lavender-light text-lavender-deep",
  cancelled: "bg-blush-light text-blush",
};

export default async function AccountPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login?next=/account");

  const myOrders = await db
    .select()
    .from(orders)
    .where(or(eq(orders.userId, user.id), eq(orders.email, user.email)))
    .orderBy(desc(orders.createdAt));

  const items =
    myOrders.length > 0
      ? await db
          .select()
          .from(orderItems)
          .where(inArray(orderItems.orderId, myOrders.map((o) => o.id)))
      : [];

  return (
    <div className="mx-auto max-w-4xl px-6 py-12">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="eyebrow">My account</p>
          <h1 className="section-title mt-1">Hello, {user.name.split(" ")[0]} ☾</h1>
          <p className="mt-1 text-sm text-inksoft">{user.email}</p>
        </div>
        <div className="flex gap-2">
          {user.role === "admin" && (
            <Link href="/admin" className="btn-gold !px-5 !py-2 text-xs">
              Admin dashboard
            </Link>
          )}
          <LogoutButton />
        </div>
      </div>

      <h2 className="mt-10 font-display text-2xl">Order history</h2>
      {myOrders.length === 0 ? (
        <div className="card mt-4 p-10 text-center">
          <p className="text-3xl">✦</p>
          <p className="mt-3 text-sm text-inksoft">No orders yet — your future treasures await.</p>
          <Link href="/shop" className="btn-gold mt-6">
            Shop now
          </Link>
        </div>
      ) : (
        <div className="mt-4 space-y-4">
          {myOrders.map((o) => (
            <div key={o.id} className="card p-5">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="font-bold">{o.orderNumber}</p>
                  <p className="text-xs text-inksoft">
                    {new Date(o.createdAt).toLocaleDateString("en-GB", {
                      day: "numeric",
                      month: "long",
                      year: "numeric",
                    })}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <span
                    className={`rounded-full px-3 py-1 text-xs font-bold uppercase ${STATUS_STYLES[o.status] ?? "bg-silvermist/40"}`}
                  >
                    {o.status}
                  </span>
                  <span className="font-bold">{formatPrice(o.total)}</span>
                </div>
              </div>
              <ul className="mt-3 border-t border-silvermist/40 pt-3 text-sm text-inksoft">
                {items
                  .filter((i) => i.orderId === o.id)
                  .map((i) => (
                    <li key={i.id}>
                      {i.quantity} × {i.name}
                    </li>
                  ))}
              </ul>
              {o.trackingNumber && (
                <p className="mt-2 text-xs font-semibold text-lavender-deep">
                  📦 Tracking: {o.trackingNumber}
                </p>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
