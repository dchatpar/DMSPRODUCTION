// app/api/me/route.ts
import { createTokenClient } from "@/src/lib/server-token";
import { NextRequest, NextResponse } from "next/server";


export async function GET(req: NextRequest) {
  try {
    let supabase;

    try {
      // Use token-based Supabase client
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

    // Get the authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: "Invalid or expired token" },
        { status: 401 }
      );
    }

    // Fetch user profile with all needed fields including dealership info
    const { data: profile, error: profileError } = await supabase
      .from("users")
      .select(`
        full_name,
        email,
        role,
        phone,
        avatar,
        is_platform_admin,
        dealership_id,
        is_active,
        user_permissions
      `)
      .eq("id", user.id)
      .single();

    // If profile not found, return basic user info
    if (profileError || !profile) {
      return NextResponse.json(
        {
          data: {
            full_name: user.user_metadata?.full_name || user.email?.split("@")[0] || "User",
            email: user.email,
            role: "user",
            phone: null,
            avatar: null,
            is_platform_admin: false,
            dealership_id: null,
            is_active: true,
            user_permissions: [],
            effective_permissions: [],
          }
        },
        { status: 200 }
      );
    }

    // If user has a dealership_id, fetch the dealership name
    let dealership_name = null;
    if (profile.dealership_id) {
      const { data: dealership } = await supabase
        .from("dealerships")
        .select("name")
        .eq("id", profile.dealership_id)
        .single();
      dealership_name = dealership?.name || null;
    }

    // Fetch role's permissions and merge with user_permissions
    let effectivePermissions: string[] = profile.user_permissions || [];
    if (profile.role && profile.dealership_id && !profile.is_platform_admin) {
      const { data: roleData } = await supabase
        .from("roles")
        .select("permissions")
        .eq("name", profile.role)
        .eq("dealership_id", profile.dealership_id)
        .single();

      if (roleData?.permissions && Array.isArray(roleData.permissions)) {
        // Merge: user_permissions override/add to role permissions
        const rolePerms = roleData.permissions as string[];
        if (rolePerms.includes("*")) {
          // Role has full access, use that
          effectivePermissions = ["*"];
        } else {
          // Merge: start with role perms, add any extra user perms
          const rolePermSet = new Set(rolePerms);
          for (const perm of effectivePermissions) {
            if (!rolePermSet.has(perm)) {
              rolePerms.push(perm);
            }
          }
          effectivePermissions = rolePerms;
        }
      }
    }

    // Return full profile data with platform admin and dealership info
    return NextResponse.json(
      {
        data: {
          full_name: profile.full_name,
          email: profile.email,
          role: profile.role,
          phone: profile.phone,
          avatar: profile.avatar,
          is_platform_admin: profile.is_platform_admin || false,
          dealership_id: profile.dealership_id,
          dealership_name: dealership_name,
          is_active: profile.is_active,
          user_permissions: profile.user_permissions || [],
          effective_permissions: effectivePermissions,
        }
      },
      { status: 200 }
    );
  } catch (err: any) {
    console.error("Error fetching user:", err);
    return NextResponse.json(
      { error: err?.message || "Internal server error" },
      { status: 500 }
    );
  }
}