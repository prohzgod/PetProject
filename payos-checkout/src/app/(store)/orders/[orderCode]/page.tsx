import { connection } from "next/server";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { OrderStatusView } from "@/components/order-status-view";
import { cancelOrder, syncOrder, toPublicOrder } from "@/lib/order-service";
import { isFinal, parseOrderCode } from "@/lib/orders";

// payOS sends the shopper here after paying (returnUrl) or cancelling
// (cancelUrl, which adds ?cancelled=1). payOS also appends
// ?code=..&id=..&cancel=..&status=..&orderCode=.. but those values are
// unsigned, so the page asks payOS for the real status instead.
export default function OrderPage(props: PageProps<"/orders/[orderCode]">) {
  return (
    <Suspense fallback={<div className="card mx-auto h-96 max-w-3xl animate-pulse" />}>
      <OrderContent params={props.params} searchParams={props.searchParams} />
    </Suspense>
  );
}

async function OrderContent({ params, searchParams }: PageProps<"/orders/[orderCode]">) {
  await connection(); // order/payment state is live data, never prerender it
  const orderCode = parseOrderCode((await params).orderCode);
  if (!orderCode) notFound();

  let order = await syncOrder(orderCode);
  if (!order) notFound();

  // Shopper pressed "Cancel" on the payOS page: make sure the link is closed
  // so it can no longer be paid.
  if ((await searchParams).cancelled === "1" && !isFinal(order.status)) {
    try {
      order = (await cancelOrder(orderCode, "Customer cancelled on payOS")) ?? order;
    } catch (error) {
      console.error(`[orders] could not cancel order ${orderCode}`, error);
    }
  }

  return <OrderStatusView initialOrder={toPublicOrder(order)} />;
}
