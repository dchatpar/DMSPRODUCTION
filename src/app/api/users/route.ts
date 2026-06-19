// app/api/users/route.ts
import { createTokenClient } from "@/src/lib/server-token";
import { supabaseAdmin } from "@/src/lib/supabase-admin";
import { NextRequest, NextResponse } from "next/server";

// GET all users
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

        const url = new URL(req.url);
        const limit = parseInt(url.searchParams.get("limit") || "20");
        const offset = parseInt(url.searchParams.get("offset") || "0");
        const q = url.searchParams.get("q");
        const role = url.searchParams.get("role");

        let query = supabase
            .from("users")
            .select("id,avatar,full_name,role,email,phone,start_date,created_at,updated_at", { count: "exact" })
            .order("created_at", { ascending: false })
            .range(offset, offset + limit - 1);

        if (role) query = query.eq("role", role);
        if (q) query = query.or(`full_name.ilike.%${q}%,email.ilike.%${q}%,phone.ilike.%${q}%`);

        const { data, error: dbError, count } = await query;

        if (dbError) throw dbError;

        return NextResponse.json({
            data: data || [],
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

        const payload = await req.json();
        const { full_name, role, email, phone, start_date, password, avatar } = payload;

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

        // Create user profile - FIXED: Added password_hash with placeholder
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
                password_hash: "managed_by_supabase_auth", // This is the FIX
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