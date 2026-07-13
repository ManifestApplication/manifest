import { type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";

// Next.js 16 "proxy" convention (formerly "middleware"). Runs on every request
// matched below — here, to refresh the Supabase session cookie.
export async function proxy(request: NextRequest) {
  return await updateSession(request);
}

export const config = {
  // Run on every route EXCEPT Next's internal assets and static image files.
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
