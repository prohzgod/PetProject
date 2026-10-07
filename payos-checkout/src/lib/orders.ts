import "server-only";

import type { PaymentLinkStatus, Transaction } from "@payos/node";

// In-memory order store. Good enough for a demo; a real shop would persist
// orders in a database and update them inside a transaction.

export type OrderLine = {
  productId: string;
  name: string;
  price: number;
  quantity: number;
};

export type Customer = {
  name: string;
  email: string;
  phone: string;
  address: string;
  note?: string;
};

export type PaymentFlow = "redirect" | "embedded";

export type Order = {
  orderCode: number;
  lines: OrderLine[];
  subtotal: number;
  shipping: number;
  amount: number;
  customer: Customer;
  flow: PaymentFlow;
  status: PaymentLinkStatus;
  amountPaid: number;
  paymentLinkId: string;
  checkoutUrl: string;
  description: string;
  createdAt: string;
  expiredAt: number; // unix seconds
  paidAt?: string;
  cancellationReason?: string | null;
  transactions: Transaction[];
  webhookReceived: boolean;
};

const globalStore = globalThis as unknown as { __orders?: Map<number, Order> };
const orders = (globalStore.__orders ??= new Map<number, Order>());

export function saveOrder(order: Order): Order {
  orders.set(order.orderCode, order);
  return order;
}

export function getOrder(orderCode: number): Order | undefined {
  return orders.get(orderCode);
}

export function updateOrder(
  orderCode: number,
  patch: Partial<Order>,
): Order | undefined {
  const current = orders.get(orderCode);
  if (!current) return undefined;
  const next = { ...current, ...patch };
  orders.set(orderCode, next);
  return next;
}

// PayOS orderCode must be a unique positive integer (<= 2^53 - 1).
export function newOrderCode(): number {
  const time = Date.now() % 1e10; // 10 digits, rolls over every ~115 days
  const rand = Math.floor(Math.random() * 100);
  return time * 100 + rand;
}

// PayOS allows 25 characters, but only 9 for bank accounts that are not linked
// through payOS, so keep the transfer description short.
export function paymentDescription(orderCode: number): string {
  return `PET${String(orderCode).slice(-6)}`;
}

export function parseOrderCode(value: string): number | null {
  if (!/^\d{1,15}$/.test(value)) return null;
  const code = Number(value);
  return Number.isSafeInteger(code) && code > 0 ? code : null;
}

export function isFinal(status: PaymentLinkStatus): boolean {
  return status === "PAID" || status === "CANCELLED" || status === "EXPIRED" || status === "FAILED";
}
