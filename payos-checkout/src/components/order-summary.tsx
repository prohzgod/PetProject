import { formatVND } from "@/lib/format";

type Line = { key: string; name: string; emoji?: string; quantity: number; total: number };

export function OrderSummary({
  lines,
  subtotal,
  shipping,
  total,
  children,
}: {
  lines: Line[];
  subtotal: number;
  shipping: number;
  total: number;
  children?: React.ReactNode;
}) {
  return (
    <div className="card space-y-4 p-5">
      <h2 className="font-semibold">Order summary</h2>
      <ul className="space-y-3">
        {lines.map((l) => (
          <li key={l.key} className="flex items-start justify-between gap-3 text-sm">
            <span className="flex gap-2">
              {l.emoji && <span aria-hidden>{l.emoji}</span>}
              <span>
                {l.name} <span className="text-muted">× {l.quantity}</span>
              </span>
            </span>
            <span className="whitespace-nowrap">{formatVND(l.total)}</span>
          </li>
        ))}
      </ul>
      <dl className="space-y-2 border-t border-border pt-4 text-sm">
        <div className="flex justify-between">
          <dt className="text-muted">Subtotal</dt>
          <dd>{formatVND(subtotal)}</dd>
        </div>
        <div className="flex justify-between">
          <dt className="text-muted">Shipping</dt>
          <dd>{shipping === 0 ? "Free" : formatVND(shipping)}</dd>
        </div>
        <div className="flex justify-between border-t border-border pt-3 text-base font-semibold">
          <dt>Total</dt>
          <dd>{formatVND(total)}</dd>
        </div>
      </dl>
      {children}
    </div>
  );
}
