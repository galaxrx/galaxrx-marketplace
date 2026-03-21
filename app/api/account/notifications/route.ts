import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const schema = z.object({
  notifyNewSale: z.boolean().optional(),
  notifyPurchase: z.boolean().optional(),
  notifyNewMessage: z.boolean().optional(),
  notifyOrderShipped: z.boolean().optional(),
  notifyOrderDelivered: z.boolean().optional(),
  notifyWantedMatch: z.boolean().optional(),
});

export async function PATCH(req: Request) {
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
    const data = parsed.data as Record<string, boolean>;
    if (Object.keys(data).length === 0) {
      return NextResponse.json({ message: "No fields to update" }, { status: 400 });
    }
    await prisma.pharmacy.update({
      where: { id: pharmacyId },
      data,
    });
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error(e);
    return NextResponse.json(
      { message: "Failed to update notifications" },
      { status: 500 }
    );
  }
}
