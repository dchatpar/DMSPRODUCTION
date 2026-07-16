// app/api/roles/route.ts
import { createTokenClient } from "@/src/lib/server-token";
import { NextRequest, NextResponse } from "next/server";

// GET all roles for the current user's dealership
export async function GET(req: NextRequest) {
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

        // Get user's dealership
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

        // Platform admins can see all roles across all dealerships
        // Dealership admins/managers see only their dealership's roles
        let query = supabase
            .from("roles")
            .select("*")
            .order("is_system", { ascending: false })
            .order("name", { ascending: true });

        if (!currentUser.is_platform_admin) {
            if (!currentUser.dealership_id) {
                return NextResponse.json(
                    { error: "Unauthorized - No dealership context" },
                    { status: 403 }
                );
            }
            query = query.eq("dealership_id", currentUser.dealership_id);
        }

        const { data, error: dbError } = await query;

        if (dbError) throw dbError;

        return NextResponse.json({ data: data || [] });
    } catch (error: any) {
        console.error("Error fetching roles:", error);
        return NextResponse.json(
            { error: error?.message || "Internal server error" },
            { status: 500 }
        );
    }
}

// POST create new role (dealership admin only)
export async function POST(req: NextRequest) {
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

        // Only admins or platform admins can create roles
        if (currentUser.role !== "Admin" && !currentUser.is_platform_admin) {
            return NextResponse.json(
                { error: "Unauthorized - Admin access required" },
                { status: 403 }
            );
        }

        if (!currentUser.dealership_id && !currentUser.is_platform_admin) {
            return NextResponse.json(
                { error: "Unauthorized - No dealership context" },
                { status: 403 }
            );
        }

        const payload = await req.json();
        const { name, description, permissions } = payload;

        // Validate required fields
        if (!name) {
            return NextResponse.json(
                { error: "Missing required field: name" },
                { status: 400 }
            );
        }

        // Validate role name
        const validRoleNames = ["Admin", "Manager", "Salesperson", "Staff", "Custom"];
        if (!validRoleNames.includes(name)) {
            return NextResponse.json(
                { error: "Invalid role name. Must be Admin, Manager, Salesperson, Staff, or Custom" },
                { status: 400 }
            );
        }

        const { data, error: dbError } = await supabase
            .from("roles")
            .insert({
                name,
                description: description || null,
                permissions: permissions || [],
                is_system: false,
                dealership_id: currentUser.is_platform_admin ? (payload.dealership_id || null) : currentUser.dealership_id
            })
            .select()
            .single();

        if (dbError) {
            if (dbError.code === '23505') {
                return NextResponse.json(
                    { error: "A role with this name already exists for this dealership" },
                    { status: 400 }
                );
            }
            throw dbError;
        }

        return NextResponse.json({ data }, { status: 201 });
    } catch (error: any) {
        console.error("Error creating role:", error);
        return NextResponse.json(
            { error: error?.message || "Internal server error" },
            { status: 500 }
        );
    }
}
