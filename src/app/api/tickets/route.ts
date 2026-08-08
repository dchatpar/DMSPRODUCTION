// app/api/tickets/route.ts
import { createTokenClient } from "@/src/lib/server-token";
import { NextRequest, NextResponse } from "next/server";

// GET all tickets
export async function GET(req: NextRequest) {
    try {
        let supabase;

        try {
            supabase = createTokenClient(req);
        } catch (error: unknown) {
            if (error instanceof Error && error.message === "MISSING_BEARER_TOKEN") {
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

        // Get user profile
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

        const url = new URL(req.url);
        const limit = parseInt(url.searchParams.get("limit") || "50");
        const offset = parseInt(url.searchParams.get("offset") || "0");
        const status = url.searchParams.get("status");
        const priority = url.searchParams.get("priority");
        const assigned_to = url.searchParams.get("assigned_to");
        const q = url.searchParams.get("q");
        const createdAtFrom = url.searchParams.get("created_at_from");
        const createdAtTo = url.searchParams.get("created_at_to");

        let query = supabase
            .from("tickets")
            .select(`
                *,
                assigned_user:users!tickets_assigned_to_fkey(id, full_name, email, avatar),
                created_by_user:users!tickets_created_by_fkey(id, full_name)
            `, { count: "exact" })
            .order("created_at", { ascending: false })
            .range(offset, offset + limit - 1);

        // Platform admin sees all
        // Others: filter by dealership
        if (!isPlatformAdmin) {
            if (!currentUser.dealership_id) {
                return NextResponse.json({ error: "No dealership context" }, { status: 403 });
            }
            query = query.eq("dealership_id", currentUser.dealership_id);

            // Scope to assigned tickets for Salesperson/Staff
            const scopedToAssigned = userRole === "Salesperson" || userRole === "Staff";
            const isAdminOrManager = userRole === "Admin" || userRole === "Manager";
            const viewAll = isAdminOrManager ||
                userPermissions.includes("*") ||
                (userPermissions.includes("tickets:read") && !userPermissions.includes("tickets:read:assigned"));

            if (scopedToAssigned || !viewAll) {
                query = query.or(`assigned_to.eq.${user.id},assigned_to.is.null`);
            }
        }

        if (status) query = query.eq("status", status);
        if (priority) query = query.eq("priority", priority);
        if (assigned_to && (currentUser.role === "Admin" || currentUser.role === "Manager" || isPlatformAdmin)) {
            query = query.eq("assigned_to", assigned_to);
        }
        if (createdAtFrom) query = query.gte("created_at", createdAtFrom);
        if (createdAtTo) query = query.lte("created_at", createdAtTo);
        if (q) {
            query = query.or(
                `subject.ilike.%${q}%,description.ilike.%${q}%`
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
    } catch (error: unknown) {
        console.error("Error fetching tickets:", error);
        return NextResponse.json(
            { error: error instanceof Error ? error.message : "Internal server error" },
            { status: 500 }
        );
    }
}

// POST create ticket
export async function POST(req: NextRequest) {
    try {
        let supabase;

        try {
            supabase = createTokenClient(req);
        } catch (error: unknown) {
            if (error instanceof Error && error.message === "MISSING_BEARER_TOKEN") {
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

        const { data: currentUser } = await supabase
            .from("users")
            .select("role, dealership_id, is_platform_admin, user_permissions")
            .eq("id", user.id)
            .single();

        if (!currentUser) {
            return NextResponse.json({ error: "User profile not found" }, { status: 404 });
        }

        // Check permission
        const canCreate = currentUser.is_platform_admin ||
            currentUser.role === "Admin" ||
            currentUser.role === "Manager" ||
            (currentUser.user_permissions || []).includes("tickets:write");

        if (!canCreate) {
            return NextResponse.json({ error: "Forbidden - You cannot create tickets" }, { status: 403 });
        }

        const payload = await req.json();

        if (!payload.subject) {
            return NextResponse.json(
                { error: "Subject is required" },
                { status: 400 }
            );
        }

        const validStatuses = ['Open', 'In Progress', 'Resolved', 'Closed'];
        if (payload.status && !validStatuses.includes(payload.status)) {
            return NextResponse.json(
                { error: `Invalid status. Must be one of: ${validStatuses.join(', ')}` },
                { status: 400 }
            );
        }

        const validPriorities = ['Low', 'Medium', 'High', 'Urgent'];
        if (payload.priority && !validPriorities.includes(payload.priority)) {
            return NextResponse.json(
                { error: `Invalid priority. Must be one of: ${validPriorities.join(', ')}` },
                { status: 400 }
            );
        }

        const ticketData = {
            subject: payload.subject,
            description: payload.description || null,
            assigned_to: payload.assigned_to || null,
            created_by: user.id,
            priority: payload.priority || 'Medium',
            status: payload.status || 'Open',
            resolved_at: payload.status === 'Resolved' ? new Date().toISOString() : null,
            dealership_id: currentUser.dealership_id,
        };

        const { data, error: dbError } = await supabase
            .from("tickets")
            .insert(ticketData)
            .select(`
                *,
                assigned_user:users!tickets_assigned_to_fkey(id, full_name, email, avatar),
                created_by_user:users!tickets_created_by_fkey(id, full_name)
            `)
            .single();

        if (dbError) throw dbError;

        return NextResponse.json({ data }, { status: 201 });
    } catch (error: unknown) {
        console.error("Error creating ticket:", error);
        return NextResponse.json(
            { error: error instanceof Error ? error.message : "Internal server error" },
            { status: 500 }
        );
    }
}
