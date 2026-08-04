import { NextRequest, NextResponse } from "next/server";
import { requireDealershipAccess, jsonAuthError } from "@/src/lib/auth-helpers";
import { isMiniMaxConfigured, MINIMAX_MODEL } from "@/src/lib/ai/minimax";
import { AI_NOT_CONFIGURED_MESSAGE } from "@/src/lib/ai/guard";

/** GET /api/ai/status — configured flag only (no secret values). */
export async function GET(req: NextRequest) {
    const auth = await requireDealershipAccess(req);
    if (auth.error || !auth.profile) {
        return jsonAuthError(auth);
    }

    const configured = isMiniMaxConfigured();
    return NextResponse.json({
        data: {
            configured,
            model: configured ? MINIMAX_MODEL : null,
            provider: "minimax",
            message: configured
                ? "MiniMax ready (server-side only)."
                : AI_NOT_CONFIGURED_MESSAGE,
        },
    });
}
