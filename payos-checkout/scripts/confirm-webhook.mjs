// Registers this app's webhook URL with payOS.
// payOS immediately POSTs a test payload to it, so the app must be running and
// reachable from the internet (e.g. through ngrok) before you run this.
//
//   npm run payos:confirm-webhook -- https://<public-host>/api/webhooks/payos
import { PayOS } from "@payos/node";

const url = process.argv[2];
if (!url) {
  console.error("Usage: npm run payos:confirm-webhook -- https://<public-host>/api/webhooks/payos");
  process.exit(1);
}

try {
  const payos = new PayOS(); // reads PAYOS_CLIENT_ID / PAYOS_API_KEY / PAYOS_CHECKSUM_KEY
  const result = await payos.webhooks.confirm(url);
  console.log(`Webhook registered for ${result.name} (${result.accountNumber}): ${result.webhookUrl}`);
} catch (error) {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
}
