// app/api/tickets/route.ts
import { createTokenClient } from "@/src/lib/server-token";
import { NextRequest, NextResponse } from "next/server";

// GET all tickets
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
        const priority = url.searchParams.get("priority");
        const assigned_to = url.searchParams.get("assigned_to");
        const q = url.searchParams.get("q");

        let query = supabase
            .from("tickets")
            .select(`
                *,
                assigned_user:users!tickets_assigned_to_fkey(id, full_name, email, avatar),
                created_by_user:users!tickets_created_by_fkey(id, full_name)
            `, { count: "exact" })
            .order("created_at", { ascending: false })
            .range(offset, offset + limit - 1);

        if (status) query = query.eq("status", status);
        if (priority) query = query.eq("priority", priority);
        if (assigned_to) query = query.eq("assigned_to", assigned_to);
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
    } catch (error: any) {
        console.error("Error fetching tickets:", error);
        return NextResponse.json(
            { error: error?.message || "Internal server error" },
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
    } catch (error: any) {
        console.error("Error creating ticket:", error);
        return NextResponse.json(
            { error: error?.message || "Internal server error" },
            { status: 500 }
        );
    }
}
