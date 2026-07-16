// lib/auth-helpers.ts
import { NextRequest, NextResponse } from "next/server";
import { supabase } from "./supabase";

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
}

export interface AuthResult {
    user: any | null;
    profile: UserProfile | null;
    error: string | null;
}

export async function getCurrentUser(req: NextRequest): Promise<AuthResult> {
    const authHeader = req.headers.get("authorization");
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
        return { user: null, profile: null, error: "Unauthorized - No token" };
    }

    const token = authHeader.split(" ")[1];

    // Set the session with the token
    await supabase.auth.setSession({
        access_token: token,
        refresh_token: "",
    });

    const { data: { user }, error } = await supabase.auth.getUser();

    if (error || !user) {
        return { user: null, profile: null, error: "Unauthorized - Invalid token" };
    }

    // Get user profile with dealership info
    const { data: profile, error: profileError } = await supabase
        .from("users")
        .select("*")
        .eq("id", user.id)
        .single();

    if (profileError || !profile) {
        return { user: null, profile: null, error: "Unauthorized - Profile not found" };
    }

    return { user, profile: profile as UserProfile, error: null };
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

    // Platform admins can access any dealership
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

    return { user, profile, error: null, dealership_id: targetDealershipId };
}

export function handleApiError(error: any) {
    console.error("API Error:", error);
    return {
        error: error.message || "Internal server error",
        status: error.status || 500,
    };
}