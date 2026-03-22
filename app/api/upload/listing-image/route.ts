import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { writeFile, mkdir } from "fs/promises";
import path from "path";

const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp"];
const MAX_SIZE = 4 * 1024 * 1024; // 4MB

/** Public origin for returned image URLs — never use localhost on Vercel. */
function publicUploadBaseUrl(req: Request): string {
  const nextAuth = process.env.NEXTAUTH_URL?.replace(/\/$/, "");
  if (nextAuth && !/^https?:\/\/(localhost|127\.0\.0\.1|\[::1\])(:\d+)?$/i.test(nextAuth)) {
    return nextAuth;
  }
  if (process.env.VERCEL_URL) {
    return `https://${process.env.VERCEL_URL}`;
  }
  if (nextAuth) return nextAuth;
  const origin = req.headers.get("origin")?.replace(/\/$/, "");
  if (origin) return origin;
  return "http://localhost:3000";
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  let formData: FormData;
  try {
    formData = await req.formData();
  } catch {
    return NextResponse.json(
      { message: "Invalid form data" },
      { status: 400 }
    );
  }

  const file = formData.get("file") as File | null;
  if (!file || typeof file.arrayBuffer !== "function") {
    return NextResponse.json(
      { message: "No file provided" },
      { status: 400 }
    );
  }

  if (!ALLOWED_TYPES.includes(file.type)) {
    return NextResponse.json(
      { message: "Invalid file type. Use JPG, PNG or WEBP" },
      { status: 400 }
    );
  }
  if (file.size > MAX_SIZE) {
    return NextResponse.json(
      { message: "File too large. Max 4MB" },
      { status: 400 }
    );
  }

  const ext = file.type === "image/jpeg" ? "jpg" : file.type === "image/png" ? "png" : "webp";
  const filename = `listing-${session.user.id}-${Date.now()}-${Math.random().toString(36).slice(2, 9)}.${ext}`;
  const dir = path.join(process.cwd(), "public", "uploads", "listings");

  try {
    await mkdir(dir, { recursive: true });
  } catch (e) {
    console.error("mkdir uploads/listings", e);
    return NextResponse.json(
      { message: "Failed to create upload directory" },
      { status: 500 }
    );
  }

  const filepath = path.join(dir, filename);
  try {
    const buffer = Buffer.from(await file.arrayBuffer());
    await writeFile(filepath, buffer);
  } catch (e) {
    console.error("write listing image", e);
    return NextResponse.json(
      { message: "Failed to save file" },
      { status: 500 }
    );
  }

  const url = `${publicUploadBaseUrl(req)}/uploads/listings/${filename}`;
  return NextResponse.json({ url });
}
