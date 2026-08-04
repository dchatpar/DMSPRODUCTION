// Enhanced Tasks API Route with full CRUD, filtering, and scoping
import { createTokenClient } from "@/src/lib/server-token";
import { NextRequest, NextResponse } from "next/server";

// GET all tasks with filtering and scoping
export async function GET(req: NextRequest) {
    try {
        let supabase;

        try {
            supabase = createTokenClient(req);
        } catch (error: any) {
            if (error?.message === "MISSING_BEARER_TOKEN") {
                return NextResponse.json({ error: "Authorization token required" }, { status: 401 });
            }
            throw error;
        }

        const { data: { user }, error: authError } = await supabase.auth.getUser();
        if (authError || !user) {
            return NextResponse.json({ error: "Invalid or expired token" }, { status: 401 });
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
        const due_date_from = url.searchParams.get("due_date_from");
        const due_date_to = url.searchParams.get("due_date_to");
        const link_type = url.searchParams.get("link_type");
        const linked_id = url.searchParams.get("linked_id");
        const q = url.searchParams.get("q");
        const my_tasks = url.searchParams.get("my_tasks") === "true";
        const overdue = url.searchParams.get("overdue") === "true";

        let query = supabase
            .from("tasks")
            .select(`
                *,
                assigned_user:users!tasks_assigned_to_fkey(id, full_name, email, avatar),
                created_by_user:users!tasks_created_by_fkey(id, full_name, email)
            `, { count: "exact" })
            .order("due_date", { ascending: true, nullsFirst: false })
            .range(offset, offset + limit - 1);

        // Platform admin sees all - no dealership filter needed
        // Others: filter by dealership
        if (!isPlatformAdmin) {
            if (!currentUser.dealership_id) {
                return NextResponse.json({ error: "No dealership context" }, { status: 403 });
            }
            query = query.eq("dealership_id", currentUser.dealership_id);

            // Admin/Manager roles always have full view access (role-based, not permission-based)
            const isAdminOrManager = userRole === "Admin" || userRole === "Manager";

            // Scope to assigned tasks for Salesperson/Staff only
            const scopedToAssigned = userRole === "Salesperson" || userRole === "Staff";

            // viewAll = true if user has * wildcard OR has tasks:read without :assigned restriction
            // Also true if user is Admin/Manager (role-based fallback)
            const viewAll = isAdminOrManager ||
                userPermissions.includes("*") ||
                (userPermissions.includes("tasks:read") && !userPermissions.includes("tasks:read:assigned"));

            // If explicit my_tasks=true OR user is scoped, only show assigned (+ unassigned pool)
            if (my_tasks) {
                query = query.eq("assigned_to", user.id);
            } else if (scopedToAssigned || !viewAll) {
                query = query.or(`assigned_to.eq.${user.id},assigned_to.is.null`);
            }
        }

        if (status) query = query.eq("status", status);
        if (priority) query = query.eq("priority", priority);
        // Only allow assigned_to filter for Admin/Manager
        if (assigned_to && !my_tasks && (currentUser.role === "Admin" || currentUser.role === "Manager" || isPlatformAdmin)) {
            query = query.eq("assigned_to", assigned_to);
        }
        if (overdue) {
            const nowIso = new Date().toISOString();
            // Open tasks past due (Pending or In Progress)
            query = query
                .in("status", ["Pending", "In Progress"])
                .lt("due_date", nowIso);
        }
        if (due_date_from) query = query.gte("due_date", due_date_from);
        if (due_date_to) query = query.lte("due_date", due_date_to + "T23:59:59");
        if (q) {
            query = query.or(`title.ilike.%${q}%,description.ilike.%${q}%,notes.ilike.%${q}%`);
        }

        // If link_type and linked_id provided, filter by task_links
        if (link_type && linked_id) {
            const { data: linkData } = await supabase
                .from("task_links")
                .select("task_id")
                .eq("link_type", link_type)
                .eq("linked_id", linked_id);

            const taskIds = linkData?.map(l => l.task_id) || [];
            if (taskIds.length > 0) {
                query = query.in("id", taskIds);
            } else {
                return NextResponse.json({ data: [], count: 0, limit, offset });
            }
        }

        const { data, error: dbError, count } = await query;

        if (dbError) throw dbError;

        // Sort by priority: Urgent > High > Medium > Low
        const priorityOrder = { 'Urgent': 1, 'High': 2, 'Medium': 3, 'Low': 4 };
        const sortedData = (data || []).sort((a: any, b: any) => {
            const aPriority = priorityOrder[a.priority as keyof typeof priorityOrder] || 5;
            const bPriority = priorityOrder[b.priority as keyof typeof priorityOrder] || 5;
            if (aPriority !== bPriority) return aPriority - bPriority;
            if (!a.due_date && !b.due_date) return 0;
            if (!a.due_date) return 1;
            if (!b.due_date) return -1;
            return new Date(a.due_date).getTime() - new Date(b.due_date).getTime();
        });

        return NextResponse.json({
            data: sortedData,
            count: count || 0,
            limit,
            offset,
        });
    } catch (error: any) {
        console.error("Error fetching tasks:", error);
        return NextResponse.json({ error: error?.message || "Internal server error" }, { status: 500 });
    }
}

// POST create task
export async function POST(req: NextRequest) {
    try {
        let supabase;

        try {
            supabase = createTokenClient(req);
        } catch (error: any) {
            if (error?.message === "MISSING_BEARER_TOKEN") {
                return NextResponse.json({ error: "Authorization token required" }, { status: 401 });
            }
            throw error;
        }

        const { data: { user }, error: authError } = await supabase.auth.getUser();
        if (authError || !user) {
            return NextResponse.json({ error: "Invalid or expired token" }, { status: 401 });
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
            (currentUser.user_permissions || []).includes("tasks:write");

        if (!canCreate) {
            return NextResponse.json({ error: "Forbidden - You cannot create tasks" }, { status: 403 });
        }

        const payload = await req.json();

        if (!payload.title) {
            return NextResponse.json({ error: "Task title is required" }, { status: 400 });
        }

        const validPriorities = ['Low', 'Medium', 'High', 'Urgent'];
        if (payload.priority && !validPriorities.includes(payload.priority)) {
            return NextResponse.json({ error: `Invalid priority` }, { status: 400 });
        }

        const validStatuses = ['Pending', 'In Progress', 'Completed', 'Cancelled', 'On Hold'];
        if (payload.status && !validStatuses.includes(payload.status)) {
            return NextResponse.json({ error: `Invalid status` }, { status: 400 });
        }

        // Create the task
        const taskData: any = {
            title: payload.title,
            description: payload.description || null,
            assigned_to: payload.assigned_to || null,
            created_by: user.id,
            due_date: payload.due_date ? new Date(payload.due_date).toISOString() : null,
            reminder_at: payload.reminder_at ? new Date(payload.reminder_at).toISOString() : null,
            priority: payload.priority || 'Medium',
            status: payload.status || 'Pending',
            notes: payload.notes || null,
            tags: payload.tags || [],
            source_type: payload.source_type || 'manual',
            source_id: payload.source_id || null,
            completed_at: payload.status === 'Completed' ? new Date().toISOString() : null,
            dealership_id: currentUser.dealership_id,
        };

        const { data: task, error: dbError } = await supabase
            .from("tasks")
            .insert(taskData)
            .select(`
                *,
                assigned_user:users!tasks_assigned_to_fkey(id, full_name, email, avatar),
                created_by_user:users!tasks_created_by_fkey(id, full_name, email)
            `)
            .single();

        if (dbError) throw dbError;

        // Add task links if provided
        if (payload.links && Array.isArray(payload.links)) {
            const linkInserts = payload.links.map((link: any) => ({
                task_id: task.id,
                link_type: link.link_type,
                linked_id: link.linked_id,
            }));

            await supabase.from("task_links").insert(linkInserts);
        }

        // Log activity
        await supabase.rpc("log_task_activity", {
            p_task_id: task.id,
            p_user_id: user.id,
            p_action: "created",
            p_new_value: JSON.stringify({ title: task.title, status: task.status, priority: task.priority }),
        });

        return NextResponse.json({ data: task }, { status: 201 });
    } catch (error: any) {
        console.error("Error creating task:", error);
        return NextResponse.json({ error: error?.message || "Internal server error" }, { status: 500 });
    }
}
