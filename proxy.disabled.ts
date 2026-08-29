import { type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/proxy";

export async function proxy(request: NextRequest) {
  return await updateSession(request);
}

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/activity/:path*",
    "/sessions/:path*",
    "/insights/:path*",
    "/quick-add/:path*",
    "/profile/:path*",
    "/accounts/:path*",
    "/reports/:path*",
  ],
};