// app/api/auth/login/route.ts
import { supabase } from "@/src/lib/supabase";
import { NextRequest, NextResponse } from "next/server";


export async function POST(req: NextRequest) {
  try {
    const { email, password } = await req.json();

    if (!email || !password) {
      return NextResponse.json(
        { error: "Email and password are required" },
        { status: 400 }
      );
    }

    // ✅ Simple login - just use the supabase client
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error || !data?.session) {
      return NextResponse.json(
        { error: "Invalid email or password" },
        { status: 401 }
      );
    }

    // Get user profile with role
    const { data: userProfile } = await supabase
      .from("users")
      .select("role, full_name, phone, avatar")
      .eq("id", data.user.id)
      .single();

    // Return response with role
    return NextResponse.json({
      user: {
        ...data.user,
        role: userProfile?.role || null,
        full_name: userProfile?.full_name || null,
        phone: userProfile?.phone || null,
        avatar: userProfile?.avatar || null,
      },
      access_token: data.session.access_token,
      refresh_token: data.session.refresh_token,
      expires_in: data.session.expires_in,
      token_type: data.session.token_type,
    });

  } catch (err) {
    console.error("Login error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}