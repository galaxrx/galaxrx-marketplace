import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { publicSiteBaseUrl } from "@/lib/public-site-url";
import { writeFile, mkdir } from "fs/promises";
import path from "path";

const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp"];
const MAX_SIZE = 2 * 1024 * 1024; // 2MB

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
      { message: "File too large. Max 2MB" },
      { status: 400 }
    );
  }

  const ext = file.type === "image/jpeg" ? "jpg" : file.type === "image/png" ? "png" : "webp";
  const filename = `${session.user.id}-${Date.now()}.${ext}`;
  const dir = path.join(process.cwd(), "public", "uploads", "logos");

  try {
    await mkdir(dir, { recursive: true });
  } catch (e) {
    console.error("mkdir uploads/logos", e);
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
    console.error("write logo file", e);
    return NextResponse.json(
      { message: "Failed to save file" },
      { status: 500 }
    );
  }

  const url = `${publicSiteBaseUrl(req)}/uploads/logos/${filename}`;
  return NextResponse.json({ url });
}
