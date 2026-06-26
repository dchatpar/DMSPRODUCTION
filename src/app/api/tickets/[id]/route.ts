// app/api/tickets/[id]/route.ts
import { createTokenClient } from "@/src/lib/server-token";
import { NextRequest, NextResponse } from "next/server";

// GET single ticket
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

        const { data: { user }, error: authError } = await supabase.auth.getUser();

        if (authError || !user) {
            return NextResponse.json(
                { error: "Invalid or expired token" },
                { status: 401 }
            );
        }

        const { data, error: dbError } = await supabase
            .from("tickets")
            .select(`
                *,
                assigned_user:users!tickets_assigned_to_fkey(id, full_name, email, avatar),
                created_by_user:users!tickets_created_by_fkey(id, full_name)
            `)
            .eq("id", id)
            .single();

        if (dbError) throw dbError;

        if (!data) {
            return NextResponse.json(
                { error: "Ticket not found" },
                { status: 404 }
            );
        }

        return NextResponse.json({ data });
    } catch (error: any) {
        console.error("Error fetching ticket:", error);
        return NextResponse.json(
            { error: error?.message || "Internal server error" },
            { status: 500 }
        );
    }
}

// PATCH update ticket
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

        const { data: { user }, error: authError } = await supabase.auth.getUser();

        if (authError || !user) {
            return NextResponse.json(
                { error: "Invalid or expired token" },
                { status: 401 }
            );
        }

        const payload = await req.json();

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

        const updateData: any = {};

        if (payload.subject !== undefined) updateData.subject = payload.subject;
        if (payload.description !== undefined) updateData.description = payload.description;
        if (payload.assigned_to !== undefined) updateData.assigned_to = payload.assigned_to;
        if (payload.priority !== undefined) updateData.priority = payload.priority;
        if (payload.status !== undefined) updateData.status = payload.status;

        if (payload.status === 'Resolved') {
            updateData.resolved_at = new Date().toISOString();
        } else if (payload.status === 'Open' || payload.status === 'In Progress') {
            updateData.resolved_at = null;
        }

        const { data, error: dbError } = await supabase
            .from("tickets")
            .update(updateData)
            .eq("id", id)
            .select(`
                *,
                assigned_user:users!tickets_assigned_to_fkey(id, full_name, email, avatar),
                created_by_user:users!tickets_created_by_fkey(id, full_name)
            `)
            .single();

        if (dbError) throw dbError;

        if (!data) {
            return NextResponse.json(
                { error: "Ticket not found" },
                { status: 404 }
            );
        }

        return NextResponse.json({ data });
    } catch (error: any) {
        console.error("Error updating ticket:", error);
        return NextResponse.json(
            { error: error?.message || "Internal server error" },
            { status: 500 }
        );
    }
}

// DELETE ticket
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

        const { data: { user }, error: authError } = await supabase.auth.getUser();

        if (authError || !user) {
            return NextResponse.json(
                { error: "Invalid or expired token" },
                { status: 401 }
            );
        }

        const { error: dbError } = await supabase
            .from("tickets")
            .delete()
            .eq("id", id);

        if (dbError) throw dbError;

        return NextResponse.json({ success: true });
    } catch (error: any) {
        console.error("Error deleting ticket:", error);
        return NextResponse.json(
            { error: error?.message || "Internal server error" },
            { status: 500 }
        );
    }
}
