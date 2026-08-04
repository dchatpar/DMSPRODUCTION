// app/api/platform/feature-flags/route.ts
import { createTokenClient } from "@/src/lib/server-token";
import { supabaseAdmin } from "@/src/lib/supabase-admin";
import { NextRequest, NextResponse } from "next/server";

// GET all feature flags (platform admin only)
export async function GET(req: NextRequest) {
    try {
        let supabase;

        try {
            supabase = createTokenClient(req);
        } catch (error: any) {
            if (error?.message === "MISSING_BEARER_TOKEN") {
                return NextResponse.json({ error: "Authorization token required" }, { status: 401 });
            }
            throw error;
        }

        const { data: { user }, error: authError } = await supabase.auth.getUser();
        if (authError || !user) {
            return NextResponse.json({ error: "Invalid or expired token" }, { status: 401 });
        }

        // Verify platform admin using regular client
        const { data: currentUser } = await supabase
            .from("users")
            .select("is_platform_admin")
            .eq("id", user.id)
            .single();

        if (!currentUser?.is_platform_admin) {
            return NextResponse.json({ error: "Unauthorized - Platform admin access required" }, { status: 403 });
        }

        // Use supabaseAdmin to bypass RLS for feature_flags
        const { data, error: dbError } = await supabaseAdmin
            .from("feature_flags")
            .select("*")
            .order("name", { ascending: true });

        if (dbError) throw dbError;

        return NextResponse.json({ data: data || [] });
    } catch (error: any) {
        console.error("Error fetching feature flags:", error);
        return NextResponse.json(
            { error: error?.message || "Internal server error" },
            { status: 500 }
        );
    }
}

// PATCH update a feature flag (platform admin only)
export async function PATCH(req: NextRequest) {
    try {
        let supabase;

        try {
            supabase = createTokenClient(req);
        } catch (error: any) {
            if (error?.message === "MISSING_BEARER_TOKEN") {
                return NextResponse.json({ error: "Authorization token required" }, { status: 401 });
            }
            throw error;
        }

        const { data: { user }, error: authError } = await supabase.auth.getUser();
        if (authError || !user) {
            return NextResponse.json({ error: "Invalid or expired token" }, { status: 401 });
        }

        // Verify platform admin using regular client
        const { data: currentUser } = await supabase
            .from("users")
            .select("is_platform_admin")
            .eq("id", user.id)
            .single();

        if (!currentUser?.is_platform_admin) {
            return NextResponse.json({ error: "Unauthorized - Platform admin access required" }, { status: 403 });
        }

        const payload = await req.json();
        const { key, enabled, value } = payload;

        if (!key) {
            return NextResponse.json({ error: "Feature flag key is required" }, { status: 400 });
        }

        // Build update data
        const updateData: Record<string, any> = { updated_at: new Date().toISOString() };
        if (enabled !== undefined) updateData.enabled = enabled;
        if (value !== undefined) updateData.value = value;

        // Use supabaseAdmin to bypass RLS
        const { data, error: dbError } = await supabaseAdmin
            .from("feature_flags")
            .update(updateData)
            .eq("key", key)
            .select()
            .single();

        if (dbError) {
            if (dbError.code === "PGRST116") {
                return NextResponse.json({ error: "Feature flag not found" }, { status: 404 });
            }
            throw dbError;
        }

        return NextResponse.json({ data });
    } catch (error: any) {
        console.error("Error updating feature flag:", error);
        return NextResponse.json(
            { error: error?.message || "Internal server error" },
            { status: 500 }
        );
    }
}

// POST create a new feature flag (platform admin only)
export async function POST(req: NextRequest) {
    try {
        let supabase;

        try {
            supabase = createTokenClient(req);
        } catch (error: any) {
            if (error?.message === "MISSING_BEARER_TOKEN") {
                return NextResponse.json({ error: "Authorization token required" }, { status: 401 });
            }
            throw error;
        }

        const { data: { user }, error: authError } = await supabase.auth.getUser();
        if (authError || !user) {
            return NextResponse.json({ error: "Invalid or expired token" }, { status: 401 });
        }

        // Verify platform admin
        const { data: currentUser } = await supabase
            .from("users")
            .select("is_platform_admin")
            .eq("id", user.id)
            .single();

        if (!currentUser?.is_platform_admin) {
            return NextResponse.json({ error: "Unauthorized - Platform admin access required" }, { status: 403 });
        }

        const payload = await req.json();
        const { key, name, enabled, value, description } = payload;

        if (!key || !name) {
            return NextResponse.json({ error: "Feature flag key and name are required" }, { status: 400 });
        }

        // Use supabaseAdmin to bypass RLS
        const { data, error: dbError } = await supabaseAdmin
            .from("feature_flags")
            .insert({
                key,
                name,
                enabled: enabled !== false,
                value: value !== undefined ? value : null,
                description: description || null,
            })
            .select()
            .single();

        if (dbError) {
            if (dbError.code === "23505") {
                return NextResponse.json({ error: "Feature flag with this key already exists" }, { status: 400 });
            }
            throw dbError;
        }

        return NextResponse.json({ data }, { status: 201 });
    } catch (error: any) {
        console.error("Error creating feature flag:", error);
        return NextResponse.json(
            { error: error?.message || "Internal server error" },
            { status: 500 }
        );
    }
}
