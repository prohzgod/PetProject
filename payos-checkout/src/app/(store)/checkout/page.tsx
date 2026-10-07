"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { OrderSummary } from "@/components/order-summary";
import { useCart } from "@/lib/cart-store";
import type { PublicOrder } from "@/lib/order-service";

type Flow = "redirect" | "embedded";
type FieldErrors = Partial<Record<"name" | "email" | "phone" | "address", string>>;

const FLOWS: { value: Flow; title: string; body: string }[] = [
  {
    value: "redirect",
    title: "payOS hosted checkout",
    body: "You are taken to pay.payos.vn to scan a VietQR code, then brought back here.",
  },
  {
    value: "embedded",
    title: "Pay on this page",
    body: "The payOS QR form is embedded right in our store, no redirect.",
  },
];

export default function CheckoutPage() {
  const router = useRouter();
  const { ready, lines, subtotal, shipping, total } = useCart();
  const [flow, setFlow] = useState<Flow>("redirect");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});

  // Coming back from payOS with the browser's back button restores this page
  // from the back/forward cache, so re-enable the button.
  useEffect(() => {
    const onPageShow = (e: PageTransitionEvent) => e.persisted && setSubmitting(false);
    window.addEventListener("pageshow", onPageShow);
    return () => window.removeEventListener("pageshow", onPageShow);
  }, []);

  if (!ready) return <div className="card h-96 animate-pulse" />;

  if (lines.length === 0) {
    return (
      <div className="card mx-auto max-w-md space-y-4 p-10 text-center">
        <h1 className="text-xl font-semibold">Nothing to check out</h1>
        <p className="text-sm text-muted">Your cart is empty.</p>
        <Link href="/" className="btn-primary">Back to the store</Link>
      </div>
    );
  }

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    setFieldErrors({});
    const form = new FormData(e.currentTarget);
    try {
      const res = await fetch("/api/orders", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          flow,
          items: lines.map((l) => ({ productId: l.productId, quantity: l.quantity })),
          customer: Object.fromEntries(form),
        }),
      });
      const json = (await res.json()) as { order?: PublicOrder; error?: string; detail?: string; fields?: FieldErrors };
      if (!res.ok || !json.order) {
        setFieldErrors(json.fields ?? {});
        setError([json.error, json.detail].filter(Boolean).join(": ") || "Something went wrong");
        setSubmitting(false);
        return;
      }
      if (flow === "embedded") {
        router.push(`/orders/${json.order.orderCode}/pay`);
        setSubmitting(false);
      } else {
        // Hand the shopper over to the payOS hosted checkout page.
        window.location.assign(json.order.checkoutUrl);
      }
    } catch {
      setError("Network error, please try again");
      setSubmitting(false);
    }
  }

  return (
    <form
      onSubmit={onSubmit}
      onInput={(e) => {
        const name = (e.target as HTMLInputElement).name as keyof FieldErrors;
        if (fieldErrors[name]) setFieldErrors({ ...fieldErrors, [name]: undefined });
      }}
      noValidate
      className="grid gap-8 lg:grid-cols-[1fr_380px]"
    >
      <div className="space-y-6">
        <h1 className="text-2xl font-bold tracking-tight">Checkout</h1>

        <fieldset className="card space-y-4 p-5">
          <legend className="sr-only">Contact and delivery</legend>
          <h2 className="font-semibold">Contact &amp; delivery</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Full name" name="name" autoComplete="name" placeholder="Nguyễn Văn A" error={fieldErrors.name} />
            <Field label="Phone" name="phone" type="tel" autoComplete="tel" placeholder="0901 234 567" error={fieldErrors.phone} />
            <Field
              label="Email"
              name="email"
              type="email"
              autoComplete="email"
              placeholder="you@example.com"
              error={fieldErrors.email}
              className="sm:col-span-2"
            />
            <Field
              label="Delivery address"
              name="address"
              autoComplete="street-address"
              placeholder="12 Lý Tự Trọng, Quận 1, TP. Hồ Chí Minh"
              error={fieldErrors.address}
              className="sm:col-span-2"
            />
            <label className="space-y-1.5 text-sm sm:col-span-2">
              <span className="font-medium">
                Order note <span className="font-normal text-muted">(optional)</span>
              </span>
              <textarea name="note" rows={2} className="input" placeholder="Leave at the front desk" />
            </label>
          </div>
        </fieldset>

        <fieldset className="card space-y-4 p-5">
          <legend className="sr-only">Payment</legend>
          <div className="flex items-center justify-between">
            <h2 className="font-semibold">Payment</h2>
            <span className="rounded-full bg-payos/10 px-2.5 py-1 text-xs font-semibold text-payos">
              payOS · VietQR
            </span>
          </div>
          <p className="text-sm text-muted">
            Pay by bank transfer with any Vietnamese banking app. Your order is
            confirmed the moment the transfer lands.
          </p>
          <div className="grid gap-3 sm:grid-cols-2">
            {FLOWS.map((f) => (
              <label
                key={f.value}
                className={`flex cursor-pointer gap-3 rounded-xl border p-4 transition ${
                  flow === f.value ? "border-payos bg-payos/5 ring-2 ring-payos/20" : "border-border hover:bg-stone-50"
                }`}
              >
                <input
                  type="radio"
                  name="flow"
                  value={f.value}
                  checked={flow === f.value}
                  onChange={() => setFlow(f.value)}
                  className="mt-1 accent-[var(--payos)]"
                />
                <span className="space-y-1">
                  <span className="block text-sm font-semibold">{f.title}</span>
                  <span className="block text-xs text-muted">{f.body}</span>
                </span>
              </label>
            ))}
          </div>
        </fieldset>
      </div>

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
          {error && (
            <p role="alert" className="rounded-xl bg-red-50 px-3 py-2 text-sm text-red-700">
              {error}
            </p>
          )}
          <button type="submit" className="btn w-full bg-payos text-white hover:opacity-90" disabled={submitting}>
            {submitting ? "Creating payment…" : "Place order & pay"}
          </button>
          <Link href="/cart" className="block text-center text-sm text-muted underline">
            Back to cart
          </Link>
        </OrderSummary>
      </aside>
    </form>
  );
}

function Field({
  label,
  error,
  className = "",
  ...input
}: React.InputHTMLAttributes<HTMLInputElement> & { label: string; error?: string; name: string }) {
  return (
    <label className={`space-y-1.5 text-sm ${className}`}>
      <span className="font-medium">{label}</span>
      <input
        {...input}
        required
        aria-invalid={!!error}
        className={`input ${error ? "border-red-400 focus:border-red-500 focus:ring-red-200" : ""}`}
      />
      {error && <span className="block text-xs text-red-600">{error}</span>}
    </label>
  );
}
