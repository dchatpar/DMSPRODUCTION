// app/api/dealerships/route.ts
import { createTokenClient } from "@/src/lib/server-token";
import { supabaseAdmin } from "@/src/lib/supabase-admin";
import { NextRequest, NextResponse } from "next/server";

// GET all dealerships (platform admin only)
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

        // Check if user is platform admin
        const { data: currentUser } = await supabase
            .from("users")
            .select("is_platform_admin")
            .eq("id", user.id)
            .single();

        if (!currentUser?.is_platform_admin) {
            return NextResponse.json(
                { error: "Unauthorized - Platform admin access required" },
                { status: 403 }
            );
        }

        const url = new URL(req.url);
        const limit = parseInt(url.searchParams.get("limit") || "50");
        const offset = parseInt(url.searchParams.get("offset") || "0");
        const status = url.searchParams.get("status");
        const q = url.searchParams.get("q");

        let query = supabase
            .from("dealerships")
            .select("*", { count: "exact" })
            .order("created_at", { ascending: false })
            .range(offset, offset + limit - 1);

        const { data, error: dbError, count } = await query;

        if (dbError) throw dbError;

        // Fetch user counts for all dealerships
        const dealershipIds = (data || []).map((d: any) => d.id);
        let userCounts: Record<string, number> = {};

        if (dealershipIds.length > 0) {
            const { data: users } = await supabase
                .from("users")
                .select("dealership_id");

            // Count users per dealership
            users?.forEach((u: any) => {
                if (u.dealership_id) {
                    userCounts[u.dealership_id] = (userCounts[u.dealership_id] || 0) + 1;
                }
            });
        }

        // Add user_count to each dealership
        const dataWithCounts = (data || []).map((d: any) => ({
            ...d,
            user_count: userCounts[d.id] || 0
        }));

        return NextResponse.json({
            data: dataWithCounts,
            count: count || 0,
            limit,
            offset,
        });
    } catch (error: any) {
        console.error("Error fetching dealerships:", error);
        return NextResponse.json(
            { error: error?.message || "Internal server error" },
            { status: 500 }
        );
    }
}

// POST create new dealership (platform admin only)
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

        // Check if user is platform admin
        const { data: currentUser } = await supabase
            .from("users")
            .select("is_platform_admin")
            .eq("id", user.id)
            .single();

        if (!currentUser?.is_platform_admin) {
            return NextResponse.json(
                { error: "Unauthorized - Platform admin access required" },
                { status: 403 }
            );
        }

        const payload = await req.json();
        const {
            name,
            slug,
            subdomain,
            business_name,
            business_address,
            business_phone,
            business_email,
            plan_name,
            admin_email,
            admin_password,
            admin_full_name
        } = payload;

        // Validate required fields
        if (!name) {
            return NextResponse.json(
                { error: "Missing required field: name" },
                { status: 400 }
            );
        }

        // Create slug from name if not provided
        const generatedSlug = slug || name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');

        // Create the dealership
        const { data: dealership, error: dealershipError } = await supabase
            .from("dealerships")
            .insert({
                name,
                slug: generatedSlug,
                subdomain: subdomain || generatedSlug,
                business_name: business_name || name,
                business_address: business_address || null,
                business_phone: business_phone || null,
                business_email: business_email || null,
                status: 'Trial',
            })
            .select()
            .single();

        if (dealershipError) {
            if (dealershipError.code === '23505') {
                return NextResponse.json(
                    { error: "A dealership with this slug or subdomain already exists" },
                    { status: 400 }
                );
            }
            throw dealershipError;
        }

        // Create default subscription for the dealership
        const { error: subscriptionError } = await supabase
            .from("subscriptions")
            .insert({
                dealership_id: dealership.id,
                plan_name: plan_name || 'Basic',
                plan_price: plan_name === 'Premium' ? 299 : (plan_name === 'Standard' ? 149 : 0),
                billing_cycle: 'monthly',
                status: 'Trial',
                trial_ends_at: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(), // 14 days trial
            });

        if (subscriptionError) {
            console.error("Error creating subscription:", subscriptionError);
        }

        // If admin_email is provided, create the first admin user for this dealership
        if (admin_email && admin_full_name) {
            try {
                // Create auth user
                const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
                    email: admin_email,
                    password: admin_password || "Password@123",
                    email_confirm: true,
                    user_metadata: {
                        full_name: admin_full_name,
                        role: 'Admin'
                    },
                });

                if (!authError && authData.user) {
                    // Create user profile linked to this dealership
                    await supabase
                        .from("users")
                        .insert({
                            id: authData.user.id,
                            email: admin_email,
                            full_name: admin_full_name,
                            role: 'Admin',
                            dealership_id: dealership.id,
                            is_active: true,
                        });

                    // Create default roles for the dealership
                    const defaultRoles = [
                        { name: 'Admin', description: 'Full access to dealership', is_system: true, permissions: ['*'] },
                        { name: 'Manager', description: 'Manage inventory, sales, and staff', is_system: true, permissions: ['deals:*', 'vehicles:*', 'customers:*', 'leads:*'] },
                        { name: 'Salesperson', description: 'Manage assigned leads and deals', is_system: true, permissions: ['leads:read', 'leads:write', 'deals:read', 'deals:write'] },
                        { name: 'Staff', description: 'Limited access', is_system: true, permissions: ['deals:read', 'vehicles:read', 'customers:read'] },
                    ];

                    for (const role of defaultRoles) {
                        await supabase
                            .from("roles")
                            .insert({
                                dealership_id: dealership.id,
                                ...role
                            });
                    }
                }
            } catch (err) {
                console.error("Error creating admin user:", err);
            }
        }

        return NextResponse.json(
            { data: dealership },
            { status: 201 }
        );
    } catch (error: any) {
        console.error("Error creating dealership:", error);
        return NextResponse.json(
            { error: error?.message || "Internal server error" },
            { status: 500 }
        );
    }
}
