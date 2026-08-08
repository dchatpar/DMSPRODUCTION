// app/api/platform/reset-password/route.ts
import { createTokenClient } from "@/src/lib/server-token";
import { supabaseAdmin } from "@/src/lib/supabase-admin";
import { NextRequest, NextResponse } from "next/server";

// POST /api/platform/reset-password - Reset any user's password (platform admin only)
export async function POST(req: NextRequest) {
    try {
        let supabase;

        try {
            supabase = createTokenClient(req);
        } catch (error: unknown) {
            if (error instanceof Error && error.message === "MISSING_BEARER_TOKEN") {
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
        const { userId, newPassword } = payload;

        if (!userId) {
            return NextResponse.json({ error: "userId is required" }, { status: 400 });
        }

        // Get target user
        const { data: targetUser, error: targetError } = await supabase
            .from("users")
            .select("id, email, full_name, is_platform_admin")
            .eq("id", userId)
            .single();

        if (targetError || !targetUser) {
            return NextResponse.json({ error: "User not found" }, { status: 404 });
        }

        // Cannot reset password of another platform admin
        if (targetUser.is_platform_admin && targetUser.id !== user.id) {
            return NextResponse.json({ error: "Cannot reset password of another platform admin" }, { status: 403 });
        }

        // Generate password if not provided
        const tempPassword = newPassword || generateSecurePassword();

        // Update password via Supabase Admin
        const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(
            targetUser.id,
            { password: tempPassword }
        );

        if (updateError) {
            return NextResponse.json({ error: updateError.message }, { status: 400 });
        }

        // Log audit action
        await supabase.rpc("log_audit_action", {
            p_action: "platform.reset_password",
            p_entity_type: "user",
            p_entity_id: targetUser.id,
            p_actor_id: user.id,
            p_target_id: targetUser.id,
            p_metadata: JSON.stringify({ target_email: targetUser.email }),
        });

        return NextResponse.json({
            success: true,
            message: `Password reset successfully for ${targetUser.email}`,
            temporary_password: newPassword ? undefined : tempPassword,
        });
    } catch (error: unknown) {
        console.error("Error resetting password:", error);
        return NextResponse.json(
            { error: error instanceof Error ? error.message : "Internal server error" },
            { status: 500 }
        );
    }
}

function generateSecurePassword(): string {
    const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789!@#$%";
    let password = "";
    for (let i = 0; i < 12; i++) {
        password += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return password;
}
