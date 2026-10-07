import Link from "next/link";
import { connection } from "next/server";
import { Suspense } from "react";
import { CartLink } from "@/components/cart-link";
import { isMockMode } from "@/lib/payment-gateway";

export default function StoreLayout({ children }: LayoutProps<"/">) {
  return (
    <>
      <Suspense>
        <MockBanner />
      </Suspense>
      <header className="sticky top-0 z-20 border-b border-border bg-background/90 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4">
          <Link href="/" className="flex items-center gap-2 text-lg font-bold tracking-tight">
            <span aria-hidden className="text-2xl">🐾</span>
            Paw &amp; Co.
          </Link>
          <nav className="flex items-center gap-2">
            <Suspense>
              <ModeBadge />
            </Suspense>
            <CartLink />
          </nav>
        </div>
      </header>
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-8">{children}</main>
      <footer className="border-t border-border py-6 text-center text-xs text-muted">
        Demo store for a{" "}
        <a className="underline" href="https://payos.vn/docs" target="_blank" rel="noreferrer">
          payOS
        </a>{" "}
        integration. No real goods are shipped.
      </footer>
    </>
  );
}

// Read the payOS mode at request time so it follows the server's environment
// rather than the one the app was built with.
async function MockBanner() {
  await connection();
  if (!isMockMode()) return null;
  return (
    <div className="bg-amber-100 px-4 py-2 text-center text-xs text-amber-900">
      <strong>Mock mode:</strong> no payOS credentials found, payments are
      simulated. Add <code className="font-mono">PAYOS_*</code> keys to{" "}
      <code className="font-mono">.env.local</code> to use the real payOS API.
    </div>
  );
}

async function ModeBadge() {
  await connection();
  const mock = isMockMode();
  return (
    <span
      className={`hidden rounded-full px-2.5 py-1 text-xs font-medium sm:inline ${
        mock ? "bg-amber-100 text-amber-900" : "bg-emerald-100 text-emerald-900"
      }`}
    >
      payOS: {mock ? "mock" : "live"}
    </span>
  );
}
