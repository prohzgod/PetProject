"use client";

// `usePayOS` is not a real React hook: it just builds an object that injects
// the payOS iframe and listens for its postMessage events. Renamed so it can
// be called inside an effect.
import { usePayOS as createPayOSCheckout } from "@payos/payos-checkout";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

const ELEMENT_ID = "payos-embedded-checkout";

/** Renders the real payOS checkout form inside this page (live mode). */
export function PayOSEmbedded({ orderCode, checkoutUrl }: { orderCode: number; checkoutUrl: string }) {
  const router = useRouter();
  const [leaving, setLeaving] = useState(false);

  useEffect(() => {
    const orderPath = `/orders/${orderCode}`;
    const { open, exit } = createPayOSCheckout({
      RETURN_URL: `${window.location.origin}${orderPath}`,
      ELEMENT_ID,
      CHECKOUT_URL: checkoutUrl,
      embedded: true,
      onSuccess: () => {
        setLeaving(true);
        router.push(orderPath);
      },
      onCancel: async () => {
        setLeaving(true);
        await fetch(`/api/orders/${orderCode}/cancel`, { method: "POST" }).catch(() => {});
        router.push(orderPath);
      },
      onExit: () => {
        setLeaving(true);
        router.push(orderPath);
      },
    });
    open();
    return () => {
      // The library already removed the iframe after success/cancel.
      if (document.getElementById(ELEMENT_ID)?.querySelector("iframe")) exit();
    };
  }, [orderCode, checkoutUrl, router]);

  return (
    <div className="relative">
      <div id={ELEMENT_ID} className="h-[360px] w-full overflow-hidden rounded-xl" />
      {leaving && (
        <div className="absolute inset-0 flex items-center justify-center rounded-xl bg-white/80 text-sm text-muted">
          Checking payment status…
        </div>
      )}
    </div>
  );
}
