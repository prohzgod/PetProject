import "server-only";

import type { NextRequest } from "next/server";

/** Public base URL used for payOS return/cancel URLs. */
export function appOrigin(request: NextRequest): string {
  return (process.env.APP_URL ?? request.nextUrl.origin).replace(/\/$/, "");
}
