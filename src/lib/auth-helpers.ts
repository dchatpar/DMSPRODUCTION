// lib/auth-helpers.ts
// F-02 of the v3 master plan: cookie-first authentication.
//
// `getCurrentUser` is the single chokepoint that every API route uses to
// resolve the caller. Resolution order:
//
//   1. Try the cookie-backed Supabase session (the F-02 default path).
//      This is what `proxy.ts` refreshes on every request.
//   2. If no cookie session, fall back to the legacy `Authorization: Bearer
//      <token>` header. This keeps older client code and external callers
//      working while the cookie migration rolls out.
//
// Profile (dealership_id, role, is_platform_admin, is_active) is always
// fetched fresh from the DB on each call — cheap, and it means role/active
// changes take effect immediately without a re-login.

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "./server";
import { createTokenClient, MissingBearerError } from "./server-token";
import { shouldScopeToAssigned } from "./permission-middleware";
import { supabaseAdmin } from "./supabase-admin";
import { getDealershipTrialState, trialExpiredResponse } from "./trial";

export interface UserProfile {
    id: string;
    email: string;
    role: string;
    dealership_id: string | null;
    is_platform_admin: boolean;
    full_name: string | null;
    phone: string | null;
    avatar: string | null;
    is_active: boolean;
    /** Per-user permission overrides layered on top of role permissions. */
    user_permissions?: string[];
}

export interface AuthResult {
    user: any | null;
    profile: UserProfile | null;
    error: string | null;
    /** HTTP status hint for denied auth (e.g. 402 trial expired). */
    status?: number;
    code?: string;
}

/**
 * Resolve the caller from cookies first, then bearer fallback.
 * Returns the first successful resolution; on both failures, returns an
 * error describing which mode was attempted.
 */
export async function getCurrentUser(req: NextRequest): Promise<AuthResult> {
    // --- Path 1: cookie-backed session (F-02 default) ---
    try {
        const cookieResult = await resolveFromCookie(req);
        if (cookieResult) return cookieResult;
    } catch (err) {
        // Cookie path failed for some other reason — log but continue
        // to bearer fallback so the caller still gets a chance.
        console.warn("[auth] cookie resolution failed:", (err as Error)?.message);
    }

    // --- Path 2: legacy bearer-token header ---
    try {
        const bearerResult = await resolveFromBearer(req);
        if (bearerResult) return bearerResult;
    } catch (err) {
        if (!(err instanceof MissingBearerError)) {
            console.warn("[auth] bearer resolution failed:", (err as Error)?.message);
        }
    }

    return { user: null, profile: null, error: "Unauthorized - No valid session" };
}

async function resolveFromCookie(req: NextRequest): Promise<AuthResult | null> {
    const supabase = await createClient(req);
    const { data: { user }, error } = await supabase.auth.getUser();
    if (error || !user) return null;

    const profile = await fetchProfile(supabase, user.id);
    if (!profile) return null;

    return { user, profile, error: null };
}

async function resolveFromBearer(req: NextRequest): Promise<AuthResult | null> {
    const supabase = createTokenClient(req);
    const { data: { user }, error } = await supabase.auth.getUser();
    if (error || !user) return null;

    const profile = await fetchProfile(supabase, user.id);
    if (!profile) return null;

    return { user, profile, error: null };
}

async function fetchProfile(supabase: any, userId: string): Promise<UserProfile | null> {
    const { data: profile, error } = await supabase
        .from("users")
        .select("*")
        .eq("id", userId)
        .single();
    if (error || !profile) return null;
    return profile as UserProfile;
}

export async function requirePlatformAdmin(req: NextRequest): Promise<AuthResult> {
    const { user, profile, error } = await getCurrentUser(req);

    if (error || !user || !profile) {
        return { user: null, profile: null, error: error || "Unauthorized" };
    }

    if (!profile.is_platform_admin) {
        return { user: null, profile: null, error: "Forbidden - Platform admin access required" };
    }

    return { user, profile, error: null };
}

export async function requireAdmin(req: NextRequest): Promise<AuthResult> {
    const { user, profile, error } = await getCurrentUser(req);

    if (error || !user || !profile) {
        return { user: null, profile: null, error: error || "Unauthorized" };
    }

    // Platform admins have full access
    if (profile.is_platform_admin) {
        return { user, profile, error: null };
    }

    if (profile.role !== "Admin") {
        return { user: null, profile: null, error: "Forbidden - Admin only" };
    }

    if (!profile.is_active) {
        return { user: null, profile: null, error: "Forbidden - User account is inactive" };
    }

    return { user, profile, error: null };
}

