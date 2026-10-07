import { AddToCartButton } from "@/components/add-to-cart-button";
import { FREE_SHIPPING_THRESHOLD, PRODUCTS } from "@/lib/catalog";
import { formatVND } from "@/lib/format";

export default function StorePage() {
  return (
    <div className="space-y-10">
      <section className="card flex flex-col gap-6 overflow-hidden bg-gradient-to-br from-brand-soft to-surface p-8 sm:flex-row sm:items-center sm:justify-between">
        <div className="max-w-xl space-y-3">
          <p className="text-sm font-semibold uppercase tracking-wider text-brand-strong">
            Everything for happy pets
          </p>
          <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
            Treats, toys and comfy beds — pay in seconds with VietQR.
          </h1>
          <p className="text-muted">
            Checkout runs on payOS: scan the QR with any Vietnamese banking app and
            your order is confirmed automatically. Free shipping over{" "}
            {formatVND(FREE_SHIPPING_THRESHOLD)}.
          </p>
        </div>
        <div aria-hidden className="text-8xl sm:text-9xl">🐶</div>
      </section>

      <section>
        <h2 className="mb-4 text-xl font-semibold">Shop the collection</h2>
        <ul className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {PRODUCTS.map((p) => (
            <li key={p.id} className="card flex flex-col overflow-hidden">
              <div className={`flex aspect-[4/3] items-center justify-center text-6xl ${p.tint}`} aria-hidden>
                {p.emoji}
              </div>
              <div className="flex flex-1 flex-col gap-2 p-4">
                <span className="text-xs font-medium uppercase tracking-wide text-muted">{p.category}</span>
                <h3 className="font-semibold leading-snug">{p.name}</h3>
                <p className="flex-1 text-sm text-muted">{p.description}</p>
                <div className="mt-2 flex items-center justify-between gap-2">
                  <span className="font-semibold">{formatVND(p.price)}</span>
                  <AddToCartButton productId={p.id} />
                </div>
              </div>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
