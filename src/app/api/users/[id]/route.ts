// app/api/users/[id]/route.ts
import { createTokenClient } from "@/src/lib/server-token";
import { supabaseAdmin } from "@/src/lib/supabase-admin";
import { NextRequest, NextResponse } from "next/server";
import { assertOwnershipOrDeny, pickAllowed, requireDealershipAccess } from "@/src/lib/auth-helpers";

const USER_ALLOWED_FIELDS = [
    "full_name", "role", "phone", "avatar", "start_date", "user_permissions", "is_active",
] as const;

const USER_PLATFORM_ADMIN_ALLOWED_FIELDS = [
    ...USER_ALLOWED_FIELDS, "is_platform_admin",
] as const;

// GET single user
export async function GET(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const auth = await requireDealershipAccess(req);
        if (auth.error || !auth.profile) {
            return NextResponse.json(
                { error: auth.error || "Unauthorized" },
                { status: 401 }
            );
        }

        let supabase;
        try {
            supabase = createTokenClient(req);
        } catch (error: any) {
            if (error?.message === "MISSING_BEARER_TOKEN") {
                return NextResponse.json(
                    { error: "Authorization token required" },
                    { status: 401 }
                );
            }
            throw error;
        }

        const isPlatformAdmin = auth.profile.is_platform_admin;
        const isAdmin = auth.profile.role === "Admin";

        if (!isPlatformAdmin && !isAdmin) {
            return NextResponse.json({ error: "Unauthorized - Admin access required" }, { status: 403 });
        }

        const { id } = await params;

        // Narrow fetch first to assert ownership
        const { data: existing, error: existingError } = await supabase
            .from("users")
            .select("id, dealership_id, is_platform_admin")
            .eq("id", id)
            .single();

        if (existingError || !existing) {
            return NextResponse.json({ error: "User not found" }, { status: 404 });
        }

        const deny = assertOwnershipOrDeny(existing, auth.profile);
        if (deny) return deny;

        // Get target user
        const { data: targetUser, error: dbError } = await supabase
            .from("users")
            .select("id,avatar,full_name,role,email,phone,start_date,created_at,updated_at,user_permissions,dealership_id,is_active")
            .eq("id", id)
            .single();

        if (dbError || !targetUser) {
            return NextResponse.json({ error: "User not found" }, { status: 404 });
        }

        return NextResponse.json({ data: targetUser });
    } catch (error: any) {
        console.error("Error fetching user:", error);
        return NextResponse.json(
            { error: error?.message || "Internal server error" },
            { status: 500 }
        );
    }
}

