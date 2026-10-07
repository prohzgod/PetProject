"use client";

import { useEffect, useState } from "react";
import { cart } from "@/lib/cart-store";

export function AddToCartButton({ productId }: { productId: string }) {
  const [added, setAdded] = useState(false);

  useEffect(() => {
    if (!added) return;
    const t = setTimeout(() => setAdded(false), 1200);
    return () => clearTimeout(t);
  }, [added]);

  return (
    <button
      type="button"
      className={added ? "btn bg-emerald-600 px-4 py-2 text-white" : "btn-primary px-4 py-2"}
      onClick={() => {
        cart.add(productId);
        setAdded(true);
      }}
    >
      {added ? "Added ✓" : "Add to cart"}
    </button>
  );
}
