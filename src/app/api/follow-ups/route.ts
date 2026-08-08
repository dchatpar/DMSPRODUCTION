// app/api/follow-ups/route.ts
import { createTokenClient } from "@/src/lib/server-token";
import { NextRequest, NextResponse } from "next/server";

// GET all follow-ups
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
        const overdue = url.searchParams.get("overdue");
        const q = url.searchParams.get("q");
        const followUpDateFrom = url.searchParams.get("follow_up_date_from");
        const followUpDateTo = url.searchParams.get("follow_up_date_to");

        let query = supabase
            .from("follow_ups")
            .select(`
                *,
                customer:customers(id, name, email, phone),
                assigned_user:users!assigned_to(id, full_name, email),
                created_by_user:users!created_by(id, full_name, email),
                completed_by_user:users!completed_by(id, full_name, email)
            `, { count: "exact" })
            .order("follow_up_date", { ascending: true })
            .range(offset, offset + limit - 1);

        // Platform admin sees all - no dealership filter needed
        // Others: filter by dealership
        if (!isPlatformAdmin) {
            if (!currentUser.dealership_id) {
                return NextResponse.json({ error: "No dealership context" }, { status: 403 });
            }
            query = query.eq("dealership_id", currentUser.dealership_id);

            // Scope to assigned follow-ups for Salesperson/Staff
            const scopedToAssigned = userRole === "Salesperson" || userRole === "Staff";
            const isAdminOrManager = userRole === "Admin" || userRole === "Manager";
            const viewAll = isAdminOrManager ||
                userPermissions.includes("*") ||
                (userPermissions.includes("follow_ups:read") && !userPermissions.includes("follow_ups:read:assigned"));

            if (scopedToAssigned || !viewAll) {
                query = query.or(`assigned_to.eq.${user.id},assigned_to.is.null`);
            }
        }

        if (status) query = query.eq("status", status);
        if (priority) query = query.eq("priority", priority);
        if (overdue === "true") {
            query = query.eq("status", "Pending").lt("follow_up_date", new Date().toISOString());
        }
        if (q) {
            query = query.or(
                `title.ilike.%${q}%,notes.ilike.%${q}%,description.ilike.%${q}%`
            );
        }
        if (followUpDateFrom) query = query.gte("follow_up_date", followUpDateFrom);
        if (followUpDateTo) query = query.lte("follow_up_date", followUpDateTo);

        const { data, error: dbError, count } = await query;

        if (dbError) throw dbError;

        return NextResponse.json({
            data: data || [],
            count: count || 0,
            limit,
            offset,
        });
    } catch (error: unknown) {
        console.error("Error fetching follow-ups:", error);
        return NextResponse.json(
            { error: error instanceof Error ? error.message : "Internal server error" },
            { status: 500 }
        );
    }
}

// POST create follow-up
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
            (currentUser.user_permissions || []).includes("follow_ups:write");

        if (!canCreate) {
            return NextResponse.json({ error: "Forbidden - You cannot create follow-ups" }, { status: 403 });
        }

        const payload = await req.json();

        const required = ["title", "follow_up_date"];
        for (const field of required) {
            if (!payload[field]) {
                return NextResponse.json(
                    { error: `Missing required field: ${field}` },
                    { status: 400 }
                );
            }
        }

        const validStatuses = ['Pending', 'Completed', 'Cancelled'];
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

        const followUpData = {
            title: payload.title,
            description: payload.description || null,
            customer_id: payload.customer_id || null,
            lead_id: payload.lead_id || null,
            assigned_to: payload.assigned_to || user.id,
            created_by: user.id,
            follow_up_date: payload.follow_up_date,
            follow_up_time: payload.follow_up_time || null,
            priority: payload.priority || 'Medium',
            status: payload.status || 'Pending',
            notes: payload.notes || null,
            completed_at: payload.status === 'Completed' ? new Date().toISOString() : null,
            completed_by: payload.status === 'Completed' ? user.id : null,
            dealership_id: currentUser.dealership_id,
        };

        const { data, error: dbError } = await supabase
            .from("follow_ups")
            .insert(followUpData)
            .select(`
                *,
                customer:customers(id, name, email, phone),
                assigned_user:users!assigned_to(id, full_name, email),
                created_by_user:users!created_by(id, full_name, email),
                completed_by_user:users!completed_by(id, full_name, email)
            `)
            .single();

        if (dbError) throw dbError;

        if (data) {
            await supabase
                .from("follow_up_history")
                .insert({
                    follow_up_id: data.id,
                    edited_by: user.id,
                    action: "created",
                    new_description: data.description,
                    new_status: data.status,
                });
        }

        return NextResponse.json({ data }, { status: 201 });
    } catch (error: unknown) {
        console.error("Error creating follow-up:", error);
        return NextResponse.json(
            { error: error instanceof Error ? error.message : "Internal server error" },
            { status: 500 }
        );
    }
}
