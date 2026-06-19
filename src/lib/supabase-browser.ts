import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

// Browser client with proper session persistence for both dev and production
export const supabaseBrowser = createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
        storageKey: "sb-auth-token",
        storage: typeof window !== "undefined" ? window.localStorage : undefined,
    },
    global: {
        headers: {
            "User-Agent": `dms-client`,
        },
    },
});

// Ensure session is synced on app load
if (typeof window !== "undefined") {
    supabaseBrowser.auth.getSession();
}
