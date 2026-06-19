import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import type { NextRequest } from "next/server";

export async function createClient(req?: NextRequest) {
  // ✅ Add 'await' here
  const cookieStore = await cookies();

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

  const authHeader = req?.headers.get("authorization") || "";
  const hasBearer = /^Bearer\s+.+/i.test(authHeader);

  return createServerClient(supabaseUrl, supabaseAnonKey, {
    global: hasBearer
      ? {
        headers: { Authorization: authHeader },
      }
      : undefined,

    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options)
          );
        } catch { }
      },
    },
  });
}