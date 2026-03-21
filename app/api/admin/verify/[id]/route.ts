import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { sendVerificationApproved } from "@/lib/resend";

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
  });
  if (!pharmacy) {
    return NextResponse.json({ message: "Pharmacy not found" }, { status: 404 });
  }
  if (pharmacy.isVerified) {
    return NextResponse.json({ message: "Already verified" }, { status: 400 });
  }
  await prisma.pharmacy.update({
    where: { id },
    data: { isVerified: true },
  });
  const emailResult = await sendVerificationApproved(pharmacy.email, pharmacy.name);
  const emailError =
    emailResult.success === false && emailResult.error
      ? typeof emailResult.error === "object" && "message" in emailResult.error
        ? String((emailResult.error as { message: unknown }).message)
        : "Unknown error"
      : undefined;
  return NextResponse.json({
    ok: true,
    emailSent: emailResult.success === true,
    message: emailResult.success ? undefined : "Approved, but welcome email could not be sent.",
    emailError,
  });
}