// PATCH update user (or suspend/reactivate)
export async function PATCH(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const auth = await requireDealershipAccess(req);
        if (auth.error || !auth.profile) {
            return NextResponse.json(
                { error: auth.error || "Unauthorized" },
                { status: 401 }
            );
        }

        let supabase;
        try {
            supabase = createTokenClient(req);
        } catch (error: any) {
            if (error?.message === "MISSING_BEARER_TOKEN") {
                return NextResponse.json(
                    { error: "Authorization token required" },
                    { status: 401 }
                );
            }
            throw error;
        }

        const isPlatformAdmin = auth.profile.is_platform_admin;
        const isAdmin = auth.profile.role === "Admin";

        if (!isPlatformAdmin && !isAdmin) {
            return NextResponse.json({ error: "Unauthorized - Admin access required" }, { status: 403 });
        }

        const { id } = await params;
        const url = new URL(req.url);
        const action = url.searchParams.get("action");

        // Handle suspend/reactivate action
        if (action === "suspend" || action === "reactivate") {
            // Only platform admin or admin can suspend
            if (!isPlatformAdmin && !isAdmin) {
                return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
            }

            // Cannot suspend yourself
            if (id === auth.user?.id) {
                return NextResponse.json({ error: "Cannot suspend your own account" }, { status: 400 });
            }

            // Get target user to check dealership
            const { data: targetUser } = await supabase
                .from("users")
                .select("id, dealership_id, is_platform_admin")
                .eq("id", id)
                .single();

            if (!targetUser) {
                return NextResponse.json({ error: "User not found" }, { status: 404 });
            }

            // IDOR check via the new helper
            const deny = assertOwnershipOrDeny(targetUser, auth.profile);
            if (deny) return deny;

            // Cannot suspend platform admins
            if (targetUser.is_platform_admin) {
                return NextResponse.json({ error: "Cannot suspend platform admin" }, { status: 403 });
            }

            const is_active = action === "reactivate";

            const { data, error: dbError } = await supabase
                .from("users")
                .update({ is_active })
                .eq("id", id)
                .select()
                .single();

            if (dbError) throw dbError;

            return NextResponse.json({
                data,
                message: action === "suspend"
                    ? "User suspended successfully. They can no longer log in."
                    : "User reactivated successfully."
            });
        }

        // Normal user update
        const payload = await req.json();

        // Get target user to check ownership before any write
        const { data: targetUser, error: targetError } = await supabase
            .from("users")
            .select("id, dealership_id, is_platform_admin")
            .eq("id", id)
            .single();

        if (targetError || !targetUser) {
            return NextResponse.json({ error: "User not found" }, { status: 404 });
        }

        const deny = assertOwnershipOrDeny(targetUser, auth.profile);
        if (deny) return deny;

        // Dealership Admin cannot escalate to platform admin
        if (!isPlatformAdmin && payload.is_platform_admin === true) {
            return NextResponse.json(
                { error: "Forbidden - Cannot set is_platform_admin" },
                { status: 403 }
            );
        }

        // Whitelist the update payload; only platform admins may set is_platform_admin
        const allowedFields = isPlatformAdmin
            ? USER_PLATFORM_ADMIN_ALLOWED_FIELDS
            : USER_ALLOWED_FIELDS;
        const safePayload = pickAllowed(payload, allowedFields);
        // Never allow dealership_id reassignment via PATCH (prevents tenant spoofing)
        delete (safePayload as any).dealership_id;

        if (Object.keys(safePayload).length === 0) {
            return NextResponse.json(
                { error: "No valid fields to update" },
                { status: 400 }
            );
        }

        // If role is being updated, validate it
        if (safePayload.role) {
            const validRoles = ["Admin", "Staff", "Manager", "Salesperson"];
            if (!validRoles.includes(safePayload.role as string)) {
                return NextResponse.json(
                    { error: "Invalid role. Must be Admin, Staff, Manager, or Salesperson" },
                    { status: 400 }
                );
            }
        }

        const { data, error: dbError } = await supabase
            .from("users")
            .update(safePayload)
            .eq("id", id)
            .select()
            .single();

        if (dbError) {
            if (dbError.code === "PGRST116") {
                return NextResponse.json({ error: "User not found" }, { status: 404 });
            }
            throw dbError;
        }

        return NextResponse.json({ data });
    } catch (error: any) {
        console.error("Error updating user:", error);
        return NextResponse.json(
            { error: error?.message || "Internal server error" },
            { status: 500 }
        );
    }
}

// DELETE user
export async function DELETE(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const auth = await requireDealershipAccess(req);
        if (auth.error || !auth.profile) {
            return NextResponse.json(
                { error: auth.error || "Unauthorized" },
                { status: 401 }
            );
        }

        let supabase;
        try {
            supabase = createTokenClient(req);
        } catch (error: any) {
            if (error?.message === "MISSING_BEARER_TOKEN") {
                return NextResponse.json(
                    { error: "Authorization token required" },
                    { status: 401 }
                );
            }
            throw error;
        }

        const isPlatformAdmin = auth.profile.is_platform_admin;
        const isAdmin = auth.profile.role === "Admin";

        if (!isPlatformAdmin && !isAdmin) {
            return NextResponse.json({ error: "Unauthorized - Admin access required" }, { status: 403 });
        }

        const { id } = await params;

        // Check if user is trying to delete themselves
        if (id === auth.user?.id) {
            return NextResponse.json(
                { error: "You cannot delete your own account" },
                { status: 400 }
            );
        }

        // Check if target user is in same dealership (for non-platform-admin)
        const { data: targetUser, error: targetError } = await supabase
            .from("users")
            .select("id, dealership_id, is_platform_admin")
            .eq("id", id)
            .single();

        if (targetError || !targetUser) {
            return NextResponse.json({ error: "User not found" }, { status: 404 });
        }

        const deny = assertOwnershipOrDeny(targetUser, auth.profile);
        if (deny) return deny;

        // Cannot delete platform admins
        if (targetUser.is_platform_admin) {
            return NextResponse.json({ error: "Cannot delete platform admin" }, { status: 403 });
        }

        // Delete from user_roles first (junction table)
        await supabase.from("user_roles").delete().eq("user_id", id);

        // Delete from users table
        const { error: dbError } = await supabase
            .from("users")
            .delete()
            .eq("id", id);

        if (dbError) throw dbError;

        // Delete from auth
        try {
            await supabaseAdmin.auth.admin.deleteUser(id);
        } catch (authDeleteError) {
            console.error("Error deleting auth user:", authDeleteError);
        }

        return NextResponse.json({
            success: true,
            message: "User deleted successfully"
        });
    } catch (error: any) {
        console.error("Error deleting user:", error);
        return NextResponse.json(
            { error: error?.message || "Internal server error" },
            { status: 500 }
        );
    }
}