import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { sellerForceReleaseListingHolds } from "@/lib/listing-reservation";
import { revalidatePath } from "next/cache";

/**
 * Seller: clear all non-PAID checkout holds on a listing so it shows on Buy Items again.
 * Use when no customer is actively paying; may cancel an abandoned cart/checkout.
 */
export async function POST(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }
  const pharmacyId = (session.user as { id: string }).id;
  const { id } = await params;
  const result = await sellerForceReleaseListingHolds(id, pharmacyId);
  if (!result.ok) {
    const st = result.message === "Forbidden" ? 403 : 404;
    return NextResponse.json({ message: result.message }, { status: st });
  }
  revalidatePath("/buy");
  revalidatePath("/listings");
  revalidatePath("/my-listings");
  return NextResponse.json({ ok: true });
}
