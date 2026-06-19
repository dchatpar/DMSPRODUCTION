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

    // Get session
    const { data: { session } } = await supabase.auth.getSession();

    // Define protected routes
    const isProtectedRoute = req.nextUrl.pathname.startsWith("/dashboard");
    const isAuthRoute = req.nextUrl.pathname === "/login";

    if (isProtectedRoute && !session) {
        // Redirect to login if trying to access protected route without session
        const redirectUrl = new URL("/login", req.url);
        return NextResponse.redirect(redirectUrl);
    }

    if (isAuthRoute && session) {
        // Redirect to dashboard if already logged in and trying to access login
        const redirectUrl = new URL("/dashboard", req.url);
        return NextResponse.redirect(redirectUrl);
    }

    return res;
}

export const config = {
    matcher: ["/dashboard/:path*", "/login"],
};