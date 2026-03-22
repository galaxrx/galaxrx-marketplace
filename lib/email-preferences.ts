/**
 * Transactional purchase confirmations: send unless the buyer explicitly disabled
 * "Purchase confirmed" in settings. Treats null/undefined (legacy rows) as opted in.
 */
export function shouldSendBuyerPurchaseConfirmationEmail(
  buyer: {
    email?: string | null;
    notifyPurchase?: boolean | null;
  } | null | undefined
): boolean {
  const email = buyer?.email?.trim();
  if (!email) return false;
  if (buyer?.notifyPurchase === false) return false;
  return true;
}
