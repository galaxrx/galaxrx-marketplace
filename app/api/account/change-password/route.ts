import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { compare, hash } from "bcryptjs";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const schema = z.object({
  currentPassword: z.string().min(1),
  newPassword: z.string().min(8),
});

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }
  const pharmacyId = (session.user as { id: string }).id;
  try {
    const body = await req.json();
    const parsed = schema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { message: "Invalid input", errors: parsed.error.flatten() },
        { status: 400 }
      );
    }
    const { currentPassword, newPassword } = parsed.data;
    if (currentPassword === newPassword) {
      return NextResponse.json(
        { message: "New password must be different from current password" },
        { status: 400 }
      );
    }
    const pharmacy = await prisma.pharmacy.findUnique({
      where: { id: pharmacyId },
      select: { passwordHash: true },
    });
    if (!pharmacy) {
      return NextResponse.json({ message: "Pharmacy not found" }, { status: 404 });
    }
    const valid = await compare(currentPassword, pharmacy.passwordHash);
    if (!valid) {
      return NextResponse.json(
        { message: "Current password is incorrect" },
        { status: 400 }
      );
    }
    const passwordHash = await hash(newPassword, 12);
    await prisma.pharmacy.update({
      where: { id: pharmacyId },
      data: { passwordHash },
    });
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error(e);
    return NextResponse.json(
      { message: "Failed to change password" },
      { status: 500 }
    );
  }
}
