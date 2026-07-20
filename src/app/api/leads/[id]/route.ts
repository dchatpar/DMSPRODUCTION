// app/api/leads/[id]/route.ts
import { createTokenClient } from "@/src/lib/server-token";
import { NextRequest, NextResponse } from "next/server";

// GET single lead
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

        // Get user's profile
        const { data: currentUser } = await supabase
            .from("users")
            .select("role, dealership_id, is_platform_admin, user_permissions")
            .eq("id", user.id)
            .single();

        if (!currentUser) {
            return NextResponse.json({ error: "User profile not found" }, { status: 404 });
        }

        const { data: lead, error: dbError } = await supabase
            .from("leads")
            .select("*, dealership_id, assigned_to")
            .eq("id", id)
            .single();

        if (dbError || !lead) {
            if (dbError?.code === "PGRST116" || !lead) {
                return NextResponse.json({ error: "Lead not found" }, { status: 404 });
            }
            throw dbError;
        }

        // Check access: Admin/Manager/PlatformAdmin can view all
        // Others with leads:read (without :assigned) can view all
        // Others with leads:read:assigned can only view assigned leads
        // If user has neither permission, deny access
        const userPerms = currentUser.user_permissions || [];
        const isAdminOrManager = currentUser.is_platform_admin ||
            currentUser.role === "Admin" ||
            currentUser.role === "Manager";

        const hasFullRead = isAdminOrManager || userPerms.includes("leads:read");
        const hasAssignedOnly = userPerms.includes("leads:read:assigned") && !userPerms.includes("leads:read");

        // Deny if neither full read nor assigned-only permission
        if (!hasFullRead && !hasAssignedOnly) {
            return NextResponse.json({ error: "Access denied" }, { status: 403 });
        }

        // If has assigned-only permission, verify ownership
        if (hasAssignedOnly && lead.assigned_to !== user.id) {
            return NextResponse.json({ error: "Access denied - you can only view assigned leads" }, { status: 403 });
        }

        // Dealership check
        if (!currentUser.is_platform_admin && lead.dealership_id !== currentUser.dealership_id) {
            return NextResponse.json({ error: "Access denied" }, { status: 403 });
        }

        // Fetch full lead with relations
        const { data: fullLead } = await supabase
            .from("leads")
            .select(`
                *,
                customer:customers(*),
                vehicle:vehicles(*),
                assigned_user:users!assigned_to(id, full_name, email, avatar)
            `)
            .eq("id", id)
            .single();

        return NextResponse.json({ data: fullLead });
    } catch (error: any) {
        console.error("Error fetching lead:", error);
        return NextResponse.json(
            { error: error?.message || "Internal server error" },
            { status: 500 }
        );
    }
}

// PUT update lead (full update)
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
        const required = ["customer_id"];
        for (const field of required) {
            if (!payload[field]) {
                return NextResponse.json(
                    { error: `Missing required field: ${field}` },
                    { status: 400 }
                );
            }
        }

        // Validate source if provided
        const validSources = ['Website', 'Referral', 'Event', 'Walk-in', 'Facebook', 'Craigslist', 'Kijiji', 'Phone'];
        if (payload.source && !validSources.includes(payload.source)) {
            return NextResponse.json(
                { error: `Invalid source. Must be one of: ${validSources.join(', ')}` },
                { status: 400 }
            );
        }

        // Validate status if provided
        const validStatuses = ['Not Started', 'In Progress', 'Qualified', 'Closed', 'Lost'];
        if (payload.status && !validStatuses.includes(payload.status)) {
            return NextResponse.json(
                { error: `Invalid status. Must be one of: ${validStatuses.join(', ')}` },
                { status: 400 }
            );
        }

        // Update last_engagement if status is changing
        const updateData = {
            customer_id: payload.customer_id,
            source: payload.source,
            status: payload.status,
            interest_vehicle_id: payload.interest_vehicle_id || null,
            assigned_to: payload.assigned_to || null,
            notes: payload.notes || null,
            last_engagement: new Date().toISOString(),
            updated_at: new Date().toISOString(),
        };

        const { data, error: dbError } = await supabase
            .from("leads")
            .update(updateData)
            .eq("id", id)
            .select(`
                *,
                customer:customers(*),
                vehicle:vehicles(*),
                assigned_user:users!assigned_to(id, full_name, email, avatar)
            `)
            .single();

        if (dbError) {
            if (dbError.code === "PGRST116") {
                return NextResponse.json(
                    { error: "Lead not found" },
                    { status: 404 }
                );
            }
            throw dbError;
        }

        return NextResponse.json({ data });
    } catch (error: any) {
        console.error("Error updating lead:", error);
        return NextResponse.json(
            { error: error?.message || "Internal server error" },
            { status: 500 }
        );
    }
}

