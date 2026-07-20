// app/api/customers/route.ts
import { createTokenClient } from "@/src/lib/server-token";
import { NextRequest, NextResponse } from "next/server";

// GET all customers (filtered by dealership + scoping for Salesperson/Staff)
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

        const { data: currentUser } = await supabase
            .from("users")
            .select("role, dealership_id, is_platform_admin, user_permissions")
            .eq("id", user.id)
            .single();

        if (!currentUser) {
            return NextResponse.json({ error: "User profile not found" }, { status: 404 });
        }

        if (!currentUser.dealership_id && !currentUser.is_platform_admin) {
            return NextResponse.json(
                { error: "Unauthorized - No dealership context" },
                { status: 403 }
            );
        }

        const userRole = currentUser.role;
        const userPermissions = currentUser.user_permissions || [];
        const isPlatformAdmin = currentUser.is_platform_admin;

        const url = new URL(req.url);
        const limit = parseInt(url.searchParams.get("limit") || "50");
        const offset = parseInt(url.searchParams.get("offset") || "0");
        const q = url.searchParams.get("q");
        const status = url.searchParams.get("status");
        const distinctStatus = url.searchParams.get("distinct_status");

        // If requesting distinct status values, return them from database
        if (distinctStatus === "true") {
            let statusQuery = supabase
                .from("customers")
                .select("status")
                .not("status", "is", null);

            if (!isPlatformAdmin) {
                statusQuery = statusQuery.eq("dealership_id", currentUser.dealership_id);
            }

            const { data, error: dbError } = await statusQuery;
            if (dbError) throw dbError;

            const uniqueStatuses = [...new Set(data?.map((c: any) => c.status).filter(Boolean) || [])];
            return NextResponse.json({ data: uniqueStatuses });
        }

        let query = supabase
            .from("customers")
            .select("*", { count: "exact" })
            .order("created_at", { ascending: false })
            .range(offset, offset + limit - 1);

        // Platform admin sees all - no dealership filter needed
        // Others: filter by dealership
        if (!isPlatformAdmin) {
            query = query.eq("dealership_id", currentUser.dealership_id);

            // Scope to assigned customers for Salesperson/Staff
            // Admin/Manager see all customers in dealership, Salesperson/Staff see only assigned
            const isAdminOrManager = userRole === "Admin" || userRole === "Manager";
            const scopedToAssigned = userRole === "Salesperson" || userRole === "Staff";
            const viewAll = userPermissions.includes("*") ||
                isAdminOrManager ||
                (userPermissions.includes("customers:read") && !userPermissions.includes("customers:read:assigned"));

            if (scopedToAssigned || !viewAll) {
                query = query.eq("assigned_to", user.id);
            }
        }

        if (status) query = query.eq("status", status);
        if (q) query = query.or(`name.ilike.%${q}%,phone.ilike.%${q}%,email.ilike.%${q}%`);

        const { data, error: dbError, count } = await query;

        if (dbError) throw dbError;

        return NextResponse.json({
            data: data || [],
            count: count || 0,
            limit,
            offset,
        });
    } catch (error: any) {
        console.error("Error fetching customers:", error);
        return NextResponse.json(
            { error: error?.message || "Internal server error" },
            { status: 500 }
        );
    }
}

// POST create customer (within user's dealership)
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

        const { data: currentUser } = await supabase
            .from("users")
            .select("role, dealership_id, is_platform_admin, user_permissions")
            .eq("id", user.id)
            .single();

        if (!currentUser) {
            return NextResponse.json({ error: "User profile not found" }, { status: 404 });
        }

        // Check permission - ALL roles can create customers (Admin, Manager, Salesperson, Staff)
        // Only platform admin outside a dealership context cannot create
        const canCreate = currentUser.is_platform_admin ||
            currentUser.role === "Admin" ||
            currentUser.role === "Manager" ||
            currentUser.role === "Salesperson" ||
            currentUser.role === "Staff" ||
            (currentUser.user_permissions || []).includes("customers:write");

        if (!canCreate) {
            return NextResponse.json({ error: "Forbidden - You cannot create customers" }, { status: 403 });
        }

        if (!currentUser.dealership_id && !currentUser.is_platform_admin) {
            return NextResponse.json(
                { error: "Unauthorized - No dealership context" },
                { status: 403 }
            );
        }

        const payload = await req.json();

        const required = ["name"];
        for (const field of required) {
            if (!payload[field]) {
                return NextResponse.json(
                    { error: `Missing required field: ${field}` },
                    { status: 400 }
                );
            }
        }

        if (payload.email) {
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (!emailRegex.test(payload.email)) {
                return NextResponse.json(
                    { error: "Invalid email format" },
                    { status: 400 }
                );
            }
        }

        // Auto-assign created customer to the creating user (for Salesperson/Staff)
        const userRole = currentUser.role;
        const userPermissions = currentUser.user_permissions || [];
        const isScoped = userRole === "Salesperson" || userRole === "Staff" ||
            userPermissions.includes("customers:read:assigned");

        const customerData: Record<string, any> = {
            ...payload,
            dealership_id: currentUser.dealership_id,
        };

        // If user is scoped to assigned only, auto-assign the customer to them
        if (isScoped && !payload.assigned_to) {
            customerData.assigned_to = user.id;
        }

        const { data, error: dbError } = await supabase
            .from("customers")
            .insert(customerData)
            .select()
            .single();

        if (dbError) throw dbError;

        return NextResponse.json({ data }, { status: 201 });
    } catch (error: any) {
        console.error("Error creating customer:", error);
        return NextResponse.json(
            { error: error?.message || "Internal server error" },
            { status: 500 }
        );
    }
}
