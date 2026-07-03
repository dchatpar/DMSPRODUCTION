// app/api/test-drives/route.ts
import { createTokenClient } from "@/src/lib/server-token";
import { NextRequest, NextResponse } from "next/server";

// GET all test drives
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
        const vehicle_id = url.searchParams.get("vehicle_id");
        const q = url.searchParams.get("q");

        let query = supabase
            .from("test_drives")
            .select(`
                *,
                customer:customers(
                    id, 
                    name, 
                    email, 
                    phone
                ),
                lead:leads(
                    id, 
                    source, 
                    status, 
                    customer:customers(
                        id, 
                        name, 
                        email, 
                        phone
                    )
                ),
                vehicle:vehicles(
                    id, 
                    make, 
                    model, 
                    year, 
                    vin, 
                    stock_number
                ),
                salesperson:users(
                    id, 
                    full_name, 
                    email
                )
            `, { count: "exact" })
            .order("start_time", { ascending: false })
            .range(offset, offset + limit - 1);

        if (status) query = query.eq("status", status);
        if (vehicle_id) query = query.eq("vehicle_id", vehicle_id);
        if (q) {
            // Search on direct columns AND via FK lookups (two-step approach)
            // Step 1: Find matching customer IDs
            const { data: matchingCustomers } = await supabase
                .from("customers")
                .select("id")
                .or(`name.ilike.%${q}%,email.ilike.%${q}%,phone.ilike.%${q}%`);

            const customerIds = matchingCustomers?.map(c => c.id) || [];

            // Step 2: Find matching vehicle IDs (make/model/vin search)
            const { data: matchingVehicles } = await supabase
                .from("vehicles")
                .select("id")
                .or(`make.ilike.%${q}%,model.ilike.%${q}%,vin.ilike.%${q}%,stock_number.ilike.%${q}%`);

            const vehicleIds = matchingVehicles?.map(v => v.id) || [];

            // Apply search - direct columns OR customer match OR vehicle match
            query = query.or(
                `notes.ilike.%${q}%,status.ilike.%${q}%,driver_license_number.ilike.%${q}%` +
                (customerIds.length > 0 ? `,customer_id.in.(${customerIds.join(',')})` : '') +
                (vehicleIds.length > 0 ? `,vehicle_id.in.(${vehicleIds.join(',')})` : '')
            );
        }

        const { data, error: dbError, count } = await query;

        if (dbError) throw dbError;

        return NextResponse.json({
            data: data || [],
            count: count || 0,
            limit,
            offset,
        });
    } catch (error: any) {
        console.error("Error fetching test drives:", error);
        return NextResponse.json(
            { error: error?.message || "Internal server error" },
            { status: 500 }
        );
    }
}

// POST create test drive
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
        const required = ["vehicle_id", "driver_license_number", "driver_license_expiry", "start_time"];
        for (const field of required) {
            if (!payload[field]) {
                return NextResponse.json(
                    { error: `Missing required field: ${field}` },
                    { status: 400 }
                );
            }
        }

        // Validate that either customer_id or lead_id is provided (not both)
        const hasCustomer = !!payload.customer_id;
        const hasLead = !!payload.lead_id;

        if (!hasCustomer && !hasLead) {
            return NextResponse.json(
                { error: "Either customer_id or lead_id is required" },
                { status: 400 }
            );
        }

        if (hasCustomer && hasLead) {
            return NextResponse.json(
                { error: "Cannot provide both customer_id and lead_id. Please provide only one." },
                { status: 400 }
            );
        }

        // Validate date/time
        const startTime = new Date(payload.start_time);
        if (isNaN(startTime.getTime())) {
            return NextResponse.json(
                { error: "Invalid start_time format" },
                { status: 400 }
            );
        }

        if (payload.end_time) {
            const endTime = new Date(payload.end_time);
            if (isNaN(endTime.getTime())) {
                return NextResponse.json(
                    { error: "Invalid end_time format" },
                    { status: 400 }
                );
            }
            if (endTime < startTime) {
                return NextResponse.json(
                    { error: "end_time must be after start_time" },
                    { status: 400 }
                );
            }
        }

        // Validate driver license expiry
        const expiryDate = new Date(payload.driver_license_expiry);
        if (isNaN(expiryDate.getTime())) {
            return NextResponse.json(
                { error: "Invalid driver_license_expiry format" },
                { status: 400 }
            );
        }

        // Set salesperson_id if not provided
        const testDriveData = {
            ...payload,
            salesperson_id: payload.salesperson_id || user.id,
        };

        const { data, error: dbError } = await supabase
            .from("test_drives")
            .insert(testDriveData)
            .select(`
                *,
                customer:customers(
                    id, 
                    name, 
                    email, 
                    phone
                ),
                lead:leads(
                    id, 
                    source, 
                    status, 
                    customer:customers(
                        id, 
                        name, 
                        email, 
                        phone
                    )
                ),
                vehicle:vehicles(
                    id, 
                    make, 
                    model, 
                    year, 
                    vin, 
                    stock_number
                ),
                salesperson:users(
                    id, 
                    full_name, 
                    email
                )
            `)
            .single();

        if (dbError) {
            // Check for constraint violations
            if (dbError.code === "23514") {
                return NextResponse.json(
                    { error: "Validation error: Please check the data constraints" },
                    { status: 400 }
                );
            }
            throw dbError;
        }

        return NextResponse.json({ data }, { status: 201 });
    } catch (error: any) {
        console.error("Error creating test drive:", error);
        return NextResponse.json(
            { error: error?.message || "Internal server error" },
            { status: 500 }
        );
    }
}