import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import type { Database } from "./database.types";
import { serverSupabaseUrl } from "./url";

// Used in Server Components / route handlers. Reads the session from the
// request's cookies, so RLS knows who's logged in — server-side.
export async function createClient() {
    const cookieStore = await cookies();
    return createServerClient<Database>(
        serverSupabaseUrl(),
        process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
        {
            cookies: {
                getAll() {
                    return cookieStore.getAll();
                },
                setAll(cookiesToSet) {
                    try {
                        cookiesToSet.forEach(({ name, value, options }) =>
                            cookieStore.set(name, value, options),
                        );
                    } catch {
                        // Called from a Server Component (read-only cookies) — safe to ignore;
                        // the middleware (added later) handles refreshing the session.
                    }
                },
            },
        },
    );
}
