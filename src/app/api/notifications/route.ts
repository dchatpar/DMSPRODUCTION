// app/api/notifications/route.ts — dealership-scoped feed for TopHeader bell
import { createTokenClient } from "@/src/lib/server-token";
import { NextRequest, NextResponse } from "next/server";
import { requireDealershipAccess } from "@/src/lib/auth-helpers";

export type AppNotification = {
    id: string;
    kind: "follow_up" | "task" | "invoice" | "lead";
    title: string;
    body: string;
    href: string;
    at: string | null;
    overdue: boolean;
};

export async function GET(req: NextRequest) {
    try {
        const auth = await requireDealershipAccess(req);
        if (auth.error || !auth.profile) {
            return NextResponse.json(
                { error: auth.error || "Unauthorized" },
                { status: auth.status || 401 }
            );
        }

        let supabase;
        try {
            supabase = createTokenClient(req);
        } catch (error: unknown) {
            const msg = error instanceof Error ? error.message : "";
            if (msg === "MISSING_BEARER_TOKEN") {
                return NextResponse.json(
                    { error: "Authorization token required" },
                    { status: 401 }
                );
            }
            throw error;
        }

        const dealershipId = auth.profile.is_platform_admin
            ? null
            : auth.profile.dealership_id;

        if (!dealershipId && !auth.profile.is_platform_admin) {
            return NextResponse.json(
                { error: "No dealership context" },
                { status: 403 }
            );
        }

        const today = new Date().toISOString().split("T")[0]!;
        const items: AppNotification[] = [];

        let invQ = supabase
            .from("invoices")
            .select("id, invoice_number, due_date, status, created_at")
            .in("status", ["Pending", "Overdue"])
            .lte("due_date", today)
            .order("due_date", { ascending: true })
            .limit(8);
        if (dealershipId) invQ = invQ.eq("dealership_id", dealershipId);
        const { data: invoices } = await invQ;
        for (const inv of invoices || []) {
            items.push({
                id: `inv-${inv.id}`,
                kind: "invoice",
                title: `Invoice ${inv.invoice_number} overdue`,
                body: `Due ${inv.due_date} · ${inv.status}`,
                href: "/invoices",
                at: inv.due_date || inv.created_at,
                overdue: true,
            });
        }

        let fuQ = supabase
            .from("follow_ups")
            .select("id, title, follow_up_date, status, created_at")
            .neq("status", "Completed")
            .neq("status", "Cancelled")
            .lte("follow_up_date", today)
            .order("follow_up_date", { ascending: true })
            .limit(8);
        if (dealershipId) fuQ = fuQ.eq("dealership_id", dealershipId);
        const { data: followUps } = await fuQ;
        for (const fu of followUps || []) {
            const due = fu.follow_up_date as string | null;
            items.push({
                id: `fu-${fu.id}`,
                kind: "follow_up",
                title: fu.title || "Follow-up due",
                body: due ? `Due ${due}` : "Due",
                href: "/follow-ups",
                at: due || fu.created_at,
                overdue: Boolean(due && due < today),
            });
        }

        const taskHorizon = new Date(
            Date.now() + 3 * 24 * 60 * 60 * 1000
        ).toISOString();
        let taskQ = supabase
            .from("tasks")
            .select("id, title, due_date, status, created_at")
            .not("status", "in", '("Completed","Cancelled")')
            .not("due_date", "is", null)
            .lte("due_date", taskHorizon)
            .order("due_date", { ascending: true })
            .limit(8);
        if (dealershipId) taskQ = taskQ.eq("dealership_id", dealershipId);
        const { data: tasks } = await taskQ;
        for (const t of tasks || []) {
            const dueRaw = t.due_date ? String(t.due_date) : null;
            const dueDay = dueRaw ? dueRaw.slice(0, 10) : null;
            items.push({
                id: `task-${t.id}`,
                kind: "task",
                title: t.title || "Task due",
                body: dueDay ? `Due ${dueDay}` : "Due soon",
                href: "/tasks",
                at: dueRaw || t.created_at,
                overdue: Boolean(dueDay && dueDay < today),
            });
        }

        items.sort((a, b) => {
            const ta = a.at ? new Date(a.at).getTime() : 0;
            const tb = b.at ? new Date(b.at).getTime() : 0;
            return ta - tb;
        });

        const limited = items.slice(0, 20);

        return NextResponse.json({
            data: limited,
            unread: limited.length,
        });
    } catch (error: unknown) {
        console.error("Error fetching notifications:", error);
        return NextResponse.json(
            {
                error:
                    error instanceof Error ? error.message : "Internal server error",
            },
            { status: 500 }
        );
    }
}
