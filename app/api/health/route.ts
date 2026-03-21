/**
 * No DB, no auth. Use to confirm the server is responding.
 * GET /api/health -> { ok: true }
 */
import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json({ ok: true, t: Date.now() });
}
