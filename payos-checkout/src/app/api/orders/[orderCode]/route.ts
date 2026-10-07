import { NextResponse, type NextRequest } from "next/server";
import { syncOrder, toPublicOrder } from "@/lib/order-service";
import { parseOrderCode } from "@/lib/orders";

// GET /api/orders/:orderCode: current order status, re-checked against payOS.
export async function GET(_request: NextRequest, ctx: RouteContext<"/api/orders/[orderCode]">) {
  const orderCode = parseOrderCode((await ctx.params).orderCode);
  const order = orderCode ? await syncOrder(orderCode) : undefined;
  if (!order) {
    return NextResponse.json({ error: "Order not found" }, { status: 404 });
  }
  return NextResponse.json({ order: toPublicOrder(order) });
}
