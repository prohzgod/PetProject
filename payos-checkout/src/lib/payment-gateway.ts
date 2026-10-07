import "server-only";

import {
  PayOS,
  type CreatePaymentLinkRequest,
  type CreatePaymentLinkResponse,
  type PaymentLink,
  type PaymentLinkStatus,
  type Transaction,
  type Webhook,
  type WebhookData,
} from "@payos/node";

// A thin wrapper around the payOS SDK so the rest of the app does not care
// whether it talks to the real payOS API or to the built-in mock.
//
// Live mode:  PAYOS_CLIENT_ID, PAYOS_API_KEY and PAYOS_CHECKSUM_KEY are set.
// Mock mode:  any of them is missing. Payment links are kept in memory and the
//             hosted checkout page is simulated at /mock-checkout/[id].
export interface PaymentGateway {
  mode: "live" | "mock";
  createPaymentLink(req: CreatePaymentLinkRequest): Promise<CreatePaymentLinkResponse>;
  getPaymentLink(orderCode: number): Promise<PaymentLink>;
  cancelPaymentLink(orderCode: number, reason?: string): Promise<PaymentLink>;
  verifyWebhook(body: Webhook): Promise<WebhookData>;
}

export function isMockMode(): boolean {
  return !(
    process.env.PAYOS_CLIENT_ID &&
    process.env.PAYOS_API_KEY &&
    process.env.PAYOS_CHECKSUM_KEY
  );
}

export function getGateway(): PaymentGateway {
  return isMockMode() ? mockGateway : liveGateway();
}

// ---------------------------------------------------------------------------
// Live gateway: the official @payos/node SDK
// ---------------------------------------------------------------------------

let payos: PayOS | undefined;

function liveGateway(): PaymentGateway {
  payos ??= new PayOS({
    clientId: process.env.PAYOS_CLIENT_ID,
    apiKey: process.env.PAYOS_API_KEY,
    checksumKey: process.env.PAYOS_CHECKSUM_KEY,
  });
  const client = payos;
  return {
    mode: "live",
    // The SDK signs the request (amount, cancelUrl, description, orderCode,
    // returnUrl) with the checksum key and verifies the response signature.
    createPaymentLink: (req) => client.paymentRequests.create(req),
    getPaymentLink: (orderCode) => client.paymentRequests.get(orderCode),
    cancelPaymentLink: (orderCode, reason) =>
      client.paymentRequests.cancel(orderCode, reason),
    verifyWebhook: (body) => client.webhooks.verify(body),
  };
}

// ---------------------------------------------------------------------------
// Mock gateway: mimics payOS so the demo works without credentials
// ---------------------------------------------------------------------------

export const MOCK_BANK = {
  bankName: "MB Bank (demo)",
  bin: "970422",
  accountNumber: "0000123456789",
  accountName: "PAW AND CO DEMO",
};

export type MockPaymentLink = PaymentLink & {
  description: string;
  returnUrl: string;
  cancelUrl: string;
  expiredAt: number;
  qrCode: string;
  items: CreatePaymentLinkRequest["items"];
  buyerName?: string;
};

// Mock links are signed with this key so the webhook route exercises the same
// SDK signature check it uses in live mode.
const MOCK_CHECKSUM_KEY = "mock-checksum-key-for-local-demo";
const mockSigner = new PayOS({
  clientId: "mock-client",
  apiKey: "mock-api-key",
  checksumKey: MOCK_CHECKSUM_KEY,
});

const mockGlobal = globalThis as unknown as {
  __mockLinks?: Map<string, MockPaymentLink>;
};
const mockLinks = (mockGlobal.__mockLinks ??= new Map());

function findMockByOrderCode(orderCode: number): MockPaymentLink {
  for (const link of mockLinks.values()) {
    if (link.orderCode === orderCode) return refreshExpiry(link);
  }
  throw new Error(`Mock payment link for order ${orderCode} not found`);
}

function refreshExpiry(link: MockPaymentLink): MockPaymentLink {
  if (link.status === "PENDING" && link.expiredAt * 1000 < Date.now()) {
    link.status = "EXPIRED";
  }
  return link;
}

function toPaymentLink(link: MockPaymentLink): PaymentLink {
  return {
    id: link.id,
    orderCode: link.orderCode,
    amount: link.amount,
    amountPaid: link.amountPaid,
    amountRemaining: link.amountRemaining,
    status: link.status,
    createdAt: link.createdAt,
    transactions: link.transactions,
    cancellationReason: link.cancellationReason,
    canceledAt: link.canceledAt,
  };
}

