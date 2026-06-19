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

        // Verify user is authenticated
        const { data: { user }, error: authError } = await supabase.auth.getUser();

        if (authError || !user) {
            return NextResponse.json(
                { error: "Invalid or expired token" },
                { status: 401 }
            );
        }

        // Check if user is admin
        const { data: currentUser } = await supabase
            .from("users")
            .select("role")
            .eq("id", user.id)
            .single();

        if (currentUser?.role !== "Admin") {
            return NextResponse.json(
                { error: "Unauthorized - Admin access required" },
                { status: 403 }
            );
        }

        const { id } = await params;

        const { data, error: dbError } = await supabase
            .from("users")
            .select("id,avatar,full_name,role,email,phone,start_date,created_at,updated_at")
            .eq("id", id)
            .single();

        if (dbError) {
            if (dbError.code === "PGRST116") {
                return NextResponse.json(
                    { error: "User not found" },
                    { status: 404 }
                );
            }
            throw dbError;
        }

        return NextResponse.json({ data });
    } catch (error: any) {
        console.error("Error fetching user:", error);
        return NextResponse.json(
            { error: error?.message || "Internal server error" },
            { status: 500 }
        );
    }
}

// PATCH update user
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

        // Verify user is authenticated
        const { data: { user }, error: authError } = await supabase.auth.getUser();

        if (authError || !user) {
            return NextResponse.json(
                { error: "Invalid or expired token" },
                { status: 401 }
            );
        }

        // Check if user is admin
        const { data: currentUser } = await supabase
            .from("users")
            .select("role")
            .eq("id", user.id)
            .single();

        if (currentUser?.role !== "Admin") {
            return NextResponse.json(
                { error: "Unauthorized - Admin access required" },
                { status: 403 }
            );
        }

        const { id } = await params;
        const payload = await req.json();

        // Allowed fields for update
        const allowedFields = ["full_name", "role", "phone", "avatar", "start_date"];
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

        const { data, error: dbError } = await supabase
            .from("users")
            .update(payload)
            .eq("id", id)
            .select()
            .single();

        if (dbError) {
            if (dbError.code === "PGRST116") {
                return NextResponse.json(
                    { error: "User not found" },
                    { status: 404 }
                );
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

        // Verify user is authenticated
        const { data: { user }, error: authError } = await supabase.auth.getUser();

        if (authError || !user) {
            return NextResponse.json(
                { error: "Invalid or expired token" },
                { status: 401 }
            );
        }

        // Check if user is admin
        const { data: currentUser } = await supabase
            .from("users")
            .select("role")
            .eq("id", user.id)
            .single();

        if (currentUser?.role !== "Admin") {
            return NextResponse.json(
                { error: "Unauthorized - Admin access required" },
                { status: 403 }
            );
        }

        const { id } = await params;

        // Check if user is trying to delete themselves
        if (id === user.id) {
            return NextResponse.json(
                { error: "You cannot delete your own account" },
                { status: 400 }
            );
        }

        // Delete from your users table first
        const { error: dbError } = await supabase
            .from("users")
            .delete()
            .eq("id", id);

        if (dbError) {
            if (dbError.code === "PGRST116") {
                return NextResponse.json(
                    { error: "User not found" },
                    { status: 404 }
                );
            }
            throw dbError;
        }

        // Delete from auth
        try {
            await supabaseAdmin.auth.admin.deleteUser(id);
        } catch (authDeleteError) {
            console.error("Error deleting auth user:", authDeleteError);
            // User is deleted from your table but auth deletion failed
            // You might want to log this or handle it differently
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