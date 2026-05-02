
"use client";

import { useCartContext } from "@/context/cart-context";

/**
 * Proxy hook that returns the cart context.
 * This ensures all components share the same cart state.
 */
export function useCart() {
  return useCartContext();
}
