"use client";

import { useSyncExternalStore } from "react";
import { getProduct, shippingFor, type Product } from "./catalog";

// Cart kept in localStorage so it survives the round trip to payOS.

export type CartItem = { productId: string; quantity: number };

const KEY = "pawco-cart";
const EMPTY: CartItem[] = [];
const listeners = new Set<() => void>();
let cache: { raw: string | null; items: CartItem[] } = { raw: null, items: EMPTY };

function read(): CartItem[] {
  let raw: string | null = null;
  try {
    raw = localStorage.getItem(KEY);
  } catch {
    // storage blocked: fall back to an empty cart
  }
  if (raw === cache.raw) return cache.items;
  let items: CartItem[] = EMPTY;
  try {
    const parsed = raw ? JSON.parse(raw) : [];
    if (Array.isArray(parsed)) {
      items = parsed.filter(
        (i): i is CartItem => typeof i?.productId === "string" && Number.isInteger(i?.quantity) && i.quantity > 0 && !!getProduct(i.productId),
      );
    }
  } catch {
    items = EMPTY;
  }
  cache = { raw, items };
  return items;
}

function write(items: CartItem[]) {
  try {
    localStorage.setItem(KEY, JSON.stringify(items));
  } catch {
    cache = { raw: cache.raw, items };
  }
  listeners.forEach((l) => l());
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  const onStorage = (e: StorageEvent) => e.key === KEY && listener();
  window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(listener);
    window.removeEventListener("storage", onStorage);
  };
}

export const cart = {
  add(productId: string, quantity = 1) {
    const items = read();
    const existing = items.find((i) => i.productId === productId);
    write(
      existing
        ? items.map((i) => (i.productId === productId ? { ...i, quantity: Math.min(99, i.quantity + quantity) } : i))
        : [...items, { productId, quantity }],
    );
  },
  setQuantity(productId: string, quantity: number) {
    const items = read();
    write(
      quantity <= 0
        ? items.filter((i) => i.productId !== productId)
        : items.map((i) => (i.productId === productId ? { ...i, quantity: Math.min(99, quantity) } : i)),
    );
  },
  remove(productId: string) {
    write(read().filter((i) => i.productId !== productId));
  },
  clear() {
    write([]);
  },
};

export type CartLine = CartItem & { product: Product; lineTotal: number };

const noopSubscribe = () => () => {};

export function useCart() {
  const items = useSyncExternalStore(subscribe, read, () => EMPTY);
  // false during server render / hydration, when localStorage is unknown
  const ready = useSyncExternalStore(noopSubscribe, () => true, () => false);
  const lines: CartLine[] = items.map((i) => {
    const product = getProduct(i.productId)!;
    return { ...i, product, lineTotal: product.price * i.quantity };
  });
  const subtotal = lines.reduce((sum, l) => sum + l.lineTotal, 0);
  const shipping = shippingFor(subtotal);
  return {
    ready,
    lines,
    count: items.reduce((sum, i) => sum + i.quantity, 0),
    subtotal,
    shipping,
    total: subtotal + shipping,
  };
}
