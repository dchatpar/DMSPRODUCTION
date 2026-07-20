// app/api/users/[id]/route.ts
import { createTokenClient } from "@/src/lib/server-token";
import { supabaseAdmin } from "@/src/lib/supabase-admin";
import { NextRequest, NextResponse } from "next/server";

// GET single user
export async function GET(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
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

        const { data: { user }, error: authError } = await supabase.auth.getUser();

        if (authError || !user) {
            return NextResponse.json(
                { error: "Invalid or expired token" },
                { status: 401 }
            );
        }

        const { data: currentUser } = await supabase
            .from("users")
            .select("role, dealership_id, is_platform_admin")
            .eq("id", user.id)
            .single();

        if (!currentUser) {
            return NextResponse.json({ error: "User profile not found" }, { status: 404 });
        }

        const isPlatformAdmin = currentUser.is_platform_admin;
        const isAdmin = currentUser.role === "Admin";

        if (!isPlatformAdmin && !isAdmin) {
            return NextResponse.json({ error: "Unauthorized - Admin access required" }, { status: 403 });
        }

        const { id } = await params;

        // Get target user
        const { data: targetUser, error: dbError } = await supabase
            .from("users")
            .select("id,avatar,full_name,role,email,phone,start_date,created_at,updated_at,user_permissions,dealership_id,is_active")
            .eq("id", id)
            .single();

        if (dbError || !targetUser) {
            return NextResponse.json({ error: "User not found" }, { status: 404 });
        }

        // Platform admin can see any user; dealership admin can only see users in their dealership
        if (!isPlatformAdmin && targetUser.dealership_id !== currentUser.dealership_id) {
            return NextResponse.json({ error: "Access denied" }, { status: 403 });
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

        const { data: { user }, error: authError } = await supabase.auth.getUser();

        if (authError || !user) {
            return NextResponse.json(
                { error: "Invalid or expired token" },
                { status: 401 }
            );
        }

        // Get current user profile
        const { data: currentUser } = await supabase
            .from("users")
            .select("role, dealership_id, is_platform_admin")
            .eq("id", user.id)
            .single();

        if (!currentUser) {
            return NextResponse.json({ error: "User profile not found" }, { status: 404 });
        }

        const isPlatformAdmin = currentUser.is_platform_admin;
        const isAdmin = currentUser.role === "Admin";

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
            if (id === user.id) {
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

            // Platform admin can suspend anyone; dealership admin can only suspend users in their dealership
            if (!isPlatformAdmin && targetUser.dealership_id !== currentUser.dealership_id) {
                return NextResponse.json({ error: "Access denied - can only suspend users in your dealership" }, { status: 403 });
            }

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

        // Allowed fields for update
        const allowedFields = ["full_name", "role", "phone", "avatar", "start_date", "user_permissions"];
        const updateFields = Object.keys(payload).filter(key => allowedFields.includes(key));

        if (updateFields.length === 0) {
            return NextResponse.json(
                { error: "No valid fields to update" },
                { status: 400 }
            );
        }

        // If role is being updated, validate it
        if (payload.role) {
            const validRoles = ["Admin", "Staff", "Manager", "Salesperson"];
            if (!validRoles.includes(payload.role)) {
                return NextResponse.json(
                    { error: "Invalid role. Must be Admin, Staff, Manager, or Salesperson" },
                    { status: 400 }
                );
            }
        }

        // Check if target user is in same dealership (for non-platform-admin)
        if (!isPlatformAdmin) {
            const { data: targetUser } = await supabase
                .from("users")
                .select("dealership_id")
                .eq("id", id)
                .single();

            if (!targetUser) {
                return NextResponse.json({ error: "User not found" }, { status: 404 });
            }

            if (targetUser.dealership_id !== currentUser.dealership_id) {
                return NextResponse.json({ error: "Access denied" }, { status: 403 });
            }
        }

        const { data, error: dbError } = await supabase
            .from("users")
            .update(payload)
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

        const { data: { user }, error: authError } = await supabase.auth.getUser();

        if (authError || !user) {
            return NextResponse.json(
                { error: "Invalid or expired token" },
                { status: 401 }
            );
        }

        const { data: currentUser } = await supabase
            .from("users")
            .select("role, dealership_id, is_platform_admin")
            .eq("id", user.id)
            .single();

        if (!currentUser) {
            return NextResponse.json({ error: "User profile not found" }, { status: 404 });
        }

        const isPlatformAdmin = currentUser.is_platform_admin;
        const isAdmin = currentUser.role === "Admin";

        if (!isPlatformAdmin && !isAdmin) {
            return NextResponse.json({ error: "Unauthorized - Admin access required" }, { status: 403 });
        }

        const { id } = await params;

        // Check if user is trying to delete themselves
        if (id === user.id) {
            return NextResponse.json(
                { error: "You cannot delete your own account" },
                { status: 400 }
            );
        }

        // Check if target user is in same dealership (for non-platform-admin)
        const { data: targetUser } = await supabase
            .from("users")
            .select("id, dealership_id, is_platform_admin")
            .eq("id", id)
            .single();

        if (!targetUser) {
            return NextResponse.json({ error: "User not found" }, { status: 404 });
        }

        if (!isPlatformAdmin && targetUser.dealership_id !== currentUser.dealership_id) {
            return NextResponse.json({ error: "Access denied - can only delete users in your dealership" }, { status: 403 });
        }

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