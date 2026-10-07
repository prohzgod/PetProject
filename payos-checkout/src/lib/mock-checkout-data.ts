import "server-only";

import type { MockCheckoutData } from "@/components/mock-checkout-panel";
import { getMockLink, MOCK_BANK } from "./payment-gateway";

export function mockCheckoutData(id: string): MockCheckoutData | undefined {
  const link = getMockLink(id);
  if (!link) return undefined;
  return {
    id: link.id,
    orderCode: link.orderCode,
    amount: link.amount,
    description: link.description,
    qrCode: link.qrCode,
    expiredAt: link.expiredAt,
    status: link.status,
    bankName: MOCK_BANK.bankName,
    accountNumber: MOCK_BANK.accountNumber,
    accountName: MOCK_BANK.accountName,
  };
}
