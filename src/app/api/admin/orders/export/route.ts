import { db } from "@/db";
import { orders } from "@/db/schema";
import { desc } from "drizzle-orm";
import { requireAdmin } from "@/lib/auth";

function csvCell(value: unknown): string {
  const s = String(value ?? "");
  return `"${s.replace(/"/g, '""')}"`;
}

export async function GET() {
  const admin = await requireAdmin();
  if (!admin) return new Response("Unauthorized", { status: 401 });
  const rows = await db.select().from(orders).orderBy(desc(orders.createdAt));
  const header = [
    "Order Number",
    "Date",
    "Customer",
    "Email",
    "Address",
    "City",
    "Postcode",
    "Country",
    "Subtotal",
    "Discount",
    "Shipping",
    "Total",
    "Status",
    "Payment Method",
    "Tracking",
  ].join(",");
  const lines = rows.map((o) =>
    [
      csvCell(o.orderNumber),
      csvCell(new Date(o.createdAt).toISOString()),
      csvCell(o.name),
      csvCell(o.email),
      csvCell(`${o.address1} ${o.address2}`.trim()),
      csvCell(o.city),
      csvCell(o.postcode),
      csvCell(o.country),
      csvCell((o.subtotal / 100).toFixed(2)),
      csvCell((o.discount / 100).toFixed(2)),
      csvCell((o.shipping / 100).toFixed(2)),
      csvCell((o.total / 100).toFixed(2)),
      csvCell(o.status),
      csvCell(o.paymentMethod),
      csvCell(o.trackingNumber),
    ].join(",")
  );
  return new Response([header, ...lines].join("\n"), {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="little-moonbeams-orders-${Date.now()}.csv"`,
    },
  });
}