export async function requireManager(req: NextRequest): Promise<AuthResult> {
    const { user, profile, error } = await getCurrentUser(req);

    if (error || !user || !profile) {
        return { user: null, profile: null, error: error || "Unauthorized" };
    }

    // Platform admins have full access
    if (profile.is_platform_admin) {
        return { user, profile, error: null };
    }

    const allowedRoles = ["Admin", "Manager"];
    if (!allowedRoles.includes(profile.role)) {
        return { user: null, profile: null, error: "Forbidden - Manager or Admin required" };
    }

    if (!profile.is_active) {
        return { user: null, profile: null, error: "Forbidden - User account is inactive" };
    }

    return { user, profile, error: null };
}

export async function getUserDealership(req: NextRequest): Promise<{ dealership_id: string | null; error: string | null }> {
    const { profile, error } = await getCurrentUser(req);

    if (error || !profile) {
        return { dealership_id: null, error: error || "Unauthorized" };
    }

    if (!profile.dealership_id) {
        return { dealership_id: null, error: "User is not associated with any dealership" };
    }

    return { dealership_id: profile.dealership_id, error: null };
}

export async function requireDealershipAccess(req: NextRequest, dealershipId?: string): Promise<AuthResult & { dealership_id: string }> {
    const { user, profile, error } = await getCurrentUser(req);

    if (error || !user || !profile) {
        return { user: null, profile: null, error: error || "Unauthorized", dealership_id: "" };
    }

    if (!profile.is_active) {
        return { user: null, profile: null, error: "Forbidden - User account is inactive", dealership_id: "" };
    }

    // Platform admins can access any dealership (never trial-locked)
    if (profile.is_platform_admin) {
        return { user, profile, error: null, dealership_id: dealershipId || "" };
    }

    const targetDealershipId = dealershipId || profile.dealership_id;

    if (!targetDealershipId) {
        return { user: null, profile: null, error: "No dealership context", dealership_id: "" };
    }

    // Users can only access their own dealership's data
    if (profile.dealership_id && profile.dealership_id !== targetDealershipId) {
        return { user: null, profile: null, error: "Forbidden - Dealership access denied", dealership_id: targetDealershipId };
    }

    // Soft-lock expired SaaS trials on mutating methods only.
    // Login remains allowed; GETs still work so UI can show the lock screen.
    const method = req.method.toUpperCase();
    if (method !== "GET" && method !== "HEAD" && method !== "OPTIONS") {
        const trial = await getDealershipTrialState(targetDealershipId);
        if (trial.softLocked) {
            const body = trialExpiredResponse();
            return {
                user: null,
                profile: null,
                error: body.message,
                status: 402,
                code: body.code,
                dealership_id: targetDealershipId,
            };
        }
    }

    return { user, profile, error: null, dealership_id: targetDealershipId };
}

/** Map an AuthResult denial to a JSON response (honors 402 trial soft-lock). */
export function jsonAuthError(auth: AuthResult): NextResponse {
    const status = auth.status || 401;
    return NextResponse.json(
        {
            error: auth.error || "Unauthorized",
            ...(auth.code ? { code: auth.code } : {}),
            ...(status === 402 ? trialExpiredResponse() : {}),
        },
        { status }
    );
}

/**
 * Soft-lock gate for API routes that do not use requireDealershipAccess.
 * Returns a 402 NextResponse when the caller's dealership trial is expired.
 * Platform admins and users without a dealership skip the gate.
 */
export async function denyIfTrialExpired(
    req: NextRequest,
    profile: UserProfile | null
): Promise<NextResponse | null> {
    if (!profile || profile.is_platform_admin || !profile.dealership_id) {
        return null;
    }
    const method = req.method.toUpperCase();
    if (method === "GET" || method === "HEAD" || method === "OPTIONS") {
        return null;
    }
    const trial = await getDealershipTrialState(profile.dealership_id);
    if (!trial.softLocked) return null;
    return NextResponse.json(trialExpiredResponse(), { status: 402 });
}

