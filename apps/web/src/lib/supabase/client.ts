import { createBrowserClient } from "@supabase/ssr";
import type { Database } from "./database.types";

// Used in Client Components ('use client'). Reads/writes the session cookie
// in the browser automatically.
export function createClient() {
    return createBrowserClient<Database>(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    );
}
