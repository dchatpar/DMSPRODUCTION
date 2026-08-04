// src/lib/resend.ts
// Thin Resend wrapper. If RESEND_API_KEY is missing, send helpers return
// a clear error — never fake a successful send.

export type SendEmailInput = {
  to: string;
  subject: string;
  html: string;
  text?: string;
};

export type SendEmailResult =
  | { ok: true; id: string }
  | { ok: false; error: string; missingConfig?: boolean };

export function isResendConfigured(): boolean {
  return Boolean(process.env.RESEND_API_KEY && process.env.EMAIL_FROM);
}

export function getEmailFrom(): string {
  return (
    process.env.EMAIL_FROM ||
    "FlashFender <noreply@flashfender.com>"
  );
}

export async function sendEmail(input: SendEmailInput): Promise<SendEmailResult> {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    return {
      ok: false,
      missingConfig: true,
      error:
        "RESEND_API_KEY is not configured. Set RESEND_API_KEY and EMAIL_FROM (verified domain) in the Worker env.",
    };
  }

  const from = process.env.EMAIL_FROM;
  if (!from) {
    return {
      ok: false,
      missingConfig: true,
      error:
        "EMAIL_FROM is not configured. Example: FlashFender <noreply@flashfender.com>",
    };
  }

  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from,
        to: [input.to],
        subject: input.subject,
        html: input.html,
        text: input.text,
      }),
    });

    const body = (await res.json().catch(() => ({}))) as {
      id?: string;
      message?: string;
      name?: string;
    };

    if (!res.ok) {
      return {
        ok: false,
        error: body.message || body.name || `Resend error (${res.status})`,
      };
    }

    return { ok: true, id: body.id || "unknown" };
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : "Failed to send email",
    };
  }
}

export function otpEmailHtml(opts: { code: string; purpose: "signup" | "login" }): {
  subject: string;
  html: string;
  text: string;
} {
  const label =
    opts.purpose === "signup" ? "Verify your email" : "Your login code";
  const subject = `${label}: ${opts.code}`;
  const text = `${label}\n\nYour code is ${opts.code}. It expires in 15 minutes.\n\nIf you did not request this, ignore this email.`;
  const html = `
    <div style="font-family:system-ui,sans-serif;max-width:480px;margin:0 auto;padding:24px;color:#111">
      <h1 style="font-size:20px;margin:0 0 12px">${label}</h1>
      <p style="margin:0 0 16px;color:#444">Use this code to continue. It expires in 15 minutes.</p>
      <p style="font-size:32px;letter-spacing:6px;font-weight:700;margin:0 0 16px">${opts.code}</p>
      <p style="margin:0;color:#888;font-size:13px">If you did not request this, you can ignore this email.</p>
    </div>
  `;
  return { subject, html, text };
}

export function resetPasswordEmailHtml(opts: {
  resetUrl: string;
}): { subject: string; html: string; text: string } {
  const subject = "Reset your FlashFender password";
  const text = `Reset your password:\n\n${opts.resetUrl}\n\nThis link expires in 30 minutes. If you did not request a reset, ignore this email.`;
  const html = `
    <div style="font-family:system-ui,sans-serif;max-width:480px;margin:0 auto;padding:24px;color:#111">
      <h1 style="font-size:20px;margin:0 0 12px">Reset your password</h1>
      <p style="margin:0 0 16px;color:#444">Click the button below to choose a new password. This link expires in 30 minutes.</p>
      <p style="margin:0 0 16px">
        <a href="${opts.resetUrl}" style="display:inline-block;background:#111;color:#fff;text-decoration:none;padding:12px 18px;border-radius:8px">Reset password</a>
      </p>
      <p style="margin:0;color:#888;font-size:13px">If you did not request this, you can ignore this email.</p>
    </div>
  `;
  return { subject, html, text };
}
