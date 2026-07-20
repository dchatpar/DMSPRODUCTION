// app/api/test-drives/route.ts
import { createTokenClient } from "@/src/lib/server-token";
import { NextRequest, NextResponse } from "next/server";

// GET all test drives
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

        // Get user profile for scoping
        const { data: currentUser } = await supabase
            .from("users")
            .select("role, dealership_id, is_platform_admin, user_permissions")
            .eq("id", user.id)
            .single();

        if (!currentUser) {
            return NextResponse.json({ error: "User profile not found" }, { status: 404 });
        }

        const userRole = currentUser.role;
        const userPermissions = currentUser.user_permissions || [];
        const isPlatformAdmin = currentUser.is_platform_admin;

        const url = new URL(req.url);
        const limit = parseInt(url.searchParams.get("limit") || "50");
        const offset = parseInt(url.searchParams.get("offset") || "0");
        const status = url.searchParams.get("status");
        const vehicle_id = url.searchParams.get("vehicle_id");
        const q = url.searchParams.get("q");
        const scheduledDateFrom = url.searchParams.get("scheduled_date_from");
        const scheduledDateTo = url.searchParams.get("scheduled_date_to");

        let query = supabase
            .from("test_drives")
            .select(`*`, { count: "exact" })
            .order("scheduled_date", { ascending: false })
            .range(offset, offset + limit - 1);

        // Platform admin sees all - no dealership filter
        // Others: filter by dealership + scope to assigned
        if (!isPlatformAdmin) {
            if (!currentUser.dealership_id) {
                return NextResponse.json({ error: "No dealership context" }, { status: 403 });
            }
            query = query.eq("dealership_id", currentUser.dealership_id);

            // Scope to assigned test drives for Salesperson/Staff
            const scopedToAssigned = userRole === "Salesperson" || userRole === "Staff";
            const viewAll = userPermissions.includes("*") ||
                (userPermissions.includes("test_drives:read") && !userPermissions.includes("test_drives:read:assigned"));

            if (scopedToAssigned || !viewAll) {
                query = query.eq("user_id", user.id);
            }
        }

        if (status) query = query.eq("status", status);
        if (vehicle_id) query = query.eq("vehicle_id", vehicle_id);
        if (scheduledDateFrom) query = query.gte("scheduled_date", scheduledDateFrom);
        if (scheduledDateTo) query = query.lte("scheduled_date", scheduledDateTo);
        if (q) {
            const { data: matchingCustomers } = await supabase
                .from("customers")
                .select("id")
                .or(`name.ilike.%${q}%,email.ilike.%${q}%,phone.ilike.%${q}%`);

            const customerIds = matchingCustomers?.map(c => c.id) || [];

            const { data: matchingVehicles } = await supabase
                .from("vehicles")
                .select("id")
                .or(`make.ilike.%${q}%,model.ilike.%${q}%,vin.ilike.%${q}%,stock_number.ilike.%${q}%`);

            const vehicleIds = matchingVehicles?.map(v => v.id) || [];

            query = query.or(
                `notes.ilike.%${q}%,status.ilike.%${q}%,outcome.ilike.%${q}%` +
                (customerIds.length > 0 ? `,customer_id.in.(${customerIds.join(',')})` : '') +
                (vehicleIds.length > 0 ? `,vehicle_id.in.(${vehicleIds.join(',')})` : '')
            );
        }

        const { data: testDrives, error: dbError, count } = await query;

        if (dbError) throw dbError;

        // Manually fetch related data to avoid schema cache issues
        const [customersData, leadsData, vehiclesData, usersData] = await Promise.all([
            testDrives?.length > 0
                ? supabase.from("customers").select("id, name, email, phone").in("id", [...new Set((testDrives || []).map((td: any) => td.customer_id).filter(Boolean))])
                : { data: [] },
            testDrives?.length > 0
                ? supabase.from("leads").select("id, source, status").in("id", [...new Set((testDrives || []).map((td: any) => td.lead_id).filter(Boolean))])
                : { data: [] },
            testDrives?.length > 0
                ? supabase.from("vehicles").select("id, make, model, year, vin, stock_number").in("id", [...new Set((testDrives || []).map((td: any) => td.vehicle_id).filter(Boolean))])
                : { data: [] },
            testDrives?.length > 0
                ? supabase.from("users").select("id, full_name, email").in("id", [...new Set((testDrives || []).map((td: any) => td.user_id).filter(Boolean))])
                : { data: [] },
        ]);

        const customerMap: Record<string, any> = {};
        (customersData.data || []).forEach((c: any) => { customerMap[c.id] = c; });

        const leadMap: Record<string, any> = {};
        (leadsData.data || []).forEach((l: any) => { leadMap[l.id] = l; });

        const vehicleMap: Record<string, any> = {};
        (vehiclesData.data || []).forEach((v: any) => { vehicleMap[v.id] = v; });

        const userMap: Record<string, any> = {};
        (usersData.data || []).forEach((u: any) => { userMap[u.id] = u; });

        const enrichedData = (testDrives || []).map((td: any) => ({
            ...td,
            customer: td.customer_id ? customerMap[td.customer_id] || null : null,
            lead: td.lead_id ? leadMap[td.lead_id] || null : null,
            vehicle: td.vehicle_id ? vehicleMap[td.vehicle_id] || null : null,
            salesperson: td.user_id ? userMap[td.user_id] || null : null,
        }));

        return NextResponse.json({
            data: enrichedData,
            count: count || 0,
            limit,
            offset,
        });
    } catch (error: any) {
        console.error("Error fetching test drives:", error);
        return NextResponse.json(
            { error: error?.message || "Internal server error" },
            { status: 500 }
        );
    }
}

