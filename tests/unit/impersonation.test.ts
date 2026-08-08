import { describe, expect, it } from "vitest";
import {
  IMPERSONATE_STASH_MAX_AGE,
  applyAuthCookieOptions,
  clearStashCookieOptions,
  decodeStash,
  encodeStash,
  stashCookieOptions,
  type ImpersonateStash,
} from "@/src/lib/impersonation";

const sample: ImpersonateStash = {
  adminUserId: "admin-1",
  adminEmail: "admin@example.com",
  accessToken: "access-token",
  refreshToken: "refresh-token",
  targetUserId: "user-2",
  targetEmail: "target@example.com",
  targetFullName: "Target User",
  targetRole: "dealer_admin",
  stashedAt: 1_700_000_000_000,
};

describe("impersonation encode/decode", () => {
  it("round-trips stash payload", () => {
    const encoded = encodeStash(sample);
    expect(encoded).not.toContain("{");
    expect(decodeStash(encoded)).toEqual(sample);
  });

  it("returns null for missing / invalid / incomplete stash", () => {
    expect(decodeStash(undefined)).toBeNull();
    expect(decodeStash("not-base64!!!")).toBeNull();
    expect(
      decodeStash(
        Buffer.from(JSON.stringify({ adminUserId: "only" }), "utf8").toString(
          "base64url"
        )
      )
    ).toBeNull();
  });

  it("fills defaults for optional string fields", () => {
    const minimal = {
      adminUserId: "a",
      accessToken: "x",
      refreshToken: "y",
      targetUserId: "t",
    };
    const decoded = decodeStash(
      Buffer.from(JSON.stringify(minimal), "utf8").toString("base64url")
    );
    expect(decoded?.adminEmail).toBe("");
    expect(decoded?.targetFullName).toBeNull();
    expect(typeof decoded?.stashedAt).toBe("number");
  });
});

describe("impersonation cookie options", () => {
  it("sets httpOnly secure stash TTL", () => {
    expect(stashCookieOptions(true)).toMatchObject({
      httpOnly: true,
      secure: true,
      sameSite: "lax",
      path: "/",
      maxAge: IMPERSONATE_STASH_MAX_AGE,
    });
    expect(clearStashCookieOptions(false).maxAge).toBe(0);
  });

  it("applyAuthCookieOptions strips domain and forces path", () => {
    const opts = applyAuthCookieOptions(
      { domain: "evil.example", path: "/old" },
      { secure: true, maxAge: 60 }
    );
    expect(opts.domain).toBeUndefined();
    expect(opts).toMatchObject({
      httpOnly: true,
      secure: true,
      sameSite: "lax",
      path: "/",
      maxAge: 60,
    });
  });
});
