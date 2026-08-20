import { createClient } from "@supabase/supabase-js";
export function getSupabase() {
    const url = process.env.SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!url || !key)
        return null;
    return createClient(url, key, {
        auth: { persistSession: false },
    });
}
