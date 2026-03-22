/**
 * Base URL for public disk uploads (/public/uploads/...) so returned links work on Vercel.
 */
export function publicSiteBaseUrl(req: Request): string {
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
