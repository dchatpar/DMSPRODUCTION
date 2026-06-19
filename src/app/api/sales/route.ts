// app/api/sales/route.ts
import { getCurrentUser, handleApiError } from "@/src/lib/auth-helpers";
import { supabase } from "@/src/lib/supabase";
import { NextRequest, NextResponse } from "next/server";


export async function GET(req: NextRequest) {
    try {
        const { user, error } = await getCurrentUser(req);
        if (error || !user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
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
                salesperson:users(id,full_name,email)
            `, { count: "exact" })
            .order("created_at", { ascending: false })
            .range(offset, offset + limit - 1);

        if (status) query = query.eq("deal_status", status);

        const { data, error: dbError, count } = await query;

        if (dbError) throw dbError;

        return NextResponse.json({ data: data || [], count: count || 0, limit, offset });
    } catch (error) {
        const { error: msg, status } = handleApiError(error);
        return NextResponse.json({ error: msg }, { status });
    }
}

export async function POST(req: NextRequest) {
    try {
        const { user, error } = await getCurrentUser(req);
        if (error || !user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
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

        // ✅ Now TypeScript knows user is not null
        if (!payload.salesperson_id) {
            payload.salesperson_id = user.id;
        }

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
    } catch (error) {
        const { error: msg, status } = handleApiError(error);
        return NextResponse.json({ error: msg }, { status });
    }
}