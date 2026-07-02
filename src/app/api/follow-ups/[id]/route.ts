// app/api/follow-ups/[id]/route.ts
import { createTokenClient } from "@/src/lib/server-token";
import { NextRequest, NextResponse } from "next/server";

// GET single follow-up
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

        const { id } = await params;

        // Verify user is authenticated
        const { data: { user }, error: authError } = await supabase.auth.getUser();

        if (authError || !user) {
            return NextResponse.json(
                { error: "Invalid or expired token" },
                { status: 401 }
            );
        }

        const { data, error: dbError } = await supabase
            .from("follow_ups")
            .select(`
                *,
                customer:customers(id, name, email, phone),
                assigned_user:users!assigned_to(id, full_name, email),
                created_by_user:users!created_by(id, full_name, email),
                completed_by_user:users!completed_by(id, full_name, email)
            `)
            .eq("id", id)
            .single();

        if (dbError) throw dbError;

        if (!data) {
            return NextResponse.json(
                { error: "Follow-up not found" },
                { status: 404 }
            );
        }

        // Get history
        const { data: history } = await supabase
            .from("follow_up_history")
            .select(`
                *,
                edited_by_user:users!edited_by(id, full_name, email)
            `)
            .eq("follow_up_id", id)
            .order("created_at", { ascending: true });

        return NextResponse.json({ data: { ...data, history: history || [] } });
    } catch (error: any) {
        console.error("Error fetching follow-up:", error);
        return NextResponse.json(
            { error: error?.message || "Internal server error" },
            { status: 500 }
        );
    }
}

// PATCH update follow-up
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

        const { id } = await params;

        // Verify user is authenticated
        const { data: { user }, error: authError } = await supabase.auth.getUser();

        if (authError || !user) {
            return NextResponse.json(
                { error: "Invalid or expired token" },
                { status: 401 }
            );
        }

        const payload = await req.json();

        // Validate status if provided
        const validStatuses = ['Pending', 'Completed', 'Cancelled'];
        if (payload.status && !validStatuses.includes(payload.status)) {
            return NextResponse.json(
                { error: `Invalid status. Must be one of: ${validStatuses.join(', ')}` },
                { status: 400 }
            );
        }

        // Validate priority if provided
        const validPriorities = ['Low', 'Medium', 'High', 'Urgent'];
        if (payload.priority && !validPriorities.includes(payload.priority)) {
            return NextResponse.json(
                { error: `Invalid priority. Must be one of: ${validPriorities.join(', ')}` },
                { status: 400 }
            );
        }

        // Build update data
        const updateData: any = {};

        if (payload.title !== undefined) updateData.title = payload.title;
        if (payload.description !== undefined) updateData.description = payload.description;
        if (payload.customer_id !== undefined) updateData.customer_id = payload.customer_id;
        if (payload.lead_id !== undefined) updateData.lead_id = payload.lead_id;
        if (payload.assigned_to !== undefined) updateData.assigned_to = payload.assigned_to;
        if (payload.follow_up_date !== undefined) updateData.follow_up_date = payload.follow_up_date;
        if (payload.follow_up_time !== undefined) updateData.follow_up_time = payload.follow_up_time;
        if (payload.priority !== undefined) updateData.priority = payload.priority;
        if (payload.status !== undefined) updateData.status = payload.status;
        if (payload.notes !== undefined) updateData.notes = payload.notes;
        if (payload.status === 'Completed') {
            updateData.completed_at = new Date().toISOString();
        }

        // Get current follow-up for history
        const { data: currentFollowUp } = await supabase
            .from("follow_ups")
            .select("description, status")
            .eq("id", id)
            .single();

        const { data, error: dbError } = await supabase
            .from("follow_ups")
            .update(updateData)
            .eq("id", id)
            .select(`
                *,
                customer:customers(id, name, email, phone),
                assigned_user:users!assigned_to(id, full_name, email),
                created_by_user:users!created_by(id, full_name, email),
                completed_by_user:users!completed_by(id, full_name, email)
            `)
            .single();

        if (dbError) throw dbError;

        if (!data) {
            return NextResponse.json(
                { error: "Follow-up not found" },
                { status: 404 }
            );
        }

        // Create history entry for the update
        let historyAction = "updated";
        if (payload.status === 'Completed' && currentFollowUp?.status !== 'Completed') {
            historyAction = "completed";
        } else if (payload.status === 'Cancelled') {
            historyAction = "cancelled";
        } else if (payload.status !== undefined && payload.status !== currentFollowUp?.status) {
            historyAction = "status_changed";
        }

        await supabase
            .from("follow_up_history")
            .insert({
                follow_up_id: id,
                edited_by: user.id,
                action: historyAction,
                previous_description: currentFollowUp?.description,
                new_description: payload.description !== undefined ? payload.description : currentFollowUp?.description,
                previous_status: currentFollowUp?.status,
                new_status: payload.status !== undefined ? payload.status : currentFollowUp?.status,
            });

        // Get updated history
        const { data: history } = await supabase
            .from("follow_up_history")
            .select(`
                *,
                edited_by_user:users!edited_by(id, full_name, email)
            `)
            .eq("follow_up_id", id)
            .order("created_at", { ascending: true });

        return NextResponse.json({ data: { ...data, history: history || [] } });
    } catch (error: any) {
        console.error("Error updating follow-up:", error);
        return NextResponse.json(
            { error: error?.message || "Internal server error" },
            { status: 500 }
        );
    }
}

// DELETE follow-up
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

        const { id } = await params;

        // Verify user is authenticated
        const { data: { user }, error: authError } = await supabase.auth.getUser();

        if (authError || !user) {
            return NextResponse.json(
                { error: "Invalid or expired token" },
                { status: 401 }
            );
        }

        const { error: dbError } = await supabase
            .from("follow_ups")
            .delete()
            .eq("id", id);

        if (dbError) throw dbError;

        return NextResponse.json({ success: true });
    } catch (error: any) {
        console.error("Error deleting follow-up:", error);
        return NextResponse.json(
            { error: error?.message || "Internal server error" },
            { status: 500 }
        );
    }
}
