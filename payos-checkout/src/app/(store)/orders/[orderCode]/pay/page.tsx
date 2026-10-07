import Link from "next/link";
import { connection } from "next/server";
import { notFound, redirect } from "next/navigation";
import { Suspense } from "react";
import { MockCheckoutPanel } from "@/components/mock-checkout-panel";
import { PayOSEmbedded } from "@/components/payos-embedded";
import { formatVND } from "@/lib/format";
import { mockCheckoutData } from "@/lib/mock-checkout-data";
import { syncOrder } from "@/lib/order-service";
import { isFinal, parseOrderCode } from "@/lib/orders";
import { isMockMode } from "@/lib/payment-gateway";

// Embedded checkout: the payOS form is shown inside the store instead of
// redirecting to pay.payos.vn.
export default function PayPage(props: PageProps<"/orders/[orderCode]/pay">) {
  return (
    <Suspense fallback={<div className="card mx-auto h-[480px] max-w-3xl animate-pulse" />}>
      <EmbeddedPayment params={props.params} />
    </Suspense>
  );
}

async function EmbeddedPayment({ params }: Pick<PageProps<"/orders/[orderCode]/pay">, "params">) {
  await connection(); // order/payment state is live data, never prerender it
  const orderCode = parseOrderCode((await params).orderCode);
  const order = orderCode ? await syncOrder(orderCode) : undefined;
  if (!order) notFound();
  if (isFinal(order.status)) redirect(`/orders/${order.orderCode}`);

  const mock = isMockMode() ? mockCheckoutData(order.paymentLinkId) : undefined;

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div>
          <p className="text-sm text-muted">Order #{order.orderCode}</p>
          <h1 className="text-2xl font-bold tracking-tight">Complete your payment</h1>
        </div>
        <p className="text-2xl font-bold text-payos">{formatVND(order.amount)}</p>
      </div>
      <div className="card p-5 sm:p-6">
        {mock ? (
          <MockCheckoutPanel data={mock} compact />
        ) : (
          <PayOSEmbedded orderCode={order.orderCode} checkoutUrl={order.checkoutUrl} />
        )}
      </div>
      <p className="text-center text-sm text-muted">
        Paid already? Your order updates automatically —{" "}
        <Link href={`/orders/${order.orderCode}`} className="underline">
          view order status
        </Link>
        .
      </p>
    </div>
  );
}
