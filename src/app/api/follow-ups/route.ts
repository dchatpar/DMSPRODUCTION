// app/api/follow-ups/route.ts
import { createTokenClient } from "@/src/lib/server-token";
import { NextRequest, NextResponse } from "next/server";

// GET all follow-ups
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

        // Verify user is authenticated
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

        if (status) query = query.eq("status", status);
        if (priority) query = query.eq("priority", priority);
        if (overdue === "true") {
            query = query.eq("status", "Pending").lt("follow_up_date", new Date().toISOString());
        }
        if (q) {
            // PostgREST doesn't support FK references in .or(), so only search on direct columns
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
    } catch (error: any) {
        console.error("Error fetching follow-ups:", error);
        return NextResponse.json(
            { error: error?.message || "Internal server error" },
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

        const payload = await req.json();

        // Validate required fields
        const required = ["title", "follow_up_date"];
        for (const field of required) {
            if (!payload[field]) {
                return NextResponse.json(
                    { error: `Missing required field: ${field}` },
                    { status: 400 }
                );
            }
        }

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

        // Set default values
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

        // Create initial history entry
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
    } catch (error: any) {
        console.error("Error creating follow-up:", error);
        return NextResponse.json(
            { error: error?.message || "Internal server error" },
            { status: 500 }
        );
    }
}
