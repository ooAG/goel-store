import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

async function generateWebSHA256(message: string) {
  const msgBuffer = new TextEncoder().encode(message);
  const hashBuffer = await crypto.subtle.digest("SHA-256", msgBuffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, "0")).join("");
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const method = request.method;

  // 1. Pass-through for assets, logins, and bundle tracks
  if (pathname === "/admin/login" || pathname === "/api/admin/auth" || pathname.startsWith("/_next") || pathname.includes(".")) {
    return NextResponse.next();
  }

  // 2. Allow customer-facing order creation (POST) — no auth needed
  if (pathname.startsWith("/api/orders") && method === "POST") {
    return NextResponse.next();
  }

  // 3. Auth check for admin pages, order GETs, and order PATCHes (admin-only actions)
  if (pathname === "/admin" || pathname.startsWith("/admin/") || pathname.startsWith("/api/orders")) {
    const token = request.cookies.get("admin_token")?.value;
    
    const envPassword = process.env.ADMIN_PASSWORD || "jeetu@31";
    const expectedToken = await generateWebSHA256(envPassword + "-goel-store-admin-session");

    if (!token || token !== expectedToken) {
      // For PATCH from customer UPI flow (CHANGE_QR, CONVERT_TO_COD), allow through
      if (method === "PATCH") {
        try {
          const body = await request.clone().json();
          const allowedCustomerActions = ["CHANGE_QR", "CONVERT_TO_COD", "CANCEL_ORDER"];
          if (allowedCustomerActions.includes(body.action)) {
            return NextResponse.next();
          }
        } catch (e) {
          // If body parse fails, block request
        }
      }

      if (pathname.startsWith("/api/")) {
        return NextResponse.json({ error: "Admin login zaroori hai." }, { status: 401 });
      }
      return NextResponse.redirect(new URL("/admin/login", request.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/admin", "/admin/:path*", "/api/orders/:path*"],
};
