import { revalidatePath } from "next/cache";

/** Call after a purchase so Buy / browse / wanted-match UIs drop sold lines on next request. */
export function revalidateMarketplaceAfterPurchase(): void {
  try {
    revalidatePath("/buy");
    revalidatePath("/listings");
    revalidatePath("/wanted-matches");
    revalidatePath("/dashboard");
    revalidatePath("/cart");
  } catch {
    /* revalidatePath can throw outside a request in some contexts */
  }
}
