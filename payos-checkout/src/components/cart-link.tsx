"use client";

import Link from "next/link";
import { useCart } from "@/lib/cart-store";

export function CartLink() {
  const { count } = useCart();
  return (
    <Link
      href="/cart"
      className="relative inline-flex items-center gap-2 rounded-xl border border-border bg-surface px-3.5 py-2 text-sm font-medium hover:bg-stone-50"
    >
      <svg aria-hidden viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M6 6h15l-1.5 9h-12z" />
        <path d="M6 6 5 3H2" />
        <circle cx="9" cy="20" r="1" />
        <circle cx="18" cy="20" r="1" />
      </svg>
      Cart
      {count > 0 && (
        <span className="rounded-full bg-brand px-1.5 text-xs font-semibold text-white">{count}</span>
      )}
    </Link>
  );
}
