// app/api/roles/[id]/route.ts
import { createTokenClient } from "@/src/lib/server-token";
import { NextRequest, NextResponse } from "next/server";

// GET single role
export async function GET(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;

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

        // Get user's profile
        const { data: currentUser } = await supabase
            .from("users")
            .select("dealership_id, is_platform_admin")
            .eq("id", user.id)
            .single();

        if (!currentUser) {
            return NextResponse.json(
                { error: "User profile not found" },
                { status: 404 }
            );
        }

        const { data: role, error: dbError } = await supabase
            .from("roles")
            .select("*")
            .eq("id", id)
            .single();

        if (dbError || !role) {
            return NextResponse.json(
                { error: "Role not found" },
                { status: 404 }
            );
        }

        // Check access - platform admins see all, others see only their dealership
        if (!currentUser.is_platform_admin && role.dealership_id !== currentUser.dealership_id) {
            return NextResponse.json(
                { error: "Unauthorized - Access denied" },
                { status: 403 }
            );
        }

        return NextResponse.json({ data: role });
    } catch (error: any) {
        console.error("Error fetching role:", error);
        return NextResponse.json(
            { error: error?.message || "Internal server error" },
            { status: 500 }
        );
    }
}

// PATCH update role
export async function PATCH(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;

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

        // Get user's profile
        const { data: currentUser } = await supabase
            .from("users")
            .select("dealership_id, role, is_platform_admin")
            .eq("id", user.id)
            .single();

        if (!currentUser) {
            return NextResponse.json(
                { error: "User profile not found" },
                { status: 404 }
            );
        }

        // Only admins or platform admins can update roles
        if (currentUser.role !== "Admin" && !currentUser.is_platform_admin) {
            return NextResponse.json(
                { error: "Unauthorized - Admin access required" },
                { status: 403 }
            );
        }

        // Get the role to check ownership
        const { data: existingRole } = await supabase
            .from("roles")
            .select("*, dealership_id")
            .eq("id", id)
            .single();

        if (!existingRole) {
            return NextResponse.json(
                { error: "Role not found" },
                { status: 404 }
            );
        }

        // Check access
        if (!currentUser.is_platform_admin && existingRole.dealership_id !== currentUser.dealership_id) {
            return NextResponse.json(
                { error: "Unauthorized - Access denied" },
                { status: 403 }
            );
        }

        // Cannot modify system roles' names
        if (existingRole.is_system && currentUser.role !== "Admin" && !currentUser.is_platform_admin) {
            return NextResponse.json(
                { error: "Cannot modify system role" },
                { status: 403 }
            );
        }

        const payload = await req.json();
        const { description, permissions } = payload;

        const { data, error: dbError } = await supabase
            .from("roles")
            .update({
                description: description !== undefined ? description : existingRole.description,
                permissions: permissions !== undefined ? permissions : existingRole.permissions,
            })
            .eq("id", id)
            .select()
            .single();

        if (dbError) throw dbError;

        return NextResponse.json({ data });
    } catch (error: any) {
        console.error("Error updating role:", error);
        return NextResponse.json(
            { error: error?.message || "Internal server error" },
            { status: 500 }
        );
    }
}

// DELETE role
export async function DELETE(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;

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

        // Get user's profile
        const { data: currentUser } = await supabase
            .from("users")
            .select("dealership_id, role, is_platform_admin")
            .eq("id", user.id)
            .single();

        if (!currentUser) {
            return NextResponse.json(
                { error: "User profile not found" },
                { status: 404 }
            );
        }

        // Only admins or platform admins can delete roles
        if (currentUser.role !== "Admin" && !currentUser.is_platform_admin) {
            return NextResponse.json(
                { error: "Unauthorized - Admin access required" },
                { status: 403 }
            );
        }

        // Get the role to check ownership
        const { data: existingRole } = await supabase
            .from("roles")
            .select("*, dealership_id")
            .eq("id", id)
            .single();

        if (!existingRole) {
            return NextResponse.json(
                { error: "Role not found" },
                { status: 404 }
            );
        }

        // Check access
        if (!currentUser.is_platform_admin && existingRole.dealership_id !== currentUser.dealership_id) {
            return NextResponse.json(
                { error: "Unauthorized - Access denied" },
                { status: 403 }
            );
        }

        // Cannot delete system roles
        if (existingRole.is_system) {
            return NextResponse.json(
                { error: "Cannot delete system role" },
                { status: 403 }
            );
        }

        // Check if any users are using this role
        const { count } = await supabase
            .from("user_roles")
            .select("*", { count: "exact", head: true })
            .eq("role_id", id);

        if (count && count > 0) {
            return NextResponse.json(
                { error: `Cannot delete role - ${count} user(s) are using this role` },
                { status: 400 }
            );
        }

        const { error: dbError } = await supabase
            .from("roles")
            .delete()
            .eq("id", id);

        if (dbError) throw dbError;

        return NextResponse.json({ success: true });
    } catch (error: any) {
        console.error("Error deleting role:", error);
        return NextResponse.json(
            { error: error?.message || "Internal server error" },
            { status: 500 }
        );
    }
}
