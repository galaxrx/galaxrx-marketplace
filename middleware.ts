import { withAuth } from "next-auth/middleware";

export default withAuth({
  callbacks: {
    authorized: ({ token, req }) => {
      const path = req.nextUrl.pathname;
      if (path.startsWith("/admin")) return token?.role === "ADMIN";
      if (path.startsWith("/dashboard") || path.startsWith("/buy") || path.startsWith("/sell") || path.startsWith("/my-listings") || path.startsWith("/clearance") || path.startsWith("/wanted") || path.startsWith("/orders") || path.startsWith("/messages") || path.startsWith("/settings") || path.startsWith("/forum")) return !!token;
      return true;
    },
  },
});

export const config = {
  matcher: ["/dashboard", "/dashboard/:path*", "/buy", "/buy/:path*", "/sell", "/my-listings", "/clearance", "/wanted", "/orders", "/messages/:path*", "/settings", "/forum", "/forum/:path*", "/admin", "/admin/:path*"],
};
