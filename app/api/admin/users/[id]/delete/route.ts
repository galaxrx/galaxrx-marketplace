import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

/**
 * DELETE /api/admin/users/[id]/delete
 * Admin only. Deletes the pharmacy and all related data.
 * The user can sign up again later with the same email.
 */
export async function POST(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user || (session.user as { role?: string }).role !== "ADMIN") {
    return NextResponse.json({ message: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;
  const pharmacy = await prisma.pharmacy.findUnique({
    where: { id },
    select: { id: true, name: true, email: true, role: true },
  });

  if (!pharmacy) {
    return NextResponse.json({ message: "User not found" }, { status: 404 });
  }

  // Prevent deleting the platform admin
  if (pharmacy.role === "ADMIN") {
    return NextResponse.json(
      { message: "Cannot delete an admin user." },
      { status: 400 }
    );
  }

  try {
    await prisma.$transaction(async (tx) => {
      await tx.review.deleteMany({
        where: { OR: [{ reviewerId: id }, { subjectId: id }] },
      });
      await tx.order.deleteMany({
        where: { OR: [{ buyerId: id }, { sellerId: id }] },
      });
      await tx.listing.deleteMany({ where: { pharmacyId: id } });
      await tx.message.deleteMany({
        where: { OR: [{ senderId: id }, { recipientId: id }] },
      });
      await tx.wantedItem.deleteMany({ where: { pharmacyId: id } });
      await tx.pharmacy.delete({ where: { id } });
    });
    return NextResponse.json({
      ok: true,
      message: "User deleted. They can sign up again with the same email.",
    });
  } catch (e) {
    console.error("Admin delete user error:", e);
    return NextResponse.json(
      { message: "Failed to delete user" },
      { status: 500 }
    );
  }
}
