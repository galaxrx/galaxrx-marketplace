/** Checkout stock hold + cart shelf life (keep in sync across app). */
export const CHECKOUT_RESERVATION_MINUTES = 10;
export const CART_TTL_MS = CHECKOUT_RESERVATION_MINUTES * 60 * 1000;
