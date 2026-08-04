import { NextRequest, NextResponse } from "next/server";
import { chatCompletion, MiniMaxNotConfiguredError } from "@/src/lib/ai/minimax";
import {
    DESK_SYSTEM,
    requireAiCaller,
    aiNotConfiguredResponse,
} from "@/src/lib/ai/guard";
import { supabaseAdmin } from "@/src/lib/supabase-admin";

function daysInStock(createdAt: string | null | undefined): number {
    if (!createdAt) return 0;
    return Math.max(
        0,
        Math.floor((Date.now() - new Date(createdAt).getTime()) / 86400000)
    );
}

/** GET /api/ai/desk-brief — daily desk brief widget (dealership-scoped). */
export async function GET(req: NextRequest) {
    try {
        const gate = await requireAiCaller(req);
        if (!gate.ok) return gate.response;

        const dealershipId = gate.dealershipId;

        const [leadsRes, agingRes, dealsRes, followUpsRes] = await Promise.all([
            supabaseAdmin
                .from("leads")
                .select("id, status, temperature, created_at, source")
                .eq("dealership_id", dealershipId)
                .order("created_at", { ascending: false })
                .limit(25),
            supabaseAdmin
                .from("vehicles")
                .select(
                    "id, year, make, model, stock_number, retail_price, status, created_at"
                )
                .eq("dealership_id", dealershipId)
                .ilike("status", "Active")
                .order("created_at", { ascending: true })
                .limit(40),
            supabaseAdmin
                .from("sales_deals")
                .select("id, deal_status, status, sale_price, created_at")
                .eq("dealership_id", dealershipId)
                .order("created_at", { ascending: false })
                .limit(15),
            supabaseAdmin
                .from("follow_ups")
                .select("id, status, follow_up_date, notes, priority")
                .eq("dealership_id", dealershipId)
                .order("follow_up_date", { ascending: true })
                .limit(15),
        ]);

        if (leadsRes.error) throw leadsRes.error;
        if (agingRes.error) throw agingRes.error;
        if (dealsRes.error) throw dealsRes.error;
        // follow_ups table may be named differently — soft-fail
        const followUps = followUpsRes.error ? [] : followUpsRes.data ?? [];

        const aging = (agingRes.data ?? [])
            .map((v) => ({
                year: v.year,
                make: v.make,
                model: v.model,
                stock_number: v.stock_number,
                retail_price: v.retail_price,
                days_in_stock: daysInStock(v.created_at),
            }))
            .filter((v) => v.days_in_stock >= 45)
            .slice(0, 10);

        const snapshot = {
            open_leads: (leadsRes.data ?? []).filter(
                (l) =>
                    String(l.status || "").toLowerCase() !== "closed" &&
                    String(l.status || "").toLowerCase() !== "converted"
            ).length,
            hot_leads: (leadsRes.data ?? []).filter(
                (l) => String(l.temperature || "").toLowerCase() === "hot"
            ).length,
            recent_leads: (leadsRes.data ?? []).slice(0, 8).map((l) => ({
                status: l.status,
                temperature: l.temperature,
                source: l.source,
            })),
            aging_units: aging,
            recent_deals: (dealsRes.data ?? []).slice(0, 8).map((d) => ({
                deal_status: d.deal_status || d.status,
                sale_price: d.sale_price,
            })),
            follow_ups_due: followUps.slice(0, 8),
        };

        const result = await chatCompletion({
            messages: [
                {
                    role: "system",
                    content:
                        DESK_SYSTEM +
                        "\nWrite a crisp daily desk brief (bullet points) for the sales manager. " +
                        "Prioritize hot leads, aging inventory, and follow-ups. No invented numbers.",
                },
                { role: "user", content: JSON.stringify(snapshot) },
            ],
            temperature: 0.35,
            max_completion_tokens: 900,
        });

        return NextResponse.json({
            data: {
                content: result.content,
                snapshot: {
                    open_leads: snapshot.open_leads,
                    hot_leads: snapshot.hot_leads,
                    aging_count: aging.length,
                },
                generated_at: new Date().toISOString(),
            },
        });
    } catch (err) {
        if (err instanceof MiniMaxNotConfiguredError) {
            return aiNotConfiguredResponse();
        }
        console.error("[ai/desk-brief]", err);
        return NextResponse.json(
            {
                error: err instanceof Error ? err.message : "Desk brief failed",
            },
            { status: 500 }
        );
    }
}
