# Paw & Co. — payOS checkout demo

A small pet-supplies store built with Next.js 16 that shows how to take payments
with [payOS](https://payos.vn) (VietQR bank transfers) on an e-commerce
checkout page.

- Storefront → cart → checkout form → payOS → order confirmation
- Two checkout styles: **redirect** to the payOS hosted page, or **embedded**
  payOS form inside the store (`@payos/payos-checkout`)
- Server-side pricing, payment link creation with the official
  [`@payos/node`](https://www.npmjs.com/package/@payos/node) SDK
- Signed webhook handler that confirms the order
- Order page that re-checks the status with payOS and polls until it is final
- **Mock mode**: runs with no payOS account, using a simulated payOS checkout
  page and a signed fake webhook, so you can click through the full flow

## Quick start

```bash
cd payos-checkout
npm install
npm run dev
```

Open http://localhost:3000. Without credentials the app runs in mock mode
(yellow banner at the top). Add items, check out, and on the simulated payOS
page press **Simulate successful transfer** or **Cancel payment**.

## Using real payOS

1. Create a payment channel at https://my.payos.vn and copy its Client ID,
   API Key and Checksum Key.
2. `cp .env.example .env.local` and fill in `PAYOS_CLIENT_ID`,
   `PAYOS_API_KEY` and `PAYOS_CHECKSUM_KEY`. Restart the app; the header
   badge now says `payOS: live`.
3. Webhooks need a public URL. Expose the app, for example with
   `ngrok http 3000`, set `APP_URL` to that URL, then register the webhook:

   ```bash
   npm run payos:confirm-webhook -- https://<your-tunnel>/api/webhooks/payos
   ```

   payOS sends a test request while confirming. The handler answers it with
   `200` even though no order matches.
4. Buy the **Treat Sample (test item)** for 2.000đ to test the whole flow with a
   real bank transfer.

The webhook is optional for the demo: the order page asks payOS for the
payment status anyway, so orders still update without it.

## How the flow works

```
Browser                      Next.js server                       payOS
───────                      ──────────────                       ─────
POST /api/orders  ─────────► re-price cart from catalog
 (cart ids + qty,            create orderCode
  customer, flow)            paymentRequests.create() ──────────► payment link
                  ◄───────── { checkoutUrl }                     (signed request)

redirect flow:   window.location = checkoutUrl ─────────────────► pay.payos.vn
embedded flow:   /orders/:code/pay renders the payOS iframe ─────► pay.payos.vn/embedded

                             POST /api/webhooks/payos ◄────────── transfer received
                             webhooks.verify() (HMAC-SHA256)
                             mark order PAID

payOS returnUrl / cancelUrl ► /orders/:code
                             paymentRequests.get(orderCode) ────► authoritative status
                  ◄───────── status page (polls every 3 s until final)
```

Points worth copying into a real shop:

- **Never trust the browser for money.** The client only sends product ids and
  quantities; the server prices the order (`src/lib/order-service.ts`).
- **Never trust the redirect.** payOS appends `?status=PAID&...` to the return
  URL, but anyone can type that. The order page reads the status from the payOS
  API or from a verified webhook.
- **Verify every webhook** with the checksum key (`webhooks.verify`) and make
  the handler idempotent: payOS can retry, so transactions are deduplicated by
  bank reference.
- **Keep the transfer description short.** payOS allows 25 characters, but only
  9 for bank accounts that are not linked through payOS, so this demo uses
  `PET` + 6 digits.
- **Expire links.** Links are created with `expiredAt` 15 minutes ahead.

## Project layout

```
src/
  app/
    (store)/                      storefront pages (shared header/footer)
      page.tsx                    product grid
      cart/page.tsx               cart
      checkout/page.tsx           customer form + payment method
      orders/[orderCode]/page.tsx       return/cancel landing + status
      orders/[orderCode]/pay/page.tsx   embedded payOS checkout
    mock-checkout/[id]/page.tsx   simulated payOS hosted page (mock mode only)
    api/
      orders/route.ts             POST create order + payment link
      orders/[orderCode]/route.ts GET order status (synced with payOS)
      orders/[orderCode]/cancel/route.ts   POST cancel payment link
      webhooks/payos/route.ts     POST payOS webhook
      mock-payos/[id]/route.ts    simulated bank transfer / cancel (mock mode)
  lib/
    payment-gateway.ts            payOS SDK wrapper + mock implementation
    order-service.ts              place / sync / cancel orders, apply webhooks
    orders.ts                     in-memory order store
    catalog.ts                    products and shipping rules
    cart-store.ts                 localStorage cart
scripts/confirm-webhook.mjs       registers the webhook URL with payOS
```

## Limits of the demo

- Orders live in memory and disappear on restart. Use a database in
  production, and run it as a single instance (not serverless) for the demo.
- There are no user accounts. Anyone who knows an order code can view or cancel
  that order; tie orders to a session or account before going live.
