// app/api/test-drives/[id]/route.ts
import { createTokenClient } from "@/src/lib/server-token";
import { NextRequest, NextResponse } from "next/server";

// Helper function to enrich a test drive with related data
async function enrichTestDrive(supabase: any, testDrive: any) {
    const [customerData, leadData, vehicleData, userData] = await Promise.all([
        testDrive.customer_id
            ? supabase.from("customers").select("id, name, email, phone").eq("id", testDrive.customer_id).single()
            : { data: null },
        testDrive.lead_id
            ? supabase.from("leads").select("id, source, status").eq("id", testDrive.lead_id).single()
            : { data: null },
        testDrive.vehicle_id
            ? supabase.from("vehicles").select("id, make, model, year, vin, stock_number").eq("id", testDrive.vehicle_id).single()
            : { data: null },
        testDrive.user_id
            ? supabase.from("users").select("id, full_name, email").eq("id", testDrive.user_id).single()
            : { data: null },
    ]);

    return {
        ...testDrive,
        customer: customerData.data,
        lead: leadData.data,
        vehicle: vehicleData.data,
        salesperson: userData.data,
    };
}

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

        const { data: { user }, error: authError } = await supabase.auth.getUser();

        if (authError || !user) {
            return NextResponse.json(
                { error: "Invalid or expired token" },
                { status: 401 }
            );
        }

        const { id } = await params;

        const { data: testDrive, error: dbError } = await supabase
            .from("test_drives")
            .select("*")
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

        const enriched = await enrichTestDrive(supabase, testDrive);

        return NextResponse.json({ data: enriched });
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

        const { data: { user }, error: authError } = await supabase.auth.getUser();

        if (authError || !user) {
            return NextResponse.json(
                { error: "Invalid or expired token" },
                { status: 401 }
            );
        }

        const { id } = await params;
        const payload = await req.json();

        // Validate required fields for full update - use actual schema columns
        const required = ["vehicle_id", "scheduled_date"];
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

        // Build update data - use actual schema column names
        const updateData = {
            vehicle_id: payload.vehicle_id,
            customer_id: payload.customer_id || null,
            lead_id: payload.lead_id || null,
            user_id: payload.user_id || null,
            scheduled_date: payload.scheduled_date,
            status: payload.status || "Scheduled",
            notes: payload.notes || null,
            outcome: payload.outcome || null,
        };

        const { data: updatedTestDrive, error: dbError } = await supabase
            .from("test_drives")
            .update(updateData)
            .eq("id", id)
            .select("*")
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

        const enriched = await enrichTestDrive(supabase, updatedTestDrive);

        return NextResponse.json({ data: enriched });
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

        const { data: { user }, error: authError } = await supabase.auth.getUser();

        if (authError || !user) {
            return NextResponse.json(
                { error: "Invalid or expired token" },
                { status: 401 }
            );
        }

        const { id } = await params;
        const payload = await req.json();

        // Allowed fields for update - use actual schema column names
        const allowedFields = [
            "customer_id", "lead_id", "vehicle_id", "user_id",
            "scheduled_date", "notes", "outcome", "status"
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

        // Build update object
        const updateData: Record<string, any> = {};
        for (const field of updateFields) {
            updateData[field] = payload[field];
        }

        const { data: updatedTestDrive, error: dbError } = await supabase
            .from("test_drives")
            .update(updateData)
            .eq("id", id)
            .select("*")
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

        const enriched = await enrichTestDrive(supabase, updatedTestDrive);

        return NextResponse.json({ data: enriched });
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

        const { data: { user }, error: authError } = await supabase.auth.getUser();

        if (authError || !user) {
            return NextResponse.json(
                { error: "Invalid or expired token" },
                { status: 401 }
            );
        }

        // Get current user's permissions
        const { data: currentUser } = await supabase
            .from("users")
            .select("role, dealership_id, is_platform_admin, user_permissions")
            .eq("id", user.id)
            .single();

        if (!currentUser) {
            return NextResponse.json({ error: "User profile not found" }, { status: 404 });
        }

        const userRole = currentUser.role;
        const userPerms = currentUser.user_permissions || [];
        const isPlatformAdmin = currentUser.is_platform_admin;

        // Check test_drives:delete permission
        const canDelete = isPlatformAdmin ||
            userRole === "Admin" ||
            userRole === "Manager" ||
            userPerms.includes("test_drives:delete") ||
            userPerms.includes("*");

        if (!canDelete) {
            return NextResponse.json(
                { error: "Forbidden - You need test_drives:delete permission to delete test drives" },
                { status: 403 }
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
