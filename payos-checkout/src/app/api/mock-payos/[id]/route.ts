import { NextResponse, type NextRequest } from "next/server";
import {
  isMockMode,
  simulateMockCancel,
  simulateMockPayment,
} from "@/lib/payment-gateway";

// POST /api/mock-payos/:id  { action: "pay" | "cancel" }
// Only used by the simulated payOS checkout page when no credentials are set.
export async function POST(request: NextRequest, ctx: RouteContext<"/api/mock-payos/[id]">) {
  if (!isMockMode()) {
    return NextResponse.json({ error: "Mock payOS is disabled" }, { status: 404 });
  }
  const { id } = await ctx.params;
  const { action } = (await request.json().catch(() => ({}))) as { action?: string };

  try {
    const redirectUrl =
      action === "pay"
        ? await simulateMockPayment(id, `${request.nextUrl.origin}/api/webhooks/payos`)
        : simulateMockCancel(id);
    // The mock always redirects back into this app, so keep the shopper on
    // the origin they are browsing.
    const target = new URL(redirectUrl);
    return NextResponse.json({ redirectUrl: `${target.pathname}${target.search}` });
  } catch {
    return NextResponse.json({ error: "Payment link not found" }, { status: 404 });
  }
}
