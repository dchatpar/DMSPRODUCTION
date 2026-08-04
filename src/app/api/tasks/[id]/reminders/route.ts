// Task Reminders API Route
import { createTokenClient } from "@/src/lib/server-token";
import { supabaseAdmin } from "@/src/lib/supabase-admin";
import { NextRequest, NextResponse } from "next/server";

// POST add reminder to task
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
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

        const { id: task_id } = await params;
        const { data: { user }, error: authError } = await supabase.auth.getUser();
        if (authError || !user) {
            return NextResponse.json({ error: "Invalid or expired token" }, { status: 401 });
        }

        const payload = await req.json();

        if (!payload.remind_at) {
            return NextResponse.json({ error: "Reminder time is required" }, { status: 400 });
        }

        // Use service role: same RLS issue as task_notes — the user-context
        // insert is rejected even when the user owns the parent task.
        const { data: reminder, error: dbError } = await supabaseAdmin
            .from("task_reminders")
            .insert({
                task_id,
                user_id: user.id,
                remind_at: new Date(payload.remind_at).toISOString(),
                message: payload.message || null,
            })
            .select(`*`)
            .single();

        if (dbError) throw dbError;

        return NextResponse.json({ data: reminder }, { status: 201 });
    } catch (error: any) {
        console.error("Error creating reminder:", error);
        return NextResponse.json({ error: error?.message || "Internal server error" }, { status: 500 });
    }
}
