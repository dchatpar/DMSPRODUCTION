// lib/auth-helpers.ts
import { NextRequest, NextResponse } from "next/server";
import { supabase } from "./supabase";

export async function getCurrentUser(req: NextRequest) {
    const authHeader = req.headers.get("authorization");
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
        return { user: null, error: "Unauthorized - No token" };
    }

    const token = authHeader.split(" ")[1];

    // Set the session with the token
    await supabase.auth.setSession({
        access_token: token,
        refresh_token: "",
    });

    const { data: { user }, error } = await supabase.auth.getUser();

    if (error || !user) {
        return { user: null, error: "Unauthorized - Invalid token" };
    }

    return { user, error: null };
}

export async function requireAdmin(req: NextRequest) {
    const { user, error } = await getCurrentUser(req);

    if (error || !user) {
        return { user: null, error: "Unauthorized" };
    }

    // Check if user is admin from your users table
    const { data: profile, error: profileError } = await supabase
        .from("users")
        .select("role")
        .eq("id", user.id)
        .single();

    if (profileError || !profile || profile.role !== "Admin") {
        return { user: null, error: "Forbidden - Admin only" };
    }

    return { user, error: null };
}

export function handleApiError(error: any) {
    console.error("API Error:", error);
    return {
        error: error.message || "Internal server error",
        status: error.status || 500,
    };
}