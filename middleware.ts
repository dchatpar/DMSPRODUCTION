import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

export async function middleware(req: NextRequest) {
    const res = NextResponse.next();

    // Create a Supabase client for the middleware
    const supabase = createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
            cookies: {
                getAll() {
                    return req.cookies.getAll().map((cookie) => ({
                        name: cookie.name,
                        value: cookie.value,
                    }));
                },
                setAll(cookiesToSet) {
                    cookiesToSet.forEach(({ name, value, options }) => {
                        res.cookies.set(name, value, options);
                    });
                },
            },
        }
    );

    // Get session from cookies
    const { data: { session } } = await supabase.auth.getSession();

    // Also check Authorization header as fallback (from recent login)
    const authHeader = req.headers.get("authorization");
    const hasAuthHeader = authHeader?.startsWith("Bearer ");

    // Define protected routes
    const isProtectedRoute = req.nextUrl.pathname.startsWith("/dashboard");
    const isAuthRoute = req.nextUrl.pathname === "/login";
    const isApiRoute = req.nextUrl.pathname.startsWith("/api/");

    // Skip middleware for API routes - they handle auth separately
    if (isApiRoute) {
        return res;
    }

    // For protected routes: allow if session exists OR just logged in
    if (isProtectedRoute && !session && !hasAuthHeader) {
        const redirectUrl = new URL("/login", req.url);
        return NextResponse.redirect(redirectUrl);
    }

    // Redirect to dashboard if already logged in and accessing login
    if (isAuthRoute && session) {
        const redirectUrl = new URL("/dashboard", req.url);
        return NextResponse.redirect(redirectUrl);
    }

    return res;
}

export const config = {
    matcher: ["/dashboard/:path*", "/login"],
};