// POST create test drive
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

        // Check permission
        const canCreate = currentUser.is_platform_admin ||
            currentUser.role === "Admin" ||
            currentUser.role === "Manager" ||
            (currentUser.user_permissions || []).includes("test_drives:write");

        if (!canCreate) {
            return NextResponse.json({ error: "Forbidden - You cannot create test drives" }, { status: 403 });
        }

        const payload = await req.json();

        const required = ["vehicle_id", "scheduled_date"];
        for (const field of required) {
            if (!payload[field]) {
                return NextResponse.json(
                    { error: `Missing required field: ${field}` },
                    { status: 400 }
                );
            }
        }

        const hasCustomer = !!payload.customer_id;
        const hasLead = !!payload.lead_id;

        if (!hasCustomer && !hasLead) {
            return NextResponse.json(
                { error: "Either customer_id or lead_id is required" },
                { status: 400 }
            );
        }

        if (hasCustomer && hasLead) {
            return NextResponse.json(
                { error: "Cannot provide both customer_id and lead_id. Please provide only one." },
                { status: 400 }
            );
        }

        const scheduledDate = new Date(payload.scheduled_date);
        if (isNaN(scheduledDate.getTime())) {
            return NextResponse.json(
                { error: "Invalid scheduled_date format" },
                { status: 400 }
            );
        }

        const testDriveData = {
            vehicle_id: payload.vehicle_id,
            customer_id: payload.customer_id || null,
            lead_id: payload.lead_id || null,
            user_id: payload.user_id || user.id,
            scheduled_date: payload.scheduled_date,
            status: payload.status || "Scheduled",
            notes: payload.notes || null,
            outcome: payload.outcome || null,
            dealership_id: currentUser.dealership_id,
        };

        const { data: newTestDrive, error: dbError } = await supabase
            .from("test_drives")
            .insert(testDriveData)
            .select("*")
            .single();

        if (dbError) {
            if (dbError.code === "23514") {
                return NextResponse.json(
                    { error: "Validation error: Please check the data constraints" },
                    { status: 400 }
                );
            }
            throw dbError;
        }

        const [customerData, leadData, vehicleData, userData] = await Promise.all([
            newTestDrive.customer_id
                ? supabase.from("customers").select("id, name, email, phone").eq("id", newTestDrive.customer_id).single()
                : { data: null },
            newTestDrive.lead_id
                ? supabase.from("leads").select("id, source, status").eq("id", newTestDrive.lead_id).single()
                : { data: null },
            newTestDrive.vehicle_id
                ? supabase.from("vehicles").select("id, make, model, year, vin, stock_number").eq("id", newTestDrive.vehicle_id).single()
                : { data: null },
            supabase.from("users").select("id, full_name, email").eq("id", newTestDrive.user_id).single(),
        ]);

        const enrichedTestDrive = {
            ...newTestDrive,
            customer: customerData.data,
            lead: leadData.data,
            vehicle: vehicleData.data,
            salesperson: userData.data,
        };

        return NextResponse.json({ data: enrichedTestDrive }, { status: 201 });
    } catch (error: any) {
        console.error("Error creating test drive:", error);
        return NextResponse.json(
            { error: error?.message || "Internal server error" },
            { status: 500 }
        );
    }
}