/**
 * Returns the right Supabase client for the caller's role.
 *
 * P1-1 fix: platform admins get `supabaseAdmin` (service-role client, RLS
 * bypass) so they can read/write across dealerships. Everyone else gets
 * the request-scoped `createTokenClient` which carries the caller's
 * identity into the JWT and applies RLS as `auth.uid()`.
 *
 * Why a helper and not a per-route `if (isPlatformAdmin) supabaseAdmin`?
 * - Single chokepoint so a future audit can grep for "supabaseAdmin usage".
 * - Forces every route that touches data to make the platform-admin
 *   decision explicitly (and on every call, not just at startup).
 * - Keeps RLS active for the 99% case; only platform admins skip it.
 *
 * Returns `{ supabase, isPlatformAdmin }` so the caller can log/audit the
 * privileged path if they want.
 */
export function pickSupabaseClient(req: NextRequest, profile: UserProfile): {
    supabase: ReturnType<typeof createTokenClient> | typeof supabaseAdmin;
    isPlatformAdmin: boolean;
} {
    if (profile.is_platform_admin) {
        return { supabase: supabaseAdmin, isPlatformAdmin: true };
    }
    return { supabase: createTokenClient(req), isPlatformAdmin: false };
}

export function handleApiError(error: any) {
    console.error("API Error:", error);
    return {
        error: error.message || "Internal server error",
        status: error.status || 500,
    };
}

/**
 * Result of an ownership assertion. Returned from assertOwnership.
 * Callers should check `allowed` and short-circuit with a 403/404 if false.
 */
export interface OwnershipResult {
    allowed: boolean;
    error: string | null;
    status: number; // 403 for ownership, 404 if row missing, 200 if allowed
}

/**
 * IDOR fix (F-01 of the v3 master plan).
 *
 * Asserts that a row belongs to the caller's dealership, and (if the caller
 * is scoped to assigned records only) that the row is assigned to the caller.
 *
 * Pass the row you fetched from the DB; this function does NOT re-query.
 * If `row` is null/undefined, returns 404 (the row doesn't exist for you).
 *
 * Platform admins always pass. Admins + Managers pass as long as the
 * row is in *some* dealership (we don't filter by assigned_to for them
 * unless you pass `options.strictAssignment = true`).
 *
 * Salesperson/Staff with `assigned_to` on the row: must be assigned to them
 * (unless `options.strictAssignment = false`).
 *
 * Salesperson/Staff without `assigned_to`: passes (unassigned records are
 * visible to everyone in the dealership).
 */
export function assertOwnership(
    row: { dealership_id?: string | null; assigned_to?: string | null } | null | undefined,
    profile: UserProfile,
    options: { strictAssignment?: boolean } = {}
): OwnershipResult {
    if (!row) {
        return { allowed: false, error: "Not found", status: 404 };
    }

    // Platform admins pass anything
    if (profile.is_platform_admin) {
        return { allowed: true, error: null, status: 200 };
    }

    // Dealership must match
    if (!row.dealership_id || row.dealership_id !== profile.dealership_id) {
        // Don't leak existence — return 404, not 403
        return { allowed: false, error: "Not found", status: 404 };
    }

    // Salesperson/Staff assigned-record scoping
    const strictAssignment = options.strictAssignment ?? true;
    if (strictAssignment && shouldScopeToAssigned(profile.role, profile.user_permissions || [])) {
        // If the row has an assignee and it's not the caller, deny
        if (row.assigned_to && row.assigned_to !== profile.id) {
            return { allowed: false, error: "Forbidden - Not assigned to you", status: 403 };
        }
        // If row.assigned_to is null, it's unassigned — visible to the team
    }

    return { allowed: true, error: null, status: 200 };
}

/**
 * Convenience: do the assertion and return a NextResponse if denied.
 * Returns null if allowed. Use as:
 *
 *   const deny = assertOwnershipOrDeny(row, profile);
 *   if (deny) return deny;
 */
export function assertOwnershipOrDeny(
    row: { dealership_id?: string | null; assigned_to?: string | null } | null | undefined,
    profile: UserProfile,
    options: { strictAssignment?: boolean } = {}
): NextResponse | null {
    const result = assertOwnership(row, profile, options);
    if (result.allowed) return null;
    return NextResponse.json({ error: result.error }, { status: result.status });
}

/**
 * Field whitelist for PATCH/PUT payloads.
 * Strips any field not in the allowed list. Use as:
 *
 *   const safe = pickAllowed(payload, ['name', 'email', 'phone', 'assigned_to']);
 *   await supabase.from('customers').update(safe).eq('id', id);
 */
export function pickAllowed<T extends Record<string, any>>(
    payload: T,
    allowedFields: readonly string[]
): Partial<T> {
    const out: Partial<T> = {};
    for (const k of allowedFields) {
        if (k in payload) {
            (out as any)[k] = payload[k];
        }
    }
    return out;
}