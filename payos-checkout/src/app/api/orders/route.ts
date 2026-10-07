import { APIError } from "@payos/node";
import { NextResponse, type NextRequest } from "next/server";
import { CheckoutError, placeOrder, toPublicOrder } from "@/lib/order-service";
import { appOrigin } from "@/lib/origin";
import type { PaymentFlow } from "@/lib/orders";

type Body = {
  items?: { productId?: unknown; quantity?: unknown }[];
  customer?: Record<string, unknown>;
  flow?: unknown;
};

function text(value: unknown, max: number): string {
  return typeof value === "string" ? value.trim().slice(0, max) : "";
}

// POST /api/orders: price the cart on the server and create a payOS payment link.
export async function POST(request: NextRequest) {
  let body: Body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const customer = {
    name: text(body.customer?.name, 80),
    email: text(body.customer?.email, 120),
    phone: text(body.customer?.phone, 20),
    address: text(body.customer?.address, 200),
    note: text(body.customer?.note, 300) || undefined,
  };
  const errors: Record<string, string> = {};
  if (!customer.name) errors.name = "Please enter your name";
  if (!/^\S+@\S+\.\S+$/.test(customer.email)) errors.email = "Please enter a valid email";
  if (!/^[0-9+\s]{9,15}$/.test(customer.phone)) errors.phone = "Please enter a valid phone number";
  if (!customer.address) errors.address = "Please enter a delivery address";
  if (Object.keys(errors).length > 0) {
    return NextResponse.json({ error: "Please check your details", fields: errors }, { status: 422 });
  }

  const flow: PaymentFlow = body.flow === "embedded" ? "embedded" : "redirect";
  const items = (Array.isArray(body.items) ? body.items : []).map((i) => ({
    productId: String(i.productId ?? ""),
    quantity: Number(i.quantity),
  }));

  try {
    const order = await placeOrder({ items, customer, flow }, appOrigin(request));
    return NextResponse.json({ order: toPublicOrder(order) }, { status: 201 });
  } catch (error) {
    if (error instanceof CheckoutError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    console.error("[checkout] failed to create payment link", error);
    const detail = error instanceof APIError ? error.desc ?? error.message : undefined;
    return NextResponse.json(
      { error: "Could not create the payOS payment link", detail },
      { status: 502 },
    );
  }
}
