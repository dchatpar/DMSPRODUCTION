// app/api/vehicles/public/route.ts
import { createClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";

// Initialize Supabase with ANON key (public access)
const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

// GET active vehicles (public - no auth required)
export async function GET(req: NextRequest) {
    try {
        const url = new URL(req.url);
        const limit = parseInt(url.searchParams.get("limit") || "50");
        const offset = parseInt(url.searchParams.get("offset") || "0");
        const make = url.searchParams.get("make");
        const model = url.searchParams.get("model");
        const q = url.searchParams.get("q");

        // Build query - ONLY ACTIVE vehicles
        let query = supabase
            .from("vehicles")
            .select("*", { count: "exact" })
            .eq("status", "Active")  // IMPORTANT: Only active vehicles
            .order("created_at", { ascending: false })
            .range(offset, offset + limit - 1);

        // Optional filters (only if provided)
        if (make) query = query.eq("make", make);
        if (model) query = query.eq("model", model);
        if (q) query = query.or(`vin.ilike.%${q}%,make.ilike.%${q}%,model.ilike.%${q}%,stock_number.ilike.%${q}%`);

        const { data, error: dbError, count } = await query;

        if (dbError) throw dbError;

        return NextResponse.json({
            data: data || [],
            count: count || 0,
            limit,
            offset,
        });
    } catch (error: any) {
        console.error("Error fetching public vehicles:", error);
        return NextResponse.json(
            { error: error?.message || "Internal server error" },
            { status: 500 }
        );
    }
}