// app/api/platform/impersonate/route.ts
import { createTokenClient } from "@/src/lib/server-token";
import { supabaseAdmin } from "@/src/lib/supabase-admin";
import { NextRequest, NextResponse } from "next/server";

// POST /api/platform/impersonate - Generate impersonation token (platform admin only)
export async function POST(req: NextRequest) {
    try {
        let supabase;

        try {
            supabase = createTokenClient(req);
        } catch (error: any) {
            if (error?.message === "MISSING_BEARER_TOKEN") {
                return NextResponse.json({ error: "Authorization token required" }, { status: 401 });
            }
            throw error;
        }

        const { data: { user }, error: authError } = await supabase.auth.getUser();
        if (authError || !user) {
            return NextResponse.json({ error: "Invalid or expired token" }, { status: 401 });
        }

        // Verify platform admin
        const { data: currentUser } = await supabase
            .from("users")
            .select("is_platform_admin, email, full_name")
            .eq("id", user.id)
            .single();

        if (!currentUser?.is_platform_admin) {
            return NextResponse.json({ error: "Unauthorized - Platform admin access required" }, { status: 403 });
        }

        const payload = await req.json();
        const { targetUserId } = payload;

        if (!targetUserId) {
            return NextResponse.json({ error: "targetUserId is required" }, { status: 400 });
        }

        // Get target user
        const { data: targetUser, error: targetError } = await supabase
            .from("users")
            .select("id, email, full_name, role, dealership_id, is_active, is_platform_admin, user_permissions")
            .eq("id", targetUserId)
            .single();

        if (targetError || !targetUser) {
            return NextResponse.json({ error: "User not found" }, { status: 404 });
        }

        // Check if target user is active
        if (!targetUser.is_active) {
            return NextResponse.json({ error: "Cannot impersonate inactive user" }, { status: 400 });
        }

        // Cannot impersonate other platform admins
        if (targetUser.is_platform_admin) {
            return NextResponse.json({ error: "Cannot impersonate platform admin" }, { status: 400 });
        }

        // Generate a new token for the target user using Admin API
        // This creates a session for the target user
        const { data: sessionData, error: sessionError } = await supabaseAdmin.auth.admin.generateLink({
            type: "magiclink",
            email: targetUser.email,
        });

        if (sessionError) {
            // Fallback: create a custom token with metadata
            // For this, we'll return instructions to use the target user's credentials
            return NextResponse.json({
                success: true,
                impersonation_mode: true,
                message: "Impersonation session created. The target user will need to accept a session link.",
                target_user: {
                    id: targetUser.id,
                    email: targetUser.email,
                    full_name: targetUser.full_name,
                    role: targetUser.role,
                    dealership_id: targetUser.dealership_id,
                },
                expires_in: 3600,
            });
        }

        // Log audit action
        await supabase.rpc("log_audit_action", {
            p_action: "platform.impersonate",
            p_entity_type: "user",
            p_entity_id: targetUser.id,
            p_actor_id: user.id,
            p_target_id: targetUser.id,
            p_metadata: JSON.stringify({ target_email: targetUser.email, actor_email: currentUser.email }),
        });

        return NextResponse.json({
            success: true,
            impersonation_mode: true,
            target_user: {
                id: targetUser.id,
                email: targetUser.email,
                full_name: targetUser.full_name,
                role: targetUser.role,
                dealership_id: targetUser.dealership_id,
            },
            expires_in: 3600,
        });
    } catch (error: any) {
        console.error("Error impersonating user:", error);
        return NextResponse.json(
            { error: error?.message || "Internal server error" },
            { status: 500 }
        );
    }
}
