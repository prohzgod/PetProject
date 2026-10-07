"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { cart } from "@/lib/cart-store";
import { formatDateTime, formatVND } from "@/lib/format";
import type { PublicOrder } from "@/lib/order-service";

const FINAL = new Set(["PAID", "CANCELLED", "EXPIRED", "FAILED"]);

export function OrderStatusView({ initialOrder }: { initialOrder: PublicOrder }) {
  const [order, setOrder] = useState(initialOrder);
  const [cancelling, setCancelling] = useState(false);
  const final = FINAL.has(order.status);
  const paid = order.status === "PAID";

  // Poll while waiting: the webhook may land a few seconds after the redirect.
  useEffect(() => {
    if (final) return;
    const timer = setInterval(async () => {
      try {
        const res = await fetch(`/api/orders/${order.orderCode}`, { cache: "no-store" });
        if (res.ok) setOrder((await res.json()).order);
      } catch {
        // offline for a moment: try again on the next tick
      }
    }, 3000);
    return () => clearInterval(timer);
  }, [final, order.orderCode]);

  useEffect(() => {
    if (paid) cart.clear();
  }, [paid]);

  async function cancel() {
    setCancelling(true);
    try {
      const res = await fetch(`/api/orders/${order.orderCode}/cancel`, { method: "POST" });
      if (res.ok) setOrder((await res.json()).order);
    } finally {
      setCancelling(false);
    }
  }

  const payHref = order.flow === "embedded" ? `/orders/${order.orderCode}/pay` : order.checkoutUrl;

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <StatusHeader order={order} />

      {!final && (
        <div className="card flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="text-sm">
            <p className="font-medium">Waiting for your bank transfer…</p>
            <p className="text-muted">
              This page updates automatically. <Countdown expiredAt={order.expiredAt} />
            </p>
          </div>
          <div className="flex gap-2">
            <a href={payHref} className="btn bg-payos text-white hover:opacity-90">
              Continue payment
            </a>
            <button type="button" className="btn-secondary" onClick={cancel} disabled={cancelling}>
              {cancelling ? "Cancelling…" : "Cancel order"}
            </button>
          </div>
        </div>
      )}

      <div className="grid gap-6 md:grid-cols-[1fr_280px]">
        <section className="card p-5">
          <h2 className="mb-4 font-semibold">Items</h2>
          <ul className="space-y-3 text-sm">
            {order.lines.map((l) => (
              <li key={l.productId} className="flex justify-between gap-3">
                <span>
                  {l.name} <span className="text-muted">× {l.quantity}</span>
                </span>
                <span>{formatVND(l.price * l.quantity)}</span>
              </li>
            ))}
            <li className="flex justify-between gap-3 text-muted">
              <span>Shipping</span>
              <span>{order.shipping === 0 ? "Free" : formatVND(order.shipping)}</span>
            </li>
          </ul>
          <div className="mt-4 flex justify-between border-t border-border pt-4 font-semibold">
            <span>Total</span>
            <span>{formatVND(order.amount)}</span>
          </div>
          {order.amountPaid > 0 && order.amountPaid !== order.amount && (
            <p className="mt-2 text-right text-sm text-amber-700">Paid so far: {formatVND(order.amountPaid)}</p>
          )}
        </section>

        <section className="card space-y-4 p-5 text-sm">
          <div>
            <h2 className="mb-1 font-semibold">Deliver to</h2>
            <p>{order.customer.name}</p>
            <p className="text-muted">{order.customer.phone}</p>
            <p className="text-muted">{order.customer.email}</p>
            <p className="text-muted">{order.customer.address}</p>
            {order.customer.note && <p className="mt-1 italic text-muted">“{order.customer.note}”</p>}
          </div>
        </section>
      </div>

      <section className="card p-5 text-sm">
        <h2 className="mb-3 font-semibold">Payment details</h2>
        <dl className="grid gap-x-6 gap-y-2 sm:grid-cols-2">
          <Detail label="Order code" value={<span className="font-mono">{order.orderCode}</span>} />
          <Detail label="Transfer description" value={<span className="font-mono">{order.description}</span>} />
          <Detail label="Placed" value={formatDateTime(order.createdAt)} />
          <Detail label="Checkout" value={order.flow === "embedded" ? "Embedded on site" : "payOS hosted page"} />
          <Detail label="payOS status" value={<span className="font-mono">{order.status}</span>} />
          <Detail
            label="Webhook received"
            value={order.webhookReceived ? "Yes ✓" : final && !paid ? "— (no payment)" : "Not yet"}
          />
          {order.transactions.map((t) => (
            <Detail
              key={t.reference}
              label="Bank reference"
              value={
                <span>
                  <span className="font-mono">{t.reference}</span>
                  <span className="block text-xs text-muted">
                    {formatVND(t.amount)} · {t.transactionDateTime}
                    {t.counterAccountBankName ? ` · ${t.counterAccountBankName}` : ""}
                  </span>
                </span>
              }
            />
          ))}
        </dl>
      </section>

      <div className="flex flex-wrap justify-center gap-3">
        {final && !paid && (
          <Link href="/checkout" className="btn-primary">
            Try again
          </Link>
        )}
        <Link href="/" className="btn-secondary">
          Continue shopping
        </Link>
      </div>
    </div>
  );
}

