// app/api/dealerships/[id]/route.ts
import { createTokenClient } from "@/src/lib/server-token";
import { NextRequest, NextResponse } from "next/server";

// GET single dealership (platform admin only)
export async function GET(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;

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

        const { data: dealership, error: dbError } = await supabase
            .from("dealerships")
            .select("*")
            .eq("id", id)
            .single();

        if (dbError || !dealership) {
            return NextResponse.json(
                { error: "Dealership not found" },
                { status: 404 }
            );
        }

        // Get subscription info
        const { data: subscription } = await supabase
            .from("subscriptions")
            .select("*")
            .eq("dealership_id", id)
            .single();

        // Get billing information
        const { data: billingInformation } = await supabase
            .from("billing_information")
            .select("*")
            .eq("dealership_id", id)
            .single();

        // Get user count
        const { count: userCount } = await supabase
            .from("users")
            .select("*", { count: "exact", head: true })
            .eq("dealership_id", id);

        return NextResponse.json({
            data: {
                ...dealership,
                subscription,
                billing_information: billingInformation,
                user_count: userCount || 0
            }
        });
    } catch (error: any) {
        console.error("Error fetching dealership:", error);
        return NextResponse.json(
            { error: error?.message || "Internal server error" },
            { status: 500 }
        );
    }
}

// PATCH update dealership (platform admin only)
export async function PATCH(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;

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
            logo_url,
            status,
            settings
        } = payload;

        const updateData: any = {};
        if (name !== undefined) updateData.name = name;
        if (slug !== undefined) updateData.slug = slug;
        if (subdomain !== undefined) updateData.subdomain = subdomain;
        if (business_name !== undefined) updateData.business_name = business_name;
        if (business_address !== undefined) updateData.business_address = business_address;
        if (business_phone !== undefined) updateData.business_phone = business_phone;
        if (business_email !== undefined) updateData.business_email = business_email;
        if (logo_url !== undefined) updateData.logo_url = logo_url;
        if (status !== undefined) updateData.status = status;
        if (settings !== undefined) updateData.settings = settings;

        const { data: dealership, error: dbError } = await supabase
            .from("dealerships")
            .update(updateData)
            .eq("id", id)
            .select()
            .single();

        if (dbError) {
            if (dbError.code === '23505') {
                return NextResponse.json(
                    { error: "A dealership with this slug or subdomain already exists" },
                    { status: 400 }
                );
            }
            throw dbError;
        }

        if (!dealership) {
            return NextResponse.json(
                { error: "Dealership not found" },
                { status: 404 }
            );
        }

        return NextResponse.json({ data: dealership });
    } catch (error: any) {
        console.error("Error updating dealership:", error);
        return NextResponse.json(
            { error: error?.message || "Internal server error" },
            { status: 500 }
        );
    }
}

// DELETE dealership (platform admin only)
export async function DELETE(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;

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

        // Check if dealership has active subscriptions
        const { data: subscription } = await supabase
            .from("subscriptions")
            .select("status")
            .eq("dealership_id", id)
            .single();

        if (subscription && subscription.status === 'Active') {
            return NextResponse.json(
                { error: "Cannot delete dealership with active subscription. Cancel the subscription first." },
                { status: 400 }
            );
        }

        // Delete related records first (cascade should handle this, but being explicit)
        await supabase.from("users").delete().eq("dealership_id", id);
        await supabase.from("roles").delete().eq("dealership_id", id);
        await supabase.from("subscriptions").delete().eq("dealership_id", id);
        await supabase.from("billing_information").delete().eq("dealership_id", id);

        // Delete the dealership
        const { error: dbError } = await supabase
            .from("dealerships")
            .delete()
            .eq("id", id);

        if (dbError) throw dbError;

        return NextResponse.json({ success: true });
    } catch (error: any) {
        console.error("Error deleting dealership:", error);
        return NextResponse.json(
            { error: error?.message || "Internal server error" },
            { status: 500 }
        );
    }
}
