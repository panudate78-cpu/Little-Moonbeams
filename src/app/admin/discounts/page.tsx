import { db } from "@/db";
import { discountCodes } from "@/db/schema";
import { desc } from "drizzle-orm";
import { formatPrice } from "@/lib/utils";
import { DiscountForm, DiscountRowActions } from "@/components/admin/admin-widgets";

export const dynamic = "force-dynamic";

export default async function AdminDiscountsPage() {
  const codes = await db.select().from(discountCodes).orderBy(desc(discountCodes.createdAt));

  return (
    <div>
      <h1 className="font-display text-3xl">Discount Codes</h1>
      <div className="mt-6 grid gap-6 xl:grid-cols-[400px_1fr]">
        <DiscountForm />
        <div className="card overflow-x-auto">
          <table className="w-full min-w-[560px] text-sm">
            <thead>
              <tr className="border-b border-silvermist/50 text-left text-xs tracking-wide text-inksoft uppercase">
                <th className="p-4">Code</th>
                <th className="p-4">Value</th>
                <th className="p-4">Min. spend</th>
                <th className="p-4">Used</th>
                <th className="p-4">Expires</th>
                <th className="p-4">Status</th>
                <th className="p-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {codes.map((c) => (
                <tr key={c.id} className="border-b border-silvermist/30">
                  <td className="p-4 font-bold">{c.code}</td>
                  <td className="p-4">{c.type === "percent" ? `${c.value}%` : formatPrice(c.value)}</td>
                  <td className="p-4">{c.minSubtotal > 0 ? formatPrice(c.minSubtotal) : "—"}</td>
                  <td className="p-4">
                    {c.usedCount}
                    {c.usageLimit !== null && ` / ${c.usageLimit}`}
                  </td>
                  <td className="p-4">
                    {c.expiresAt ? new Date(c.expiresAt).toLocaleDateString("en-GB") : "Never"}
                  </td>
                  <td className="p-4">
                    <span
                      className={`rounded-full px-2.5 py-0.5 text-xs font-bold uppercase ${
                        c.active ? "bg-lavender-light text-lavender-deep" : "bg-silvermist/40 text-inksoft"
                      }`}
                    >
                      {c.active ? "Active" : "Inactive"}
                    </span>
                  </td>
                  <td className="p-4">
                    <DiscountRowActions id={c.id} active={c.active} />
                  </td>
                </tr>
              ))}
              {codes.length === 0 && (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-inksoft">
                    No discount codes yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