function StatusHeader({ order }: { order: PublicOrder }) {
  const view = {
    PAID: {
      icon: "✓",
      tone: "bg-emerald-100 text-emerald-700",
      title: `Thank you, ${order.customer.name}! Your order is confirmed.`,
      body: `We received ${formatVND(order.amountPaid)}${order.paidAt ? ` on ${order.paidAt}` : ""}. A confirmation will be sent to ${order.customer.email}.`,
    },
    CANCELLED: {
      icon: "✕",
      tone: "bg-stone-200 text-stone-600",
      title: "Payment cancelled",
      body: "No money was taken. Your cart is still saved if you want to try again.",
    },
    EXPIRED: {
      icon: "⌛",
      tone: "bg-stone-200 text-stone-600",
      title: "Payment link expired",
      body: "The QR code was not paid in time. Your cart is still saved.",
    },
    FAILED: {
      icon: "!",
      tone: "bg-red-100 text-red-700",
      title: "Payment failed",
      body: "Something went wrong with this payment. Please try again.",
    },
    UNDERPAID: {
      icon: "!",
      tone: "bg-amber-100 text-amber-700",
      title: "Partial payment received",
      body: `Please transfer the remaining ${formatVND(order.amount - order.amountPaid)} to complete the order.`,
    },
  }[order.status as string] ?? {
    icon: "…",
    tone: "bg-amber-100 text-amber-700",
    title: "Awaiting payment",
    body: `Order #${order.orderCode} is reserved. Complete the transfer of ${formatVND(order.amount)} to confirm it.`,
  };

  return (
    <div className="card flex flex-col items-center gap-3 p-8 text-center">
      <div className={`flex h-14 w-14 items-center justify-center rounded-full text-2xl font-bold ${view.tone}`} aria-hidden>
        {view.icon}
      </div>
      <h1 className="text-2xl font-bold tracking-tight">{view.title}</h1>
      <p className="max-w-lg text-sm text-muted">{view.body}</p>
    </div>
  );
}

function Detail({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex justify-between gap-4 border-b border-border/60 py-1.5 sm:block sm:border-0 sm:py-0">
      <dt className="text-muted">{label}</dt>
      <dd className="text-right sm:text-left">{value}</dd>
    </div>
  );
}

function Countdown({ expiredAt }: { expiredAt: number }) {
  const [left, setLeft] = useState<number | null>(null);
  useEffect(() => {
    const tick = () => setLeft(Math.max(0, expiredAt - Math.floor(Date.now() / 1000)));
    tick();
    const t = setInterval(tick, 1000);
    return () => clearInterval(t);
  }, [expiredAt]);
  if (left === null) return null;
  if (left === 0) return <>The payment link has expired.</>;
  const m = Math.floor(left / 60);
  const s = String(left % 60).padStart(2, "0");
  return (
    <>
      Link expires in <span className="font-mono tabular-nums">{m}:{s}</span>.
    </>
  );
}
