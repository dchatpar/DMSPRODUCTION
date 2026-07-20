// app/api/vehicles/[id]/route.ts
import { createTokenClient } from "@/src/lib/server-token";
import { NextRequest, NextResponse } from "next/server";

// GET single vehicle
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

        const { id } = await params;

        const { data, error: dbError } = await supabase
            .from("vehicles")
            .select("*")
            .eq("id", id)
            .single();

        if (dbError) {
            if (dbError.code === "PGRST116") {
                return NextResponse.json(
                    { error: "Vehicle not found" },
                    { status: 404 }
                );
            }
            throw dbError;
        }

        return NextResponse.json({ data });
    } catch (error: any) {
        console.error("Error fetching vehicle:", error);
        return NextResponse.json(
            { error: error?.message || "Internal server error" },
            { status: 500 }
        );
    }
}

// PUT update vehicle
export async function PUT(
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

        // Get current user's permissions
        const { data: currentUser } = await supabase
            .from("users")
            .select("role, dealership_id, is_platform_admin, user_permissions")
            .eq("id", user.id)
            .single();

        if (!currentUser) {
            return NextResponse.json({ error: "User profile not found" }, { status: 404 });
        }

        const userRole = currentUser.role;
        const userPerms = currentUser.user_permissions || [];
        const isPlatformAdmin = currentUser.is_platform_admin;

        const canManagePricing = isPlatformAdmin ||
            userRole === "Admin" ||
            userRole === "Manager" ||
            userPerms.includes("vehicles:pricing") ||
            userPerms.includes("*");

        const canManagePhotos = isPlatformAdmin ||
            userRole === "Admin" ||
            userRole === "Manager" ||
            userPerms.includes("vehicles:photos") ||
            userPerms.includes("*");

        const { id } = await params;
        const payload = await req.json();

        // Check pricing permission if retail_price is being modified
        if (payload.retail_price !== undefined && !canManagePricing) {
            return NextResponse.json(
                { error: "Forbidden - You need vehicles:pricing permission to modify pricing" },
                { status: 403 }
            );
        }

        // Check photos permission if image_gallery is being modified
        if (payload.image_gallery !== undefined && !canManagePhotos) {
            return NextResponse.json(
                { error: "Forbidden - You need vehicles:photos permission to modify photos" },
                { status: 403 }
            );
        }

        // Validate required fields for update (optional fields)
        const allowedFields = [
            "vin", "year", "make", "model", "trim", "odometer",
            "stock_number", "condition", "status", "purchase_price",
            "retail_price", "extra_costs", "taxes", "image_gallery"
        ];

        // Check if any valid fields are being updated
        const updateFields = Object.keys(payload).filter(key => allowedFields.includes(key));
        if (updateFields.length === 0) {
            return NextResponse.json(
                { error: "No valid fields to update" },
                { status: 400 }
            );
        }

        const { data, error: dbError } = await supabase
            .from("vehicles")
            .update(payload)
            .eq("id", id)
            .select()
            .single();

        if (dbError) {
            if (dbError.code === "PGRST116") {
                return NextResponse.json(
                    { error: "Vehicle not found" },
                    { status: 404 }
                );
            }
            if (dbError.code === "23505") {
                return NextResponse.json(
                    { error: "A vehicle with this VIN already exists" },
                    { status: 400 }
                );
            }
            throw dbError;
        }

        return NextResponse.json({ data });
    } catch (error: any) {
        console.error("Error updating vehicle:", error);
        return NextResponse.json(
            { error: error?.message || "Internal server error" },
            { status: 500 }
        );
    }
}

// PATCH update vehicle (partial update)
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

        // Get current user's permissions
        const { data: currentUser } = await supabase
            .from("users")
            .select("role, dealership_id, is_platform_admin, user_permissions")
            .eq("id", user.id)
            .single();

        if (!currentUser) {
            return NextResponse.json({ error: "User profile not found" }, { status: 404 });
        }

        const userRole = currentUser.role;
        const userPerms = currentUser.user_permissions || [];
        const isPlatformAdmin = currentUser.is_platform_admin;

        const canManagePricing = isPlatformAdmin ||
            userRole === "Admin" ||
            userRole === "Manager" ||
            userPerms.includes("vehicles:pricing") ||
            userPerms.includes("*");

        const canManagePhotos = isPlatformAdmin ||
            userRole === "Admin" ||
            userRole === "Manager" ||
            userPerms.includes("vehicles:photos") ||
            userPerms.includes("*");

        const { id } = await params;
        const payload = await req.json();

        // Check pricing permission if retail_price is being modified
        if (payload.retail_price !== undefined && !canManagePricing) {
            return NextResponse.json(
                { error: "Forbidden - You need vehicles:pricing permission to modify pricing" },
                { status: 403 }
            );
        }

        // Check photos permission if image_gallery is being modified
        if (payload.image_gallery !== undefined && !canManagePhotos) {
            return NextResponse.json(
                { error: "Forbidden - You need vehicles:photos permission to modify photos" },
                { status: 403 }
            );
        }

        const { data, error: dbError } = await supabase
            .from("vehicles")
            .update(payload)
            .eq("id", id)
            .select()
            .single();

        if (dbError) {
            if (dbError.code === "PGRST116") {
                return NextResponse.json(
                    { error: "Vehicle not found" },
                    { status: 404 }
                );
            }
            if (dbError.code === "23505") {
                return NextResponse.json(
                    { error: "A vehicle with this VIN already exists" },
                    { status: 400 }
                );
            }
            throw dbError;
        }

        return NextResponse.json({ data });
    } catch (error: any) {
        console.error("Error updating vehicle:", error);
        return NextResponse.json(
            { error: error?.message || "Internal server error" },
            { status: 500 }
        );
    }
}

// DELETE vehicle
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

        const { id } = await params;

        const { error: dbError } = await supabase
            .from("vehicles")
            .delete()
            .eq("id", id);

        if (dbError) {
            if (dbError.code === "PGRST116") {
                return NextResponse.json(
                    { error: "Vehicle not found" },
                    { status: 404 }
                );
            }
            throw dbError;
        }

        return NextResponse.json({
            success: true,
            message: "Vehicle deleted successfully"
        });
    } catch (error: any) {
        console.error("Error deleting vehicle:", error);
        return NextResponse.json(
            { error: error?.message || "Internal server error" },
            { status: 500 }
        );
    }
}