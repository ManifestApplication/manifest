// The Supabase API URL to use from *server-side* code (Server Components, route
// handlers, the session-refresh proxy). Normally this is the same public URL the
// browser uses. But when the web app runs inside a container while the Supabase
// stack runs on the host (local Docker dev), the browser reaches Supabase at
// `127.0.0.1:54321` while the container must reach the host at
// `host.docker.internal:54321`. Setting SUPABASE_INTERNAL_URL bridges that gap.
//
// Unset (the normal case: `pnpm dev` on the host, or cloud deploys) => falls
// back to NEXT_PUBLIC_SUPABASE_URL, so behaviour is unchanged everywhere else.
export function serverSupabaseUrl(): string {
    return (
        process.env.SUPABASE_INTERNAL_URL ??
        process.env.NEXT_PUBLIC_SUPABASE_URL!
    );
}
