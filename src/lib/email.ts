import "server-only";

interface OrderEmailItem {
  name: string;
  quantity: number;
  price: number;
}

interface OrderEmailData {
  orderNumber: string;
  email: string;
  name: string;
  total: number;
  items: OrderEmailItem[];
}

/**
 * Sends an order confirmation email. If RESEND_API_KEY is configured it is
 * delivered via Resend, otherwise it is logged (useful for development).
 */
export async function sendOrderConfirmationEmail(data: OrderEmailData): Promise<void> {
  const lines = data.items
    .map((i) => `<li>${i.quantity} × ${i.name} — £${((i.price * i.quantity) / 100).toFixed(2)}</li>`)
    .join("");
  const html = `
    <div style="font-family: Georgia, serif; color: #3C3A4A; max-width: 560px; margin: 0 auto;">
      <h1 style="font-weight: 500;">☾ Little Moonbeam's</h1>
      <p>Dear ${data.name},</p>
      <p>Thank you for your order! Your handmade treasures are being lovingly prepared.</p>
      <p><strong>Order number:</strong> ${data.orderNumber}</p>
      <ul>${lines}</ul>
      <p><strong>Total: £${(data.total / 100).toFixed(2)}</strong></p>
      <p>With moonlight and sparkle,<br/>Little Moonbeam's ✦</p>
    </div>`;

  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    console.log(`[email] Order confirmation for ${data.email} (${data.orderNumber}) — email provider not configured, logged instead.`);
    return;
  }
  try {
    await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: process.env.EMAIL_FROM ?? "Little Moonbeam's <orders@littlemoonbeams.co.uk>",
        to: data.email,
        subject: `Your Little Moonbeam's order ${data.orderNumber} ✦`,
        html,
      }),
    });
  } catch (err) {
    console.error("[email] Failed to send confirmation", err);
  }
}
