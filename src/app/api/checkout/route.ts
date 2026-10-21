import { db } from "@/db";
import {
  products,
  orders,
  orderItems,
  productImages,
  discountCodes,
  inventoryLogs,
} from "@/db/schema";
import { asc, eq, inArray, sql } from "drizzle-orm";
import { getCurrentUser } from "@/lib/auth";
import { sendOrderConfirmationEmail } from "@/lib/email";
import { calcShipping, effectivePrice, generateOrderNumber, includedTax } from "@/lib/utils";

interface CheckoutItem {
  id: number;
  qty: number;
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const items: CheckoutItem[] = Array.isArray(body.items) ? body.items : [];
    const { email, name, phone, address1, address2, city, postcode, country, paymentMethod, discountCode } = body;

    if (items.length === 0) {
      return Response.json({ error: "Your bag is empty." }, { status: 400 });
    }
    if (!email || !name || !address1 || !city || !postcode) {
      return Response.json({ error: "Please complete all required fields." }, { status: 400 });
    }

    const ids = items.map((i) => Number(i.id)).filter(Boolean);
    const dbProducts = await db.select().from(products).where(inArray(products.id, ids));
    const images = await db
      .select()
      .from(productImages)
      .where(inArray(productImages.productId, ids))
      .orderBy(asc(productImages.position));

    let subtotal = 0;
    const lineItems: { productId: number; name: string; price: number; quantity: number; image: string }[] = [];

    for (const item of items) {
      const product = dbProducts.find((p) => p.id === Number(item.id));
      const qty = Math.max(1, Math.floor(Number(item.qty) || 1));
      if (!product || product.status !== "active") {
        return Response.json({ error: "One of your items is no longer available." }, { status: 400 });
      }
      if (product.stock < qty) {
        return Response.json(
          { error: `Sorry — only ${product.stock} of "${product.name}" left in stock.` },
          { status: 400 }
        );
      }
      const price = effectivePrice(product);
      subtotal += price * qty;
      lineItems.push({
        productId: product.id,
        name: product.name,
        price,
        quantity: qty,
        image: images.find((i) => i.productId === product.id)?.url ?? "",
      });
    }

    // Discount
    let discount = 0;
    let appliedCode: string | null = null;
    if (discountCode) {
      const [dc] = await db
        .select()
        .from(discountCodes)
        .where(eq(discountCodes.code, String(discountCode).toUpperCase().trim()))
        .limit(1);
      const valid =
        dc &&
        dc.active &&
        (!dc.expiresAt || new Date(dc.expiresAt) >= new Date()) &&
        (dc.usageLimit === null || dc.usedCount < dc.usageLimit) &&
        subtotal >= dc.minSubtotal;
      if (valid) {
        discount =
          dc.type === "percent" ? Math.round((subtotal * dc.value) / 100) : Math.min(dc.value, subtotal);
        appliedCode = dc.code;
        await db
          .update(discountCodes)
          .set({ usedCount: sql`${discountCodes.usedCount} + 1` })
          .where(eq(discountCodes.id, dc.id));
      }
    }

    const afterDiscount = Math.max(0, subtotal - discount);
    const shipping = calcShipping(afterDiscount);
    const total = afterDiscount + shipping;
    const tax = includedTax(total);

    // Payment: Stripe-ready. When STRIPE_SECRET_KEY is configured, a PaymentIntent
    // is created; otherwise the payment step is simulated for this demo store.
    const stripeKey = process.env.STRIPE_SECRET_KEY;
    if (stripeKey) {
      try {
        await fetch("https://api.stripe.com/v1/payment_intents", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${stripeKey}`,
            "Content-Type": "application/x-www-form-urlencoded",
          },
          body: new URLSearchParams({
            amount: String(total),
            currency: "gbp",
            "automatic_payment_methods[enabled]": "true",
            description: `Little Moonbeam's order for ${email}`,
          }),
        });
      } catch (err) {
        console.error("[stripe] PaymentIntent creation failed", err);
      }
    }

    const user = await getCurrentUser();
    const orderNumber = generateOrderNumber();

    const [order] = await db
      .insert(orders)
      .values({
        orderNumber,
        userId: user?.id ?? null,
        email: String(email).toLowerCase().trim(),
        name: String(name),
        phone: String(phone ?? ""),
        address1: String(address1),
        address2: String(address2 ?? ""),
        city: String(city),
        postcode: String(postcode),
        country: String(country ?? "United Kingdom"),
        subtotal,
        discount,
        discountCode: appliedCode,
        shipping,
        tax,
        total,
        status: "paid",
        paymentMethod: String(paymentMethod ?? "card"),
      })
      .returning();

    await db.insert(orderItems).values(lineItems.map((li) => ({ ...li, orderId: order.id })));

    // Decrement stock + inventory logs
    for (const li of lineItems) {
      await db
        .update(products)
        .set({ stock: sql`${products.stock} - ${li.quantity}` })
        .where(eq(products.id, li.productId));
      await db.insert(inventoryLogs).values({
        productId: li.productId,
        change: -li.quantity,
        reason: `Order ${orderNumber}`,
      });
    }

    await sendOrderConfirmationEmail({
      orderNumber,
      email: order.email,
      name: order.name,
      total,
      items: lineItems,
    });

    return Response.json({ ok: true, orderNumber });
  } catch (err) {
    console.error("[checkout]", err);
    return Response.json({ error: "Checkout failed. Please try again." }, { status: 500 });
  }
}
