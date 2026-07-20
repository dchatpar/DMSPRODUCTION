// app/api/platform/login-history/route.ts
import { createTokenClient } from "@/src/lib/server-token";
import { NextRequest, NextResponse } from "next/server";

// GET /api/platform/login-history - List login history (platform admin only)
export async function GET(req: NextRequest) {
    try {
        let supabase;

        try {
            supabase = createTokenClient(req);
        } catch (error: any) {
            if (error?.message === "MISSING_BEARER_TOKEN") {
                return NextResponse.json({ error: "Authorization token required" }, { status: 401 });
            }
            throw error;
        }

        const { data: { user }, error: authError } = await supabase.auth.getUser();
        if (authError || !user) {
            return NextResponse.json({ error: "Invalid or expired token" }, { status: 401 });
        }

        // Verify platform admin
        const { data: currentUser } = await supabase
            .from("users")
            .select("is_platform_admin")
            .eq("id", user.id)
            .single();

        if (!currentUser?.is_platform_admin) {
            return NextResponse.json({ error: "Unauthorized - Platform admin access required" }, { status: 403 });
        }

        const url = new URL(req.url);
        const limit = parseInt(url.searchParams.get("limit") || "50");
        const offset = parseInt(url.searchParams.get("offset") || "0");
        const userId = url.searchParams.get("user_id");
        const success = url.searchParams.get("success");
        const ipAddress = url.searchParams.get("ip_address");
        const fromDate = url.searchParams.get("from_date");
        const toDate = url.searchParams.get("to_date");

        let query = supabase
            .from("login_history")
            .select("*", { count: "exact" })
            .order("login_at", { ascending: false })
            .range(offset, offset + limit - 1);

        if (userId) query = query.eq("user_id", userId);
        if (success !== null) query = query.eq("success", success === "true");
        if (ipAddress) query = query.eq("ip_address", ipAddress);
        if (fromDate) query = query.gte("login_at", fromDate);
        if (toDate) query = query.lte("login_at", toDate);

        const { data, error: dbError, count } = await query;

        if (dbError) throw dbError;

        return NextResponse.json({
            data: data || [],
            count: count || 0,
            limit,
            offset,
        });
    } catch (error: any) {
        console.error("Error fetching login history:", error);
        return NextResponse.json(
            { error: error?.message || "Internal server error" },
            { status: 500 }
        );
    }
}
