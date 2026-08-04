// app/api/roles/[id]/route.ts
import { createTokenClient } from "@/src/lib/server-token";
import { NextRequest, NextResponse } from "next/server";
import { assertOwnershipOrDeny, pickAllowed, requireDealershipAccess } from "@/src/lib/auth-helpers";

const ROLE_ALLOWED_FIELDS = [
    "name", "description", "permissions",
] as const;

// GET single role
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

        const { id } = await params;

        // Narrow fetch first to assert ownership
        const { data: existing, error: existingError } = await supabase
            .from("roles")
            .select("id, dealership_id, is_system")
            .eq("id", id)
            .single();

        if (existingError || !existing) {
            return NextResponse.json(
                { error: "Role not found" },
                { status: 404 }
            );
        }

        const deny = assertOwnershipOrDeny(existing, auth.profile);
        if (deny) return deny;

        // Re-fetch the full row
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

        // Only admins or platform admins can update roles
        if (auth.profile.role !== "Admin" && !auth.profile.is_platform_admin) {
            return NextResponse.json(
                { error: "Unauthorized - Admin access required" },
                { status: 403 }
            );
        }

        // Get the role to check ownership and the is_system flag
        const { data: existingRole, error: existingError } = await supabase
            .from("roles")
            .select("id, dealership_id, is_system, description, permissions")
            .eq("id", id)
            .single();

        if (existingError || !existingRole) {
            return NextResponse.json(
                { error: "Role not found" },
                { status: 404 }
            );
        }

        const deny = assertOwnershipOrDeny(existingRole, auth.profile);
        if (deny) return deny;

        // Cannot modify system roles' names
        if (existingRole.is_system && auth.profile.role !== "Admin" && !auth.profile.is_platform_admin) {
            return NextResponse.json(
                { error: "Cannot modify system role" },
                { status: 403 }
            );
        }

        const payload = await req.json();

        // Whitelist the update payload and block dealership_id changes
        const safePayload = pickAllowed(payload, ROLE_ALLOWED_FIELDS);
        delete (safePayload as any).dealership_id;

        const { data, error: dbError } = await supabase
            .from("roles")
            .update({
                ...safePayload,
                // Fall back to existing values for any field not provided
                description: safePayload.description !== undefined ? safePayload.description : existingRole.description,
                permissions: safePayload.permissions !== undefined ? safePayload.permissions : existingRole.permissions,
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

        // Only admins or platform admins can delete roles
        if (auth.profile.role !== "Admin" && !auth.profile.is_platform_admin) {
            return NextResponse.json(
                { error: "Unauthorized - Admin access required" },
                { status: 403 }
            );
        }

        // Get the role to check ownership and the is_system flag
        const { data: existingRole, error: existingError } = await supabase
            .from("roles")
            .select("id, dealership_id, is_system")
            .eq("id", id)
            .single();

        if (existingError || !existingRole) {
            return NextResponse.json(
                { error: "Role not found" },
                { status: 404 }
            );
        }

        const deny = assertOwnershipOrDeny(existingRole, auth.profile);
        if (deny) return deny;

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
