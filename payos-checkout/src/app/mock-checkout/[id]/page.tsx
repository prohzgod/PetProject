import type { Metadata } from "next";
import { connection } from "next/server";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { MockCheckoutPanel } from "@/components/mock-checkout-panel";
import { mockCheckoutData } from "@/lib/mock-checkout-data";
import { isMockMode } from "@/lib/payment-gateway";
import { formatVND } from "@/lib/format";

export const metadata: Metadata = { title: "payOS (simulated) — Thanh toán" };

// Simulated version of the payOS hosted checkout page (pay.payos.vn/web/...).
// Only reachable in mock mode; with real credentials shoppers go to payOS.
export default function MockCheckoutPage(props: PageProps<"/mock-checkout/[id]">) {
  return (
    <div className="min-h-full flex-1 bg-gradient-to-b from-[#efeefe] to-white">
      <header className="border-b border-payos/10 bg-white/70">
        <div className="mx-auto flex h-14 max-w-4xl items-center justify-between px-4">
          <span className="text-lg font-black tracking-tight text-payos">
            pay<span className="text-foreground">OS</span>
          </span>
          <span className="rounded-full bg-amber-100 px-2.5 py-1 text-xs font-medium text-amber-900">
            Simulator
          </span>
        </div>
      </header>
      <main className="mx-auto max-w-4xl px-4 py-10">
        <Suspense fallback={<div className="card h-96 animate-pulse" />}>
          <Checkout params={props.params} />
        </Suspense>
      </main>
    </div>
  );
}

async function Checkout({ params }: Pick<PageProps<"/mock-checkout/[id]">, "params">) {
  await connection(); // order/payment state is live data, never prerender it
  const { id } = await params;
  const data = isMockMode() ? mockCheckoutData(id) : undefined;
  if (!data) notFound();

  return (
    <div className="card space-y-6 p-6 shadow-xl shadow-payos/5 sm:p-8">
      <div className="flex flex-wrap items-end justify-between gap-2 border-b border-border pb-4">
        <div>
          <p className="text-sm text-muted">Paw &amp; Co. · Order #{data.orderCode}</p>
          <h1 className="text-xl font-bold">Scan to pay with VietQR</h1>
        </div>
        <p className="text-2xl font-bold text-payos">{formatVND(data.amount)}</p>
      </div>
      <MockCheckoutPanel data={data} />
    </div>
  );
}
