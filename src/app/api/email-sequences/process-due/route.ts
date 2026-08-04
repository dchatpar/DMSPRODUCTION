/**
 * Alias of /api/email-sequences/send-due (Wave M1).
 * Prefer send-due — kept for docs that mention process-due.
 */
import { POST as sendDue } from "../send-due/route";
import type { NextRequest } from "next/server";

export async function POST(req: NextRequest) {
    return sendDue(req);
}
