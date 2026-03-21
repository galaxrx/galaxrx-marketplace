/**
 * Minimal response - no React, no imports from app. Use to verify server responds.
 * GET /ping -> "pong"
 */
export async function GET() {
  return new Response("pong", { status: 200, headers: { "Content-Type": "text/plain" } });
}
