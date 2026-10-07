import type { Webhook } from "@payos/node";
import { NextResponse, type NextRequest } from "next/server";
import { applyPaymentWebhook } from "@/lib/order-service";
import { getGateway } from "@/lib/payment-gateway";

// POST /api/webhooks/payos: payOS calls this when a payment link receives money.
// Register it once with `npm run payos:confirm-webhook -- <public url>`.
export async function POST(request: NextRequest) {
  let body: Webhook;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  let data;
  try {
    // HMAC-SHA256 of the sorted `data` fields with the checksum key.
    data = await getGateway().verifyWebhook(body);
  } catch (error) {
    console.warn("[webhook] rejected payOS webhook", error);
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  const order = applyPaymentWebhook(data);
  if (!order) {
    // payOS sends a sample payload when the webhook URL is confirmed; it must
    // still get a 2xx, so unknown orders are acknowledged and ignored.
    console.info(`[webhook] no order for orderCode ${data.orderCode}, ignoring`);
  } else {
    console.info(`[webhook] order ${order.orderCode} is now ${order.status}`);
  }
  return NextResponse.json({ success: true });
}
