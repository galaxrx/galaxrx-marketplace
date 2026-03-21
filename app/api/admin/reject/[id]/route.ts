import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { sendVerificationRejected } from "@/lib/resend";
import { z } from "zod";

const schema = z.object({ reason: z.string().min(1) });

export async function POST(
  req: Request,
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
  const body = await req.json();
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { message: "Reason required" },
      { status: 400 }
    );
  }
  await sendVerificationRejected(
    pharmacy.email,
    pharmacy.name,
    parsed.data.reason
  );
  return NextResponse.json({ ok: true });
}
