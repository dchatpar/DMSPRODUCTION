// app/api/leads/route.ts
import { createTokenClient } from "@/src/lib/server-token";
import { NextRequest, NextResponse } from "next/server";
import {
    shouldScopeToAssigned,
    canViewAll,
    canCreate,
} from "@/src/lib/permission-middleware";

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

        // Get user's profile with role and permissions
        const { data: currentUser } = await supabase
            .from("users")
            .select("role, dealership_id, is_platform_admin, user_permissions")
            .eq("id", user.id)
            .single();

        if (!currentUser) {
            return NextResponse.json(
                { error: "User profile not found" },
                { status: 404 }
            );
        }

        const userRole = currentUser.role;
        const userPermissions = currentUser.user_permissions || [];
        const isPlatformAdmin = currentUser.is_platform_admin;

        // Platform admin sees all leads across all dealerships
        // Admin/Manager sees all leads within their dealership
        // Salesperson/Staff sees only assigned leads

        const url = new URL(req.url);
        const limit = parseInt(url.searchParams.get("limit") || "50");
        const offset = parseInt(url.searchParams.get("offset") || "0");
        const status = url.searchParams.get("status");
        const source = url.searchParams.get("source");
        const assigned_to = url.searchParams.get("assigned_to");
        const q = url.searchParams.get("q");
        const createdAtFrom = url.searchParams.get("created_at_from");
        const createdAtTo = url.searchParams.get("created_at_to");

        let query = supabase
            .from("leads")
            .select(`
                *,
                customer:customers(*),
                vehicle:vehicles(*),
                assigned_user:users!assigned_to(id, full_name, email, avatar)
            `, { count: "exact" })
            .order("created_at", { ascending: false })
            .range(offset, offset + limit - 1);

        // Platform admin sees all - no dealership filter needed
        if (!isPlatformAdmin) {
            // Filter by dealership
            if (currentUser.dealership_id) {
                query = query.eq("dealership_id", currentUser.dealership_id);
            } else {
                return NextResponse.json(
                    { error: "No dealership context" },
                    { status: 403 }
                );
            }

            // Scope to assigned records for Salesperson/Staff
            const scopedToAssigned = shouldScopeToAssigned(userRole, userPermissions);
            const viewAll = canViewAll(userRole, userPermissions);

            if (scopedToAssigned || !viewAll) {
                // Salesperson/Staff: only see leads assigned to them
                query = query.eq("assigned_to", user.id);
            }
        }

        if (status) query = query.eq("status", status);
        if (source) query = query.eq("source", source);
        if (assigned_to && (userRole === "Admin" || userRole === "Manager" || isPlatformAdmin)) {
            // Only Admin/Manager/PlatformAdmin can filter by assigned_to explicitly
            query = query.eq("assigned_to", assigned_to);
        }
        if (createdAtFrom) query = query.gte("created_at", createdAtFrom);
        if (createdAtTo) query = query.lte("created_at", createdAtTo);
        if (q) {
            // Search on direct columns AND via FK lookups (two-step approach)
            // Step 1: Find matching customer IDs
            const { data: matchingCustomers } = await supabase
                .from("customers")
                .select("id")
                .or(`name.ilike.%${q}%,email.ilike.%${q}%,phone.ilike.%${q}%`);

            const customerIds = matchingCustomers?.map(c => c.id) || [];

            // Step 2: Find matching vehicle IDs (make/model search)
            const { data: matchingVehicles } = await supabase
                .from("vehicles")
                .select("id")
                .or(`make.ilike.%${q}%,model.ilike.%${q}%,vin.ilike.%${q}%`);

            const vehicleIds = matchingVehicles?.map(v => v.id) || [];

            // Apply search - direct columns OR customer match OR vehicle match
            query = query.or(
                `notes.ilike.%${q}%,source.ilike.%${q}%` +
                (customerIds.length > 0 ? `,customer_id.in.(${customerIds.join(',')})` : '') +
                (vehicleIds.length > 0 ? `,interest_vehicle_id.in.(${vehicleIds.join(',')})` : '')
            );
        }

        const { data, error: dbError, count } = await query;

        if (dbError) throw dbError;

        return NextResponse.json({
            data: data || [],
            count: count || 0,
            limit,
            offset,
        });
    } catch (error: any) {
        console.error("Error fetching leads:", error);
        return NextResponse.json(
            { error: error?.message || "Internal server error" },
            { status: 500 }
        );
    }
}

// POST create lead
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
            return NextResponse.json(
                { error: "User profile not found" },
                { status: 404 }
            );
        }

        const userRole = currentUser.role;
        const userPermissions = currentUser.user_permissions || [];

        // Check if user can create leads
        if (!canCreate(userRole, userPermissions, "leads")) {
            return NextResponse.json(
                { error: "Forbidden - You cannot create leads" },
                { status: 403 }
            );
        }

        const payload = await req.json();

        // Validate required fields
        const required = ["customer_id"];
        for (const field of required) {
            if (!payload[field]) {
                return NextResponse.json(
                    { error: `Missing required field: ${field}` },
                    { status: 400 }
                );
            }
        }

        // Validate source if provided
        const validSources = ['Website', 'Referral', 'Event', 'Walk-in', 'Facebook', 'Craigslist', 'Kijiji', 'Phone'];
        if (payload.source && !validSources.includes(payload.source)) {
            return NextResponse.json(
                { error: `Invalid source. Must be one of: ${validSources.join(', ')}` },
                { status: 400 }
            );
        }

        // Validate status if provided
        const validStatuses = ['Not Started', 'In Progress', 'Qualified', 'Closed', 'Lost'];
        if (payload.status && !validStatuses.includes(payload.status)) {
            return NextResponse.json(
                { error: `Invalid status. Must be one of: ${validStatuses.join(', ')}` },
                { status: 400 }
            );
        }

        // Set default values
        const now = new Date().toISOString();
        const leadData = {
            customer_id: payload.customer_id,
            source: payload.source || 'Website',
            status: payload.status || 'Not Started',
            interest_vehicle_id: payload.interest_vehicle_id || null,
            assigned_to: payload.assigned_to || null,
            notes: payload.notes || null,
            lead_creation_date: now,
            last_engagement: now,
            dealership_id: currentUser.dealership_id,
        };

        const { data, error: dbError } = await supabase
            .from("leads")
            .insert(leadData)
            .select(`
                *,
                customer:customers(*),
                vehicle:vehicles(*),
                assigned_user:users!assigned_to(id, full_name, email, avatar)
            `)
            .single();

        if (dbError) throw dbError;

        return NextResponse.json({ data }, { status: 201 });
    } catch (error: any) {
        console.error("Error creating lead:", error);
        return NextResponse.json(
            { error: error?.message || "Internal server error" },
            { status: 500 }
        );
    }
}
