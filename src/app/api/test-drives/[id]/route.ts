// app/api/test-drives/[id]/route.ts
import { createTokenClient } from "@/src/lib/server-token";
import { NextRequest, NextResponse } from "next/server";

// GET single test drive
export async function GET(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
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

        const { id } = await params;

        const { data, error: dbError } = await supabase
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
            `)
            .eq("id", id)
            .single();

        if (dbError) {
            if (dbError.code === "PGRST116") {
                return NextResponse.json(
                    { error: "Test drive not found" },
                    { status: 404 }
                );
            }
            throw dbError;
        }

        return NextResponse.json({ data });
    } catch (error: any) {
        console.error("Error fetching test drive:", error);
        return NextResponse.json(
            { error: error?.message || "Internal server error" },
            { status: 500 }
        );
    }
}

// PUT update test drive (full update)
export async function PUT(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
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

        const { id } = await params;
        const payload = await req.json();

        // Validate required fields for full update
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

        const { data, error: dbError } = await supabase
            .from("test_drives")
            .update(payload)
            .eq("id", id)
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
            if (dbError.code === "PGRST116") {
                return NextResponse.json(
                    { error: "Test drive not found" },
                    { status: 404 }
                );
            }
            throw dbError;
        }

        return NextResponse.json({ data });
    } catch (error: any) {
        console.error("Error updating test drive:", error);
        return NextResponse.json(
            { error: error?.message || "Internal server error" },
            { status: 500 }
        );
    }
}

// PATCH update test drive (partial update)
export async function PATCH(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
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

        const { id } = await params;
        const payload = await req.json();

        // Allowed fields for update
        const allowedFields = [
            "customer_id", "lead_id", "vehicle_id", "driver_license_number",
            "driver_license_expiry", "driver_license_image_url", "signature_image_url",
            "start_time", "end_time", "salesperson_id", "notes", "status"
        ];
        const updateFields = Object.keys(payload).filter(key => allowedFields.includes(key));

        if (updateFields.length === 0) {
            return NextResponse.json(
                { error: "No valid fields to update" },
                { status: 400 }
            );
        }

        // If both customer_id and lead_id are being updated, validate
        if (payload.customer_id && payload.lead_id) {
            return NextResponse.json(
                { error: "Cannot provide both customer_id and lead_id. Please provide only one." },
                { status: 400 }
            );
        }

        // Validate date/time if provided
        if (payload.start_time) {
            const startTime = new Date(payload.start_time);
            if (isNaN(startTime.getTime())) {
                return NextResponse.json(
                    { error: "Invalid start_time format" },
                    { status: 400 }
                );
            }
        }

        if (payload.end_time) {
            const endTime = new Date(payload.end_time);
            if (isNaN(endTime.getTime())) {
                return NextResponse.json(
                    { error: "Invalid end_time format" },
                    { status: 400 }
                );
            }
        }

        const { data, error: dbError } = await supabase
            .from("test_drives")
            .update(payload)
            .eq("id", id)
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
            if (dbError.code === "PGRST116") {
                return NextResponse.json(
                    { error: "Test drive not found" },
                    { status: 404 }
                );
            }
            throw dbError;
        }

        return NextResponse.json({ data });
    } catch (error: any) {
        console.error("Error updating test drive:", error);
        return NextResponse.json(
            { error: error?.message || "Internal server error" },
            { status: 500 }
        );
    }
}

// DELETE test drive
export async function DELETE(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
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

        const { id } = await params;

        const { error: dbError } = await supabase
            .from("test_drives")
            .delete()
            .eq("id", id);

        if (dbError) {
            if (dbError.code === "PGRST116") {
                return NextResponse.json(
                    { error: "Test drive not found" },
                    { status: 404 }
                );
            }
            throw dbError;
        }

        return NextResponse.json({
            success: true,
            message: "Test drive deleted successfully"
        });
    } catch (error: any) {
        console.error("Error deleting test drive:", error);
        return NextResponse.json(
            { error: error?.message || "Internal server error" },
            { status: 500 }
        );
    }
}