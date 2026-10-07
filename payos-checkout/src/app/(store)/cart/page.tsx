"use client";

import Link from "next/link";
import { OrderSummary } from "@/components/order-summary";
import { cart, useCart } from "@/lib/cart-store";
import { FREE_SHIPPING_THRESHOLD } from "@/lib/catalog";
import { formatVND } from "@/lib/format";

export default function CartPage() {
  const { ready, lines, subtotal, shipping, total } = useCart();

  if (!ready) return <div className="card h-64 animate-pulse" />;

  if (lines.length === 0) {
    return (
      <div className="card mx-auto max-w-md space-y-4 p-10 text-center">
        <div aria-hidden className="text-5xl">🛒</div>
        <h1 className="text-xl font-semibold">Your cart is empty</h1>
        <p className="text-sm text-muted">Find something your pet will love.</p>
        <Link href="/" className="btn-primary">Continue shopping</Link>
      </div>
    );
  }

  return (
    <div className="grid gap-8 lg:grid-cols-[1fr_360px]">
      <section className="space-y-4">
        <h1 className="text-2xl font-bold tracking-tight">Your cart</h1>
        <ul className="card divide-y divide-border">
          {lines.map(({ product, quantity, lineTotal }) => (
            <li key={product.id} className="flex flex-wrap items-center gap-4 p-4">
              <div className={`flex h-16 w-16 items-center justify-center rounded-xl text-3xl ${product.tint}`} aria-hidden>
                {product.emoji}
              </div>
              <div className="min-w-40 flex-1">
                <p className="font-medium">{product.name}</p>
                <p className="text-sm text-muted">{formatVND(product.price)}</p>
              </div>
              <div className="flex items-center rounded-xl border border-border">
                <button
                  type="button"
                  aria-label={`Decrease ${product.name}`}
                  className="px-3 py-1.5 text-lg"
                  onClick={() => cart.setQuantity(product.id, quantity - 1)}
                >
                  −
                </button>
                <span className="w-8 text-center text-sm tabular-nums">{quantity}</span>
                <button
                  type="button"
                  aria-label={`Increase ${product.name}`}
                  className="px-3 py-1.5 text-lg"
                  onClick={() => cart.setQuantity(product.id, quantity + 1)}
                >
                  +
                </button>
              </div>
              <p className="w-28 text-right font-medium">{formatVND(lineTotal)}</p>
              <button
                type="button"
                className="text-sm text-muted underline hover:text-foreground"
                onClick={() => cart.remove(product.id)}
              >
                Remove
              </button>
            </li>
          ))}
        </ul>
        {shipping > 0 && (
          <p className="text-sm text-muted">
            Add {formatVND(FREE_SHIPPING_THRESHOLD - subtotal)} more for free shipping.
          </p>
        )}
      </section>

      <aside className="lg:pt-12">
        <OrderSummary
          lines={lines.map((l) => ({
            key: l.productId,
            name: l.product.name,
            emoji: l.product.emoji,
            quantity: l.quantity,
            total: l.lineTotal,
          }))}
          subtotal={subtotal}
          shipping={shipping}
          total={total}
        >
          <Link href="/checkout" className="btn-primary w-full">Proceed to checkout</Link>
          <Link href="/" className="btn-secondary w-full">Continue shopping</Link>
        </OrderSummary>
      </aside>
    </div>
  );
}
