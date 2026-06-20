// app/api/vehicles/route.ts
import { createTokenClient } from "@/src/lib/server-token";
import { NextRequest, NextResponse } from "next/server";


// GET all vehicles
export async function GET(req: NextRequest) {
    try {
        let supabase;

        try {
            supabase = createTokenClient(req);
        } catch (error: any) {
            if (error?.message === "MISSING_BEARER_TOKEN") {
                return NextResponse.json(
                    { error: "Authorization token required" },
                    { status: 401 }
                );
            }
            throw error;
        }

        // Verify user is authenticated
        const { data: { user }, error: authError } = await supabase.auth.getUser();

        if (authError || !user) {
            return NextResponse.json(
                { error: "Invalid or expired token" },
                { status: 401 }
            );
        }

        const url = new URL(req.url);
        const limit = parseInt(url.searchParams.get("limit") || "50");
        const offset = parseInt(url.searchParams.get("offset") || "0");
        const status = url.searchParams.get("status");
        const make = url.searchParams.get("make");
        const model = url.searchParams.get("model");
        const q = url.searchParams.get("q");

        let query = supabase
            .from("vehicles")
            .select("*", { count: "exact" })
            .order("created_at", { ascending: false })
            .range(offset, offset + limit - 1);

        if (status) query = query.eq("status", status);
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
        console.error("Error fetching vehicles:", error);
        return NextResponse.json(
            { error: error?.message || "Internal server error" },
            { status: 500 }
        );
    }
}

// POST create vehicle
export async function POST(req: NextRequest) {
    try {
        let supabase;

        try {
            supabase = createTokenClient(req);
        } catch (error: any) {
            if (error?.message === "MISSING_BEARER_TOKEN") {
                return NextResponse.json(
                    { error: "Authorization token required" },
                    { status: 401 }
                );
            }
            throw error;
        }

        // Verify user is authenticated
        const { data: { user }, error: authError } = await supabase.auth.getUser();

        if (authError || !user) {
            return NextResponse.json(
                { error: "Invalid or expired token" },
                { status: 401 }
            );
        }

        const payload = await req.json();
        const required = ["vin", "year", "make", "model", "purchase_price", "retail_price", "condition"];

        for (const field of required) {
            if (!payload[field]) {
                return NextResponse.json(
                    { error: `Missing required field: ${field}` },
                    { status: 400 }
                );
            }
        }

        // Check for duplicate stock_number if provided
        if (payload.stock_number) {
            const { data: existing } = await supabase
                .from("vehicles")
                .select("id, stock_number")
                .eq("stock_number", payload.stock_number)
                .single();

            if (existing) {
                return NextResponse.json(
                    { error: `Stock number "${payload.stock_number}" is already used by another vehicle` },
                    { status: 400 }
                );
            }
        }

        const { data, error: dbError } = await supabase
            .from("vehicles")
            .insert(payload)
            .select()
            .single();

        if (dbError) {
            if (dbError.code === "23505") {
                return NextResponse.json(
                    { error: "A vehicle with this stock number or VIN already exists" },
                    { status: 400 }
                );
            }
            throw dbError;
        }

        return NextResponse.json({ data }, { status: 201 });
    } catch (error: any) {
        console.error("Error creating vehicle:", error);
        return NextResponse.json(
            { error: error?.message || "Internal server error" },
            { status: 500 }
        );
    }
}