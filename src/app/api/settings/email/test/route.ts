// POST /api/settings/email/test — send a test email to the logged-in user.
// Honest: returns missingConfig + 503 when Resend / a from-address is not
// configured. Never fabricates a send.
import { NextRequest, NextResponse } from "next/server";
import { requireDealershipAccess } from "@/src/lib/auth-helpers";
import { resolveEmailFrom } from "@/src/lib/email/from";
import { isResendConfigured, sendEmail } from "@/src/lib/resend";
import { supabaseAdmin } from "@/src/lib/supabase-admin";

function esc(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export async function POST(req: NextRequest) {
  try {
    const auth = await requireDealershipAccess(req);
    if (auth.error || !auth.profile) {
      return NextResponse.json(
        { error: auth.error || "Unauthorized" },
        { status: auth.status || 401 }
      );
    }

    const to = auth.profile.email;
    if (!to) {
      return NextResponse.json(
        { error: "Your account has no email on file" },
        { status: 400 }
      );
    }

    let settings: Record<string, unknown> | null = null;
    if (auth.profile.dealership_id) {
      const { data: dealer } = await supabaseAdmin
        .from("dealerships")
        .select("settings")
        .eq("id", auth.profile.dealership_id)
        .maybeSingle();
      if (dealer?.settings && typeof dealer.settings === "object") {
        settings = dealer.settings as Record<string, unknown>;
      }
    }

    const resolved = resolveEmailFrom(settings);

    if (!isResendConfigured()) {
      return NextResponse.json(
        {
          ok: false,
          missingConfig: true,
          to,
          from: resolved.from,
          from_source: resolved.source,
          error:
            "Resend is not configured. Set RESEND_API_KEY and EMAIL_FROM in the Worker env (Settings → Integrations).",
        },
        { status: 503 }
      );
    }

    const sent = await sendEmail({
      to,
      from: resolved.from,
      subject: "FlashFender — test email",
      html: `<p style="font-family:system-ui,sans-serif;color:#111">This is a test email from FlashFender. If you received it, email is working.</p><p style="font-family:system-ui,sans-serif;color:#666;font-size:13px">Sender: ${esc(resolved.from)}</p>`,
      text: `This is a test email from FlashFender. If you received it, email is working.\n\nSender: ${resolved.from}`,
    });

    if (!sent.ok) {
      return NextResponse.json(
        {
          ok: false,
          error: sent.error,
          missingConfig: sent.missingConfig,
          to,
          from: resolved.from,
          from_source: resolved.source,
        },
        { status: sent.missingConfig ? 503 : 502 }
      );
    }

    return NextResponse.json({
      ok: true,
      resend_id: sent.id,
      to,
      from: resolved.from,
      from_source: resolved.source,
    });
  } catch (error: unknown) {
    console.error("settings email test POST:", error);
    return NextResponse.json(
      {
        ok: false,
        error:
          error instanceof Error
            ? error.message
            : "Failed to send test email",
      },
      { status: 500 }
    );
  }
}
