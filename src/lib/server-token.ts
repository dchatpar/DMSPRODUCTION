import { createServerClient } from "@supabase/ssr";
import type { NextRequest } from "next/server";

export function createTokenClient(req: NextRequest) {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

    const authHeader = req.headers.get("authorization") || "";

    if (!/^Bearer\s+.+/i.test(authHeader)) {
        throw new Error("MISSING_BEARER_TOKEN");
    }

    return createServerClient(supabaseUrl, supabaseAnonKey, {
        global: {
            headers: { Authorization: authHeader },
        },
        cookies: {
            getAll() {
                return [];
            },
            setAll() { },
        },
    });
}
