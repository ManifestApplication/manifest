import { createClient } from '@supabase/supabase-js'
import type { Database } from './database.types'

// Local stack values (from `supabase start`). The publishable key is safe to
// embed — it's bound by RLS, exactly like a browser would use it.
const SUPABASE_URL = 'http://127.0.0.1:54321'
const PUBLISHABLE_KEY = 'sb_publishable_ACJWlzQHlZjBrEguHvfOxg_3BJgxAaH'

// <Database> is what makes every query below type-aware.
const supabase = createClient<Database>(SUPABASE_URL, PUBLISHABLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
})

async function main() {
    // 1) Not logged in. RLS has no auth.uid() to match → expect ZERO rows.
    const anon = await supabase.from('orders').select('id, total, status')
    console.log('① anonymous sees orders:', anon.data?.length ?? 0)

    // 2) Log in as Warung A. The client now holds her token and attaches it
    //    to every request, so auth.uid() becomes her id.
    const { error } = await supabase.auth.signInWithPassword({
        email: '',
        password: '',
    })
    if (error) throw error

    // 3) Same query, now authenticated → RLS returns ONLY Warung A's order.
    const mine = await supabase.from('orders').select('id, total, status')
    console.log('② warungA sees orders:', mine.data)
}

main()