const mockGateway: PaymentGateway = {
  mode: "mock",
  async createPaymentLink(req) {
    const id = crypto.randomUUID().replaceAll("-", "");
    const expiredAt = req.expiredAt ?? Math.floor(Date.now() / 1000) + 15 * 60;
    const qrCode = `MOCK-VIETQR|${MOCK_BANK.bin}|${MOCK_BANK.accountNumber}|${req.amount}|${req.description}`;
    mockLinks.set(id, {
      id,
      orderCode: req.orderCode,
      amount: req.amount,
      amountPaid: 0,
      amountRemaining: req.amount,
      status: "PENDING",
      createdAt: new Date().toISOString(),
      transactions: [],
      cancellationReason: null,
      canceledAt: null,
      description: req.description,
      returnUrl: req.returnUrl,
      cancelUrl: req.cancelUrl,
      expiredAt,
      qrCode,
      items: req.items,
      buyerName: req.buyerName,
    });
    return {
      bin: MOCK_BANK.bin,
      accountNumber: MOCK_BANK.accountNumber,
      accountName: MOCK_BANK.accountName,
      amount: req.amount,
      description: req.description,
      orderCode: req.orderCode,
      currency: "VND",
      paymentLinkId: id,
      status: "PENDING",
      expiredAt,
      checkoutUrl: `/mock-checkout/${id}`,
      qrCode,
    };
  },
  async getPaymentLink(orderCode) {
    return toPaymentLink(findMockByOrderCode(orderCode));
  },
  async cancelPaymentLink(orderCode, reason) {
    const link = findMockByOrderCode(orderCode);
    if (link.status === "PENDING") {
      link.status = "CANCELLED";
      link.cancellationReason = reason ?? null;
      link.canceledAt = new Date().toISOString();
    }
    return toPaymentLink(link);
  },
  verifyWebhook: (body) => mockSigner.webhooks.verify(body),
};

export function getMockLink(id: string): MockPaymentLink | undefined {
  const link = mockLinks.get(id);
  return link && refreshExpiry(link);
}

function withQuery(url: string, link: MockPaymentLink, cancel: boolean) {
  const target = new URL(url);
  // Same query parameters payOS appends when it redirects back to the shop.
  target.searchParams.set("code", "00");
  target.searchParams.set("id", link.id);
  target.searchParams.set("cancel", String(cancel));
  target.searchParams.set("status", link.status);
  target.searchParams.set("orderCode", String(link.orderCode));
  return target.toString();
}

/**
 * Simulates the customer paying the mock link: marks it PAID, then delivers a
 * signed webhook to this app exactly like payOS would.
 * Returns the URL payOS would redirect the customer to.
 */
export async function simulateMockPayment(
  id: string,
  webhookUrl: string,
): Promise<string> {
  const link = getMockLink(id);
  if (!link) throw new Error("Mock payment link not found");
  if (link.status === "PAID") return withQuery(link.returnUrl, link, false);
  if (link.status !== "PENDING") return withQuery(link.cancelUrl, link, true);

  const now = new Date();
  const transaction: Transaction = {
    reference: `FT${now.getTime()}`,
    amount: link.amount,
    accountNumber: MOCK_BANK.accountNumber,
    description: link.description,
    // payOS reports bank time in Vietnam, formatted "YYYY-MM-DD HH:mm:ss"
    transactionDateTime: now.toLocaleString("sv-SE", { timeZone: "Asia/Ho_Chi_Minh" }),
    virtualAccountName: null,
    virtualAccountNumber: null,
    counterAccountBankId: "970436",
    counterAccountBankName: "Vietcombank",
    counterAccountName: link.buyerName?.toUpperCase() ?? "NGUYEN VAN A",
    counterAccountNumber: "1234567890",
  };
  link.status = "PAID" satisfies PaymentLinkStatus;
  link.amountPaid = link.amount;
  link.amountRemaining = 0;
  link.transactions.push(transaction);

  const data: WebhookData = {
    orderCode: link.orderCode,
    amount: transaction.amount,
    description: transaction.description,
    accountNumber: transaction.accountNumber,
    reference: transaction.reference,
    transactionDateTime: transaction.transactionDateTime,
    currency: "VND",
    paymentLinkId: link.id,
    code: "00",
    desc: "success",
    counterAccountBankId: transaction.counterAccountBankId,
    counterAccountBankName: transaction.counterAccountBankName,
    counterAccountName: transaction.counterAccountName,
    counterAccountNumber: transaction.counterAccountNumber,
    virtualAccountName: "",
    virtualAccountNumber: "",
  };
  const signature = await mockSigner.crypto.createSignatureFromObj(
    data,
    MOCK_CHECKSUM_KEY,
  );
  const webhook: Webhook = {
    code: "00",
    desc: "success",
    success: true,
    data,
    signature: signature ?? "",
  };

  try {
    await fetch(webhookUrl, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(webhook),
    });
  } catch (error) {
    // A lost webhook is fine: the order page re-checks the link status.
    console.error("[mock payOS] webhook delivery failed", error);
  }

  return withQuery(link.returnUrl, link, false);
}

export function simulateMockCancel(id: string): string {
  const link = getMockLink(id);
  if (!link) throw new Error("Mock payment link not found");
  if (link.status === "PENDING") {
    link.status = "CANCELLED";
    link.cancellationReason = "Customer cancelled on the checkout page";
    link.canceledAt = new Date().toISOString();
  }
  return withQuery(link.cancelUrl, link, true);
}
