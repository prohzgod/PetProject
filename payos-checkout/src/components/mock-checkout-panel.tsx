"use client";

import { QRCodeSVG } from "qrcode.react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { formatVND } from "@/lib/format";

export type MockCheckoutData = {
  id: string;
  orderCode: number;
  amount: number;
  description: string;
  qrCode: string;
  expiredAt: number;
  status: string;
  bankName: string;
  accountNumber: string;
  accountName: string;
};

/**
 * Stand-in for the payOS checkout form (QR + bank details). Used on the
 * simulated hosted page and in the embedded flow when running in mock mode.
 */
export function MockCheckoutPanel({ data, compact = false }: { data: MockCheckoutData; compact?: boolean }) {
  const router = useRouter();
  const [busy, setBusy] = useState<"pay" | "cancel" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [left, setLeft] = useState<number | null>(null);

  useEffect(() => {
    const tick = () => setLeft(Math.max(0, data.expiredAt - Math.floor(Date.now() / 1000)));
    tick();
    const t = setInterval(tick, 1000);
    return () => clearInterval(t);
  }, [data.expiredAt]);

  async function act(action: "pay" | "cancel") {
    setBusy(action);
    setError(null);
    try {
      const res = await fetch(`/api/mock-payos/${data.id}`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ action }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error);
      router.push(json.redirectUrl);
    } catch (e) {
      setError(e instanceof Error && e.message ? e.message : "Request failed");
      setBusy(null);
    }
  }

  const expired = left === 0 || data.status === "EXPIRED";
  const open = data.status === "PENDING" && !expired;

  return (
    <div className={`grid gap-6 ${compact ? "md:grid-cols-[220px_1fr]" : "md:grid-cols-[280px_1fr]"}`}>
      <div className="flex flex-col items-center gap-3">
        <div className={`relative rounded-2xl border border-border bg-white p-4 ${open ? "" : "opacity-30"}`}>
          <QRCodeSVG value={data.qrCode} size={compact ? 180 : 240} level="M" marginSize={0} />
          <span className="absolute inset-0 m-auto flex h-10 w-10 items-center justify-center rounded-lg bg-white text-lg font-black text-payos shadow">
            QR
          </span>
        </div>
        <p className="text-center text-xs text-muted">Scan with any banking app that supports VietQR</p>
        {left !== null && open && (
          <p className="text-sm">
            Expires in{" "}
            <span className="font-mono font-semibold tabular-nums">
              {Math.floor(left / 60)}:{String(left % 60).padStart(2, "0")}
            </span>
          </p>
        )}
      </div>

      <div className="space-y-4">
        <dl className="divide-y divide-border rounded-2xl border border-border text-sm">
          <Row label="Bank" value={data.bankName} />
          <Row label="Account name" value={data.accountName} />
          <Row label="Account number" value={data.accountNumber} copy />
          <Row label="Amount" value={formatVND(data.amount)} copy={String(data.amount)} strong />
          <Row label="Description" value={data.description} copy />
        </dl>
        <p className="rounded-xl bg-amber-50 px-3 py-2 text-xs text-amber-900">
          This is a <strong>simulated</strong> payOS checkout. Nothing is charged. Use the
          buttons below to play the part of the customer&apos;s bank.
        </p>
        {error && <p className="text-sm text-red-600">{error}</p>}
        {open ? (
          <div className="flex flex-col gap-2 sm:flex-row">
            <button type="button" className="btn flex-1 bg-payos text-white hover:opacity-90" disabled={!!busy} onClick={() => act("pay")}>
              {busy === "pay" ? "Confirming transfer…" : "Simulate successful transfer"}
            </button>
            <button type="button" className="btn-secondary flex-1" disabled={!!busy} onClick={() => act("cancel")}>
              {busy === "cancel" ? "Cancelling…" : "Cancel payment"}
            </button>
          </div>
        ) : (
          <button type="button" className="btn-secondary w-full" onClick={() => router.push(`/orders/${data.orderCode}`)}>
            {expired ? "Link expired, back to the store" : "Back to the store"}
          </button>
        )}
      </div>
    </div>
  );
}

function Row({ label, value, copy, strong }: { label: string; value: string; copy?: boolean | string; strong?: boolean }) {
  const [copied, setCopied] = useState(false);
  return (
    <div className="flex items-center justify-between gap-3 px-4 py-2.5">
      <dt className="text-muted">{label}</dt>
      <dd className={`flex items-center gap-2 text-right ${strong ? "font-semibold" : ""}`}>
        <span className="font-mono">{value}</span>
        {copy && (
          <button
            type="button"
            className="rounded-md border border-border px-1.5 py-0.5 text-xs text-muted hover:text-foreground"
            onClick={() => {
              navigator.clipboard?.writeText(typeof copy === "string" ? copy : value).catch(() => {});
              setCopied(true);
              setTimeout(() => setCopied(false), 1200);
            }}
          >
            {copied ? "Copied" : "Copy"}
          </button>
        )}
      </dd>
    </div>
  );
}
