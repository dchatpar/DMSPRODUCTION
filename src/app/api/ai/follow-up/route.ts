import { NextRequest, NextResponse } from "next/server";
import { chatCompletion, MiniMaxNotConfiguredError } from "@/src/lib/ai/minimax";
import {
    DESK_SYSTEM,
    requireAiCaller,
    aiNotConfiguredResponse,
} from "@/src/lib/ai/guard";
import { supabaseAdmin } from "@/src/lib/supabase-admin";

/**
 * POST /api/ai/follow-up — CASL-aware lead follow-up draft.
 * Never marks Sent. Human must copy/send.
 */
export async function POST(req: NextRequest) {
    try {
        const gate = await requireAiCaller(req);
        if (!gate.ok) return gate.response;

        const body = await req.json().catch(() => ({}));
        const leadId = typeof body.lead_id === "string" ? body.lead_id : "";
        const channel =
            body.channel === "sms" ? "sms" : ("email" as "email" | "sms");

        if (!leadId) {
            return NextResponse.json(
                { error: "lead_id is required" },
                { status: 400 }
            );
        }

        const { data: lead, error } = await supabaseAdmin
            .from("leads")
            .select(
                `id, status, source, notes, temperature, dealership_id,
                 customer:customers(id, name, first_name, last_name, email, phone, marketing_consent, sms_consent),
                 interest_vehicle:vehicles(id, year, make, model, stock_number, retail_price)`
            )
            .eq("id", leadId)
            .eq("dealership_id", gate.dealershipId)
            .maybeSingle();

        if (error) throw error;
        if (!lead) {
            return NextResponse.json({ error: "Lead not found" }, { status: 404 });
        }

        const customer = Array.isArray(lead.customer)
            ? lead.customer[0]
            : lead.customer;
        const consentOk =
            channel === "sms"
                ? Boolean(
                      (customer as { sms_consent?: boolean } | null)?.sms_consent
                  )
                : Boolean(
                      (customer as { marketing_consent?: boolean } | null)
                          ?.marketing_consent !== false
                  );

        const result = await chatCompletion({
            messages: [
                {
                    role: "system",
                    content:
                        DESK_SYSTEM +
                        `\nDraft a ${channel} follow-up for a lead. CASL-aware: include unsubscribe/opt-out language for email; keep SMS short. ` +
                        "Return JSON only: {\"subject\": string|null, \"body\": string, \"casl_note\": string}. " +
                        "Do NOT claim the message was sent.",
                },
                {
                    role: "user",
                    content: JSON.stringify({
                        channel,
                        lead_status: lead.status,
                        source: lead.source,
                        notes: lead.notes,
                        temperature: lead.temperature,
                        customer_first_name:
                            (customer as { first_name?: string } | null)
                                ?.first_name ||
                            (customer as { name?: string } | null)?.name ||
                            "there",
                        vehicle: lead.interest_vehicle,
                        consent_flag_present: consentOk,
                        intent: body.intent || "check_in",
                    }),
                },
            ],
            temperature: 0.5,
            max_completion_tokens: 700,
        });

        let parsed: {
            subject?: string | null;
            body?: string;
            casl_note?: string;
        } = {};
        try {
            const raw = result.content
                .replace(/^```json\s*/i, "")
                .replace(/```$/i, "")
                .trim();
            parsed = JSON.parse(raw) as typeof parsed;
        } catch {
            parsed = {
                subject: channel === "email" ? "Following up" : null,
                body: result.content,
                casl_note: "Review for CASL before send.",
            };
        }

        return NextResponse.json({
            data: {
                channel,
                subject: parsed.subject ?? null,
                body: parsed.body || result.content,
                content: parsed.body || result.content,
                casl_note:
                    parsed.casl_note ||
                    "Draft only — human must review and send. Not marked Sent.",
                sent: false,
                draft: true,
                consent_warning: consentOk
                    ? null
                    : "Consent flag missing or false — confirm CASL before any commercial send.",
                lead_id: lead.id,
            },
        });
    } catch (err) {
        if (err instanceof MiniMaxNotConfiguredError) {
            return aiNotConfiguredResponse();
        }
        console.error("[ai/follow-up]", err);
        return NextResponse.json(
            {
                error:
                    err instanceof Error ? err.message : "Follow-up draft failed",
            },
            { status: 500 }
        );
    }
}
