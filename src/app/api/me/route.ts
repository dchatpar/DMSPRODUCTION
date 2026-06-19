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

    // Fetch user profile with all needed fields
    const { data: profile, error: profileError } = await supabase
      .from("users")
      .select("full_name, email, role, phone, avatar")
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
          }
        },
        { status: 200 }
      );
    }

    // Return full profile data
    return NextResponse.json(
      {
        data: {
          full_name: profile.full_name,
          email: profile.email,
          role: profile.role,
          phone: profile.phone,
          avatar: profile.avatar,
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