// PATCH update lead (partial update)
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
        const userPermissions = currentUser.user_permissions || [];
        const isPlatformAdmin = currentUser.is_platform_admin;
        const canAssign = isPlatformAdmin || userRole === "Admin" || userRole === "Manager" || userPermissions.includes("leads:assign");

        const { id } = await params;
        const payload = await req.json();

        // If changing assigned_to, require leads:assign permission
        if (payload.assigned_to !== undefined && !canAssign) {
            return NextResponse.json(
                { error: "Forbidden - You need leads:assign permission to reassign leads" },
                { status: 403 }
            );
        }

        // Allowed fields for update
        const allowedFields = ["customer_id", "source", "status", "interest_vehicle_id", "assigned_to", "notes"];
        const updateFields = Object.keys(payload).filter(key => allowedFields.includes(key));

        if (updateFields.length === 0) {
            return NextResponse.json(
                { error: "No valid fields to update" },
                { status: 400 }
            );
        }

        // Validate source if provided
        const validSources = ['Website', 'Referral', 'Event', 'Walk-in', 'Facebook', 'Craigslist', 'Kijiji', 'Phone'];
        if (payload.source && !validSources.includes(payload.source)) {
            return NextResponse.json(
                { error: `Invalid source. Must be one of: ${validSources.join(', ')}` },
                { status: 400 }
            );
        }

        // Validate status if provided
        const validStatuses = ['Not Started', 'In Progress', 'Qualified', 'Closed', 'Lost'];
        if (payload.status && !validStatuses.includes(payload.status)) {
            return NextResponse.json(
                { error: `Invalid status. Must be one of: ${validStatuses.join(', ')}` },
                { status: 400 }
            );
        }

        // Build update data
        const updateData: any = { updated_at: new Date().toISOString() };

        // Only include fields that are provided
        if (payload.customer_id !== undefined) updateData.customer_id = payload.customer_id;
        if (payload.source !== undefined) updateData.source = payload.source;
        if (payload.status !== undefined) updateData.status = payload.status;
        if (payload.interest_vehicle_id !== undefined) updateData.interest_vehicle_id = payload.interest_vehicle_id;
        if (payload.assigned_to !== undefined) updateData.assigned_to = payload.assigned_to;
        if (payload.notes !== undefined) updateData.notes = payload.notes;

        // Always update last_engagement when status changes or any update
        updateData.last_engagement = new Date().toISOString();

        const { data, error: dbError } = await supabase
            .from("leads")
            .update(updateData)
            .eq("id", id)
            .select(`
                *,
                customer:customers(*),
                vehicle:vehicles(*),
                assigned_user:users!assigned_to(id, full_name, email, avatar)
            `)
            .single();

        if (dbError) {
            if (dbError.code === "PGRST116") {
                return NextResponse.json(
                    { error: "Lead not found" },
                    { status: 404 }
                );
            }
            throw dbError;
        }

        return NextResponse.json({ data });
    } catch (error: any) {
        console.error("Error updating lead:", error);
        return NextResponse.json(
            { error: error?.message || "Internal server error" },
            { status: 500 }
        );
    }
}

// DELETE lead
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

        // Check leads:delete permission
        const canDelete = isPlatformAdmin ||
            userRole === "Admin" ||
            userRole === "Manager" ||
            userPerms.includes("leads:delete") ||
            userPerms.includes("*");

        if (!canDelete) {
            return NextResponse.json(
                { error: "Forbidden - You need leads:delete permission to delete leads" },
                { status: 403 }
            );
        }

        const { id } = await params;

        const { error: dbError } = await supabase
            .from("leads")
            .delete()
            .eq("id", id);

        if (dbError) {
            if (dbError.code === "PGRST116") {
                return NextResponse.json(
                    { error: "Lead not found" },
                    { status: 404 }
                );
            }
            throw dbError;
        }

        return NextResponse.json({
            success: true,
            message: "Lead deleted successfully"
        });
    } catch (error: any) {
        console.error("Error deleting lead:", error);
        return NextResponse.json(
            { error: error?.message || "Internal server error" },
            { status: 500 }
        );
    }
}