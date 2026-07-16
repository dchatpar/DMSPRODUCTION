// app/api/users/route.ts
import { createTokenClient } from "@/src/lib/server-token";
import { supabaseAdmin } from "@/src/lib/supabase-admin";
import { NextRequest, NextResponse } from "next/server";

// GET all users (filtered by dealership OR all for platform admin)
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

        // Get current user profile with dealership_id and is_platform_admin
        const { data: currentUser } = await supabase
            .from("users")
            .select("role, dealership_id, is_platform_admin")
            .eq("id", user.id)
            .single();

        // Check if platform admin OR dealership admin
        const isPlatformAdmin = currentUser?.is_platform_admin === true;
        const isDealershipAdmin = currentUser?.role === "Admin";

        if (!isPlatformAdmin && !isDealershipAdmin) {
            return NextResponse.json(
                { error: "Unauthorized - Admin access required" },
                { status: 403 }
            );
        }

        const url = new URL(req.url);
        const limit = parseInt(url.searchParams.get("limit") || "20");
        const offset = parseInt(url.searchParams.get("offset") || "0");
        const q = url.searchParams.get("q");
        const role = url.searchParams.get("role");
        const startDateFrom = url.searchParams.get("start_date_from");
        const startDateTo = url.searchParams.get("start_date_to");
        const dealershipId = url.searchParams.get("dealership_id");

        let query = supabase
            .from("users")
            .select(`
                id, avatar, full_name, role, email, phone,
                start_date, is_active, dealership_id, created_at, updated_at,
                is_platform_admin, user_permissions
            `, { count: "exact" })
            .order("created_at", { ascending: false })
            .range(offset, offset + limit - 1);

        // Platform admin sees all users OR users filtered by dealership
        if (!isPlatformAdmin && currentUser?.dealership_id) {
            query = query.eq("dealership_id", currentUser.dealership_id);
        }

        // Filter by specific dealership (platform admin only)
        if (isPlatformAdmin && dealershipId) {
            query = query.eq("dealership_id", dealershipId);
        }

        if (role) query = query.eq("role", role);
        if (q) query = query.or(`full_name.ilike.%${q}%,email.ilike.%${q}%,phone.ilike.%${q}%`);
        if (startDateFrom) query = query.gte("start_date", startDateFrom);
        if (startDateTo) query = query.lte("start_date", startDateTo);

        const { data, error: dbError, count } = await query;

        if (dbError) throw dbError;

        // If platform admin, fetch dealership names for display
        let usersWithDealerships = data || [];
        if (isPlatformAdmin && usersWithDealerships.length > 0) {
            const dealershipIds = [...new Set(usersWithDealerships
                .filter((u: any) => u.dealership_id)
                .map((u: any) => u.dealership_id))];

            if (dealershipIds.length > 0) {
                const { data: dealerships } = await supabase
                    .from("dealerships")
                    .select("id, name")
                    .in("id", dealershipIds);

                const dealershipMap: Record<string, string> = {};
                dealerships?.forEach((d: any) => {
                    dealershipMap[d.id] = d.name;
                });

                usersWithDealerships = usersWithDealerships.map((u: any) => ({
                    ...u,
                    dealership_name: u.dealership_id ? (dealershipMap[u.dealership_id] || "Unknown") : null
                }));
            }
        }

        return NextResponse.json({
            data: usersWithDealerships,
            count: count || 0,
            limit,
            offset,
        });
    } catch (error: any) {
        console.error("Error fetching users:", error);
        return NextResponse.json(
            { error: error?.message || "Internal server error" },
            { status: 500 }
        );
    }
}

// POST create user
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

        // Get current user profile
        const { data: currentUser } = await supabase
            .from("users")
            .select("role, dealership_id, is_platform_admin")
            .eq("id", user.id)
            .single();

        const isPlatformAdmin = currentUser?.is_platform_admin === true;
        const isDealershipAdmin = currentUser?.role === "Admin";

        if (!isPlatformAdmin && !isDealershipAdmin) {
            return NextResponse.json(
                { error: "Unauthorized - Admin access required" },
                { status: 403 }
            );
        }

        const payload = await req.json();
        const { full_name, role, email, phone, start_date, password, avatar, target_dealership_id } = payload;

        // Validate required fields
        const required = ["full_name", "role", "email", "start_date"];
        for (const field of required) {
            if (!payload[field]) {
                return NextResponse.json(
                    { error: `Missing required field: ${field}` },
                    { status: 400 }
                );
            }
        }

        const validRoles = ["Admin", "Staff", "Manager", "Salesperson"];
        if (!validRoles.includes(role)) {
            return NextResponse.json(
                { error: "Invalid role. Must be Admin, Staff, Manager, or Salesperson" },
                { status: 400 }
            );
        }

        // Determine which dealership to assign user to
        let assignedDealershipId = currentUser?.dealership_id;
        if (isPlatformAdmin && target_dealership_id) {
            assignedDealershipId = target_dealership_id;
        }

        if (!assignedDealershipId && !isPlatformAdmin) {
            return NextResponse.json(
                { error: "Unauthorized - No dealership context" },
                { status: 403 }
            );
        }

        // Create auth user
        const { data: authData, error: authError2 } = await supabaseAdmin.auth.admin.createUser({
            email,
            password: password || "Password@123",
            email_confirm: true,
            user_metadata: {
                full_name,
                role
            },
        });

        if (authError2) {
            return NextResponse.json(
                { error: authError2.message },
                { status: 400 }
            );
        }

        // Create user profile
        const { data: profile, error: profileError } = await supabase
            .from("users")
            .insert({
                id: authData.user.id,
                full_name,
                role,
                email,
                phone: phone || null,
                start_date,
                avatar: avatar || null,
                dealership_id: assignedDealershipId,
                is_platform_admin: false,
                is_active: true,
                user_permissions: payload.user_permissions || [],
            })
            .select()
            .single();

        if (profileError) {
            // Rollback - delete auth user if profile creation fails
            await supabaseAdmin.auth.admin.deleteUser(authData.user.id);
            throw profileError;
        }

        return NextResponse.json(
            {
                data: profile,
                default_password_used: !password
            },
            { status: 201 }
        );
    } catch (error: any) {
        console.error("Error creating user:", error);
        return NextResponse.json(
            { error: error?.message || "Internal server error" },
            { status: 500 }
        );
    }
}
