// app/api/sales/route.ts
import { createTokenClient } from "@/src/lib/server-token";
import { NextRequest, NextResponse } from "next/server";


export async function GET(req: NextRequest) {
    try {
        let supabase;
        try {
            supabase = createTokenClient(req);
        } catch (error: unknown) {
            if (error instanceof Error && error.message === "MISSING_BEARER_TOKEN") {
                return NextResponse.json({ error: "Authorization token required" }, { status: 401 });
            }
            throw error;
        }

        const { data: { user }, error: authError } = await supabase.auth.getUser();
        if (authError || !user) {
            return NextResponse.json({ error: "Invalid or expired token" }, { status: 401 });
        }

        const { data: currentUser } = await supabase
            .from("users")
            .select("dealership_id, is_platform_admin")
            .eq("id", user.id)
            .single();

        if (!currentUser) {
            return NextResponse.json({ error: "User profile not found" }, { status: 404 });
        }

        const url = new URL(req.url);
        const limit = parseInt(url.searchParams.get("limit") || "50");
        const offset = parseInt(url.searchParams.get("offset") || "0");
        const status = url.searchParams.get("status");

        let query = supabase
            .from("sales_deals")
            .select(`
                *,
                vehicle:vehicles(*),
                customer:customers(*),
                salesperson:users!sales_deals_salesperson_id_fkey(id,full_name,email)
            `, { count: "exact" })
            .order("created_at", { ascending: false })
            .range(offset, offset + limit - 1);

        // Filter by dealership unless platform admin
        if (!currentUser.is_platform_admin) {
            if (!currentUser.dealership_id) {
                return NextResponse.json({ error: "No dealership context" }, { status: 403 });
            }
            query = query.eq("dealership_id", currentUser.dealership_id);
        }

        if (status) query = query.eq("deal_status", status);

        const { data, error: dbError, count } = await query;

        if (dbError) throw dbError;

        return NextResponse.json({ data: data || [], count: count || 0, limit, offset });
    } catch (error: unknown) {
        console.error("Error fetching sales deals:", error);
        return NextResponse.json(
            { error: error instanceof Error ? error.message : "Internal server error" },
            { status: 500 }
        );
    }
}

export async function POST(req: NextRequest) {
    try {
        let supabase;
        try {
            supabase = createTokenClient(req);
        } catch (error: unknown) {
            if (error instanceof Error && error.message === "MISSING_BEARER_TOKEN") {
                return NextResponse.json({ error: "Authorization token required" }, { status: 401 });
            }
            throw error;
        }

        const { data: { user }, error: authError } = await supabase.auth.getUser();
        if (authError || !user) {
            return NextResponse.json({ error: "Invalid or expired token" }, { status: 401 });
        }

        const { data: currentUser } = await supabase
            .from("users")
            .select("dealership_id, is_platform_admin")
            .eq("id", user.id)
            .single();

        if (!currentUser) {
            return NextResponse.json({ error: "User profile not found" }, { status: 404 });
        }

        const payload = await req.json();
        const required = ["vehicle_id", "customer_id", "sale_price"];

        for (const field of required) {
            if (!payload[field]) {
                return NextResponse.json(
                    { error: `Missing required field: ${field}` },
                    { status: 400 }
                );
            }
        }

        // Set defaults
        payload.deal_date = payload.deal_date || new Date().toISOString().split("T")[0];
        payload.down_payment = payload.down_payment || 0;

        if (!payload.salesperson_id) {
            payload.salesperson_id = user.id;
        }

        // Bind to caller's dealership
        payload.dealership_id = currentUser.dealership_id;

        const { data, error: dbError } = await supabase
            .from("sales_deals")
            .insert(payload)
            .select()
            .single();

        if (dbError) throw dbError;

        // Update vehicle status to Sold
        await supabase
            .from("vehicles")
            .update({ status: "Sold" })
            .eq("id", payload.vehicle_id);

        return NextResponse.json({ data }, { status: 201 });
    } catch (error: unknown) {
        console.error("Error creating sales deal:", error);
        return NextResponse.json(
            { error: error instanceof Error ? error.message : "Internal server error" },
            { status: 500 }
        );
    }
}