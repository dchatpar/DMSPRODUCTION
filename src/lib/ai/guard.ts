/**
 * Shared auth / honesty helpers for /api/ai/* routes.
 */

import { NextRequest, NextResponse } from "next/server";
import {
    jsonAuthError,
    requireDealershipAccess,
    type UserProfile,
} from "@/src/lib/auth-helpers";
import { isFlashAiConfigured } from "@/src/lib/ai/llm";

export const AI_NOT_CONFIGURED_MESSAGE =
    "Flash AI not configured — add via wrangler when ready.";

export function aiNotConfiguredResponse(): NextResponse {
    return NextResponse.json(
        {
            error: AI_NOT_CONFIGURED_MESSAGE,
            code: "flash_ai_not_configured",
            configured: false,
        },
        { status: 503 }
    );
}

export async function requireAiCaller(
    req: NextRequest
): Promise<
    | { ok: true; profile: UserProfile; dealershipId: string }
    | { ok: false; response: NextResponse }
> {
    const auth = await requireDealershipAccess(req);
    if (auth.error || !auth.profile) {
        return { ok: false, response: jsonAuthError(auth) };
    }

    const dealershipId = auth.profile.dealership_id;
    if (!dealershipId && !auth.profile.is_platform_admin) {
        return {
            ok: false,
            response: NextResponse.json(
                { error: "No dealership context" },
                { status: 403 }
            ),
        };
    }

    if (!dealershipId) {
        return {
            ok: false,
            response: NextResponse.json(
                {
                    error:
                        "Platform admin must operate within a dealership context for AI tools",
                },
                { status: 400 }
            ),
        };
    }

    if (!isFlashAiConfigured()) {
        return { ok: false, response: aiNotConfiguredResponse() };
    }

    return { ok: true, profile: auth.profile, dealershipId };
}

export const DESK_SYSTEM = `You are Flash AI, a desk copilot for a Canadian (Ontario) used-car dealership using FlashFender DMS.
Rules:
- Be concise, practical, and honest. Never invent inventory, prices, floors, customers, or "Sent" status.
- Only use tool data for facts. If tools return nothing, say so.
- Do not expose purchase_price, floors, or cost basis. Retail/special asking price only.
- CASL: draft emails/SMS are drafts only — human must review and send. Never claim a message was sent.
- Ontario MVDA: disclosure helpers are drafts requiring human confirm before save.
- Currency: CAD. Tone: professional dealership desk.
- Never include chain-of-thought, reasoning tags, or <think> blocks in user-visible output. Reply as Flash AI only.`;
