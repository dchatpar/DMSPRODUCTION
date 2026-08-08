// Shared impersonation stash cookie helpers.
// Stash holds admin recovery tokens so Exit can restore the platform-admin session.

import type { NextRequest } from "next/server";

export const IMPERSONATE_STASH_COOKIE = "ff_impersonate_stash";
/** Support sessions — short TTL; Exit must happen before expiry. */
export const IMPERSONATE_STASH_MAX_AGE = 60 * 60 * 2; // 2 hours

export type ImpersonateStash = {
  adminUserId: string;
  adminEmail: string;
  accessToken: string;
  refreshToken: string;
  targetUserId: string;
  targetEmail: string;
  targetFullName: string | null;
  targetRole: string | null;
  stashedAt: number;
};

export function isSecureRequest(req: NextRequest): boolean {
  if (process.env.NODE_ENV === "production") return true;
  const proto =
    req.headers.get("x-forwarded-proto") ||
    req.nextUrl.protocol.replace(":", "");
  return proto === "https";
}

export function applyAuthCookieOptions(
  options: Record<string, unknown> | undefined,
  { secure, maxAge }: { secure: boolean; maxAge?: number }
): Record<string, unknown> {
  const merged: Record<string, unknown> = {
    ...options,
    httpOnly: true,
    secure,
    sameSite: "lax",
    path: "/",
  };
  delete merged.domain;
  if (typeof maxAge === "number") {
    merged.maxAge = maxAge;
  }
  return merged;
}

export function encodeStash(stash: ImpersonateStash): string {
  return Buffer.from(JSON.stringify(stash), "utf8").toString("base64url");
}

export function decodeStash(raw: string | undefined): ImpersonateStash | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(
      Buffer.from(raw, "base64url").toString("utf8")
    ) as Partial<ImpersonateStash>;
    if (
      typeof parsed.adminUserId !== "string" ||
      typeof parsed.refreshToken !== "string" ||
      typeof parsed.accessToken !== "string" ||
      typeof parsed.targetUserId !== "string"
    ) {
      return null;
    }
    return {
      adminUserId: parsed.adminUserId,
      adminEmail: typeof parsed.adminEmail === "string" ? parsed.adminEmail : "",
      accessToken: parsed.accessToken,
      refreshToken: parsed.refreshToken,
      targetUserId: parsed.targetUserId,
      targetEmail:
        typeof parsed.targetEmail === "string" ? parsed.targetEmail : "",
      targetFullName:
        typeof parsed.targetFullName === "string" ? parsed.targetFullName : null,
      targetRole:
        typeof parsed.targetRole === "string" ? parsed.targetRole : null,
      stashedAt:
        typeof parsed.stashedAt === "number" ? parsed.stashedAt : Date.now(),
    };
  } catch {
    return null;
  }
}

export function stashCookieOptions(secure: boolean): Record<string, unknown> {
  return {
    httpOnly: true,
    secure,
    sameSite: "lax" as const,
    path: "/",
    maxAge: IMPERSONATE_STASH_MAX_AGE,
  };
}

export function clearStashCookieOptions(secure: boolean): Record<string, unknown> {
  return {
    httpOnly: true,
    secure,
    sameSite: "lax" as const,
    path: "/",
    maxAge: 0,
  };
}
