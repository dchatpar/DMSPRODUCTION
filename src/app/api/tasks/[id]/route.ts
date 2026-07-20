// Enhanced Single Task API Route
import { createTokenClient } from "@/src/lib/server-token";
import { NextRequest, NextResponse } from "next/server";

// GET single task with all related data
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
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

        const { id } = await params;
        const { data: { user }, error: authError } = await supabase.auth.getUser();
        if (authError || !user) {
            return NextResponse.json({ error: "Invalid or expired token" }, { status: 401 });
        }

        // Get task with relations
        const { data: task, error: dbError } = await supabase
            .from("tasks")
            .select(`
                *,
                assigned_user:users!tasks_assigned_to_fkey(id, full_name, email, avatar),
                created_by_user:users!tasks_created_by_fkey(id, full_name, email)
            `)
            .eq("id", id)
            .single();

        if (dbError) throw dbError;
        if (!task) return NextResponse.json({ error: "Task not found" }, { status: 404 });

        // Get notes
        const { data: notes } = await supabase
            .from("task_notes")
            .select(`*, user:users!task_notes_user_id_fkey(id, full_name, avatar)`)
            .eq("task_id", id)
            .order("created_at", { ascending: false });

        // Get attachments
        const { data: attachments } = await supabase
            .from("task_attachments")
            .select(`*, user:users!task_notes_user_id_fkey(id, full_name)`)
            .eq("task_id", id)
            .order("created_at", { ascending: false });

        // Get reminders
        const { data: reminders } = await supabase
            .from("task_reminders")
            .select(`*`)
            .eq("task_id", id)
            .order("remind_at", { ascending: true });

        // Get links
        const { data: links } = await supabase
            .from("task_links")
            .select(`*`)
            .eq("task_id", id);

        // Get activity
        const { data: activity } = await supabase
            .from("task_activity")
            .select(`*, user:users!task_notes_user_id_fkey(id, full_name)`)
            .eq("task_id", id)
            .order("created_at", { ascending: false })
            .limit(50);

        return NextResponse.json({
            data: {
                ...task,
                task_notes: notes || [],
                task_attachments: attachments || [],
                task_reminders: reminders || [],
                task_links: links || [],
                task_activity: activity || [],
            }
        });
    } catch (error: any) {
        console.error("Error fetching task:", error);
        return NextResponse.json({ error: error?.message || "Internal server error" }, { status: 500 });
    }
}

// PATCH update task
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
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

        const { id } = await params;
        const { data: { user }, error: authError } = await supabase.auth.getUser();
        if (authError || !user) {
            return NextResponse.json({ error: "Invalid or expired token" }, { status: 401 });
        }

        const payload = await req.json();

        // Get old task for activity logging
        const { data: oldTask } = await supabase
            .from("tasks")
            .select("*")
            .eq("id", id)
            .single();

        if (!oldTask) return NextResponse.json({ error: "Task not found" }, { status: 404 });

        const updateData: any = {};

        if (payload.title !== undefined) updateData.title = payload.title;
        if (payload.description !== undefined) updateData.description = payload.description;
        if (payload.assigned_to !== undefined) updateData.assigned_to = payload.assigned_to;
        if (payload.due_date !== undefined) updateData.due_date = payload.due_date ? new Date(payload.due_date).toISOString() : null;
        if (payload.reminder_at !== undefined) updateData.reminder_at = payload.reminder_at ? new Date(payload.reminder_at).toISOString() : null;
        if (payload.priority !== undefined) updateData.priority = payload.priority;
        if (payload.status !== undefined) updateData.status = payload.status;
        if (payload.notes !== undefined) updateData.notes = payload.notes;
        if (payload.tags !== undefined) updateData.tags = payload.tags;

        // Handle completion
        if (payload.status === 'Completed' && oldTask.status !== 'Completed') {
            updateData.completed_at = new Date().toISOString();
        } else if (payload.status && payload.status !== 'Completed') {
            updateData.completed_at = null;
        }

        const { data: task, error: dbError } = await supabase
            .from("tasks")
            .update(updateData)
            .eq("id", id)
            .select(`
                *,
                assigned_user:users!tasks_assigned_to_fkey(id, full_name, email, avatar),
                created_by_user:users!tasks_created_by_fkey(id, full_name, email)
            `)
            .single();

        if (dbError) throw dbError;

        // Update links if provided
        if (payload.links !== undefined) {
            await supabase.from("task_links").delete().eq("task_id", id);
            if (payload.links.length > 0) {
                const linkInserts = payload.links.map((link: any) => ({
                    task_id: id,
                    link_type: link.link_type,
                    linked_id: link.linked_id,
                }));
                await supabase.from("task_links").insert(linkInserts);
            }
        }

        // Log activity
        const changes: any = {};
        if (payload.status !== undefined && payload.status !== oldTask.status) {
            changes.status_change = { from: oldTask.status, to: payload.status };
        }
        if (payload.assigned_to !== undefined && payload.assigned_to !== oldTask.assigned_to) {
            changes.assignment_change = { from: oldTask.assigned_to, to: payload.assigned_to };
        }
        if (payload.priority !== undefined && payload.priority !== oldTask.priority) {
            changes.priority_change = { from: oldTask.priority, to: payload.priority };
        }

        if (Object.keys(changes).length > 0) {
            await supabase.rpc("log_task_activity", {
                p_task_id: id,
                p_user_id: user.id,
                p_action: "updated",
                p_old_value: JSON.stringify(oldTask),
                p_new_value: JSON.stringify(changes),
            });
        }

        return NextResponse.json({ data: task });
    } catch (error: any) {
        console.error("Error updating task:", error);
        return NextResponse.json({ error: error?.message || "Internal server error" }, { status: 500 });
    }
}

// DELETE task
export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
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

        const { id } = await params;
        const { data: { user }, error: authError } = await supabase.auth.getUser();
        if (authError || !user) {
            return NextResponse.json({ error: "Invalid or expired token" }, { status: 401 });
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

        // Check tasks:delete permission
        const canDelete = isPlatformAdmin ||
            userRole === "Admin" ||
            userRole === "Manager" ||
            userPerms.includes("tasks:delete") ||
            userPerms.includes("*");

        if (!canDelete) {
            return NextResponse.json(
                { error: "Forbidden - You need tasks:delete permission to delete tasks" },
                { status: 403 }
            );
        }

        // Delete related records first (cascades should handle this, but being explicit)
        await supabase.from("task_reminders").delete().eq("task_id", id);
        await supabase.from("task_attachments").delete().eq("task_id", id);
        await supabase.from("task_notes").delete().eq("task_id", id);
        await supabase.from("task_links").delete().eq("task_id", id);
        await supabase.from("task_activity").delete().eq("task_id", id);

        const { error: dbError } = await supabase.from("tasks").delete().eq("id", id);

        if (dbError) throw dbError;

        return NextResponse.json({ success: true });
    } catch (error: any) {
        console.error("Error deleting task:", error);
        return NextResponse.json({ error: error?.message || "Internal server error" }, { status: 500 });
    }
}
