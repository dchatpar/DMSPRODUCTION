// Task Notes API Route
import { createTokenClient } from "@/src/lib/server-token";
import { NextRequest, NextResponse } from "next/server";

// POST add note to task
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

        if (!payload.content) {
            return NextResponse.json({ error: "Note content is required" }, { status: 400 });
        }

        const { data: note, error: dbError } = await supabase
            .from("task_notes")
            .insert({
                task_id,
                user_id: user.id,
                content: payload.content,
                is_internal: payload.is_internal !== false,
            })
            .select(`*, user:users!task_notes_user_id_fkey(id, full_name, avatar)`)
            .single();

        if (dbError) throw dbError;

        // Log activity
        await supabase.rpc("log_task_activity", {
            p_task_id: task_id,
            p_user_id: user.id,
            p_action: "commented",
            p_new_value: JSON.stringify({ note_id: note.id }),
        });

        return NextResponse.json({ data: note }, { status: 201 });
    } catch (error: any) {
        console.error("Error creating note:", error);
        return NextResponse.json({ error: error?.message || "Internal server error" }, { status: 500 });
    }
}
