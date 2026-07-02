// app/api/customers/route.ts
import { createTokenClient } from "@/src/lib/server-token";
import { NextRequest, NextResponse } from "next/server";

// GET all customers
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
        const q = url.searchParams.get("q");
        const status = url.searchParams.get("status");
        const distinctStatus = url.searchParams.get("distinct_status");

        // If requesting distinct status values, return them from database
        if (distinctStatus === "true") {
            const { data, error: dbError } = await supabase
                .from("customers")
                .select("status")
                .not("status", "is", null);

            if (dbError) throw dbError;

            // Get unique statuses
            const uniqueStatuses = [...new Set(data?.map((c: any) => c.status).filter(Boolean) || [])];
            return NextResponse.json({ data: uniqueStatuses });
        }

        let query = supabase
            .from("customers")
            .select("*", { count: "exact" })
            .order("created_at", { ascending: false })
            .range(offset, offset + limit - 1);

        if (status) query = query.eq("status", status);
        if (q) query = query.or(`name.ilike.%${q}%,phone.ilike.%${q}%,email.ilike.%${q}%`);

        const { data, error: dbError, count } = await query;

        if (dbError) throw dbError;

        return NextResponse.json({
            data: data || [],
            count: count || 0,
            limit,
            offset,
        });
    } catch (error: any) {
        console.error("Error fetching customers:", error);
        return NextResponse.json(
            { error: error?.message || "Internal server error" },
            { status: 500 }
        );
    }
}

// POST create customer
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

        // Validate required fields
        const required = ["name"];
        for (const field of required) {
            if (!payload[field]) {
                return NextResponse.json(
                    { error: `Missing required field: ${field}` },
                    { status: 400 }
                );
            }
        }

        // Optional fields validation
        if (payload.email) {
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (!emailRegex.test(payload.email)) {
                return NextResponse.json(
                    { error: "Invalid email format" },
                    { status: 400 }
                );
            }
        }

        const { data, error: dbError } = await supabase
            .from("customers")
            .insert(payload)
            .select()
            .single();

        if (dbError) throw dbError;

        return NextResponse.json({ data }, { status: 201 });
    } catch (error: any) {
        console.error("Error creating customer:", error);
        return NextResponse.json(
            { error: error?.message || "Internal server error" },
            { status: 500 }
        );
    }
}