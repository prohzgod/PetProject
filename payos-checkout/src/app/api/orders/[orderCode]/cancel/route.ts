import { NextResponse, type NextRequest } from "next/server";
import { cancelOrder, toPublicOrder } from "@/lib/order-service";
import { parseOrderCode } from "@/lib/orders";

// POST /api/orders/:orderCode/cancel: cancel the payOS payment link.
export async function POST(_request: NextRequest, ctx: RouteContext<"/api/orders/[orderCode]/cancel">) {
  const orderCode = parseOrderCode((await ctx.params).orderCode);
  if (!orderCode) {
    return NextResponse.json({ error: "Order not found" }, { status: 404 });
  }
  try {
    const order = await cancelOrder(orderCode, "Customer cancelled the order");
    if (!order) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }
    return NextResponse.json({ order: toPublicOrder(order) });
  } catch (error) {
    console.error(`[orders] failed to cancel order ${orderCode}`, error);
    return NextResponse.json({ error: "Could not cancel the payment link" }, { status: 502 });
  }
}
