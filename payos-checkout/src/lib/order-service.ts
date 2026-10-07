import "server-only";

import type { WebhookData } from "@payos/node";
import { getProduct, shippingFor } from "./catalog";
import {
  getOrder,
  isFinal,
  newOrderCode,
  paymentDescription,
  saveOrder,
  updateOrder,
  type Customer,
  type Order,
  type OrderLine,
  type PaymentFlow,
} from "./orders";
import { getGateway } from "./payment-gateway";

export class CheckoutError extends Error {}

const PAYMENT_LINK_TTL_SECONDS = 15 * 60;

export type CheckoutInput = {
  items: { productId: string; quantity: number }[];
  customer: Customer;
  flow: PaymentFlow;
};

export async function placeOrder(input: CheckoutInput, origin: string): Promise<Order> {
  const lines: OrderLine[] = [];
  for (const item of input.items) {
    const product = getProduct(item.productId);
    const quantity = Math.floor(item.quantity);
    if (!product) throw new CheckoutError(`Unknown product: ${item.productId}`);
    if (!(quantity >= 1 && quantity <= 99)) {
      throw new CheckoutError(`Invalid quantity for ${product.name}`);
    }
    lines.push({ productId: product.id, name: product.name, price: product.price, quantity });
  }
  if (lines.length === 0) throw new CheckoutError("Your cart is empty");

  const subtotal = lines.reduce((sum, l) => sum + l.price * l.quantity, 0);
  const shipping = shippingFor(subtotal);
  const amount = subtotal + shipping;
  const orderCode = newOrderCode();
  const description = paymentDescription(orderCode);
  const expiredAt = Math.floor(Date.now() / 1000) + PAYMENT_LINK_TTL_SECONDS;
  const orderUrl = `${origin}/orders/${orderCode}`;

  const items = lines.map((l) => ({ name: l.name, quantity: l.quantity, price: l.price }));
  if (shipping > 0) items.push({ name: "Shipping", quantity: 1, price: shipping });

  const link = await getGateway().createPaymentLink({
    orderCode,
    amount,
    description,
    items,
    buyerName: input.customer.name,
    buyerEmail: input.customer.email,
    buyerPhone: input.customer.phone,
    buyerAddress: input.customer.address,
    returnUrl: orderUrl,
    cancelUrl: `${orderUrl}?cancelled=1`,
    expiredAt,
  });

  return saveOrder({
    orderCode,
    lines,
    subtotal,
    shipping,
    amount,
    customer: input.customer,
    flow: input.flow,
    status: link.status,
    amountPaid: 0,
    paymentLinkId: link.paymentLinkId,
    checkoutUrl: link.checkoutUrl,
    description,
    createdAt: new Date().toISOString(),
    expiredAt: link.expiredAt ?? expiredAt,
    transactions: [],
    webhookReceived: false,
  });
}

/**
 * The redirect back from payOS (and its query string) can be forged, so the
 * order status always comes from the payOS API or a verified webhook.
 */
export async function syncOrder(orderCode: number): Promise<Order | undefined> {
  const order = getOrder(orderCode);
  if (!order || isFinal(order.status)) return order;
  try {
    const link = await getGateway().getPaymentLink(orderCode);
    return updateOrder(orderCode, {
      status: link.status,
      amountPaid: link.amountPaid,
      transactions: link.transactions,
      cancellationReason: link.cancellationReason,
      paidAt:
        link.status === "PAID"
          ? (order.paidAt ?? link.transactions.at(-1)?.transactionDateTime ?? new Date().toISOString())
          : order.paidAt,
    });
  } catch (error) {
    console.error(`[orders] failed to sync order ${orderCode}`, error);
    return order;
  }
}

export async function cancelOrder(orderCode: number, reason: string): Promise<Order | undefined> {
  const order = getOrder(orderCode);
  if (!order) return undefined;
  if (isFinal(order.status)) return order;
  const link = await getGateway().cancelPaymentLink(orderCode, reason);
  return updateOrder(orderCode, {
    status: link.status,
    cancellationReason: link.cancellationReason,
  });
}

/** Applies a webhook payload that has already been signature-verified. */
export function applyPaymentWebhook(data: WebhookData): Order | undefined {
  const order = getOrder(data.orderCode);
  if (!order) return undefined;
  if (data.code !== "00") return order;
  // Webhooks can be retried: ignore a transaction reference we have seen.
  if (order.transactions.some((t) => t.reference === data.reference)) {
    return updateOrder(order.orderCode, { webhookReceived: true });
  }

  const amountPaid = order.amountPaid + data.amount;
  const paid = amountPaid >= order.amount;
  return updateOrder(order.orderCode, {
    webhookReceived: true,
    amountPaid,
    status: paid ? "PAID" : "UNDERPAID",
    paidAt: paid ? data.transactionDateTime : order.paidAt,
    transactions: [
      ...order.transactions,
      {
        reference: data.reference,
        amount: data.amount,
        accountNumber: data.accountNumber,
        description: data.description,
        transactionDateTime: data.transactionDateTime,
        virtualAccountName: data.virtualAccountName ?? null,
        virtualAccountNumber: data.virtualAccountNumber ?? null,
        counterAccountBankId: data.counterAccountBankId ?? null,
        counterAccountBankName: data.counterAccountBankName ?? null,
        counterAccountName: data.counterAccountName ?? null,
        counterAccountNumber: data.counterAccountNumber ?? null,
      },
    ],
  });
}

/** Order data that is safe to send to the browser. */
export function toPublicOrder(order: Order) {
  return {
    orderCode: order.orderCode,
    status: order.status,
    amount: order.amount,
    amountPaid: order.amountPaid,
    subtotal: order.subtotal,
    shipping: order.shipping,
    lines: order.lines,
    customer: order.customer,
    flow: order.flow,
    checkoutUrl: order.checkoutUrl,
    description: order.description,
    createdAt: order.createdAt,
    expiredAt: order.expiredAt,
    paidAt: order.paidAt ?? null,
    cancellationReason: order.cancellationReason ?? null,
    webhookReceived: order.webhookReceived,
    transactions: order.transactions.map((t) => ({
      reference: t.reference,
      amount: t.amount,
      transactionDateTime: t.transactionDateTime,
      counterAccountBankName: t.counterAccountBankName,
      counterAccountName: t.counterAccountName,
    })),
  };
}

export type PublicOrder = ReturnType<typeof toPublicOrder>;
