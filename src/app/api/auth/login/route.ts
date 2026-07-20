// app/api/auth/login/route.ts
import { supabase } from "@/src/lib/supabase";
import { supabaseAdmin } from "@/src/lib/supabase-admin";
import { NextRequest, NextResponse } from "next/server";

// Helper function to determine device type from user agent
function getDeviceType(userAgent: string): string {
  if (userAgent.includes('mobile') || userAgent.includes('android') || userAgent.includes('iphone')) {
    return 'Mobile';
  }
  if (userAgent.includes('tablet') || userAgent.includes('ipad')) {
    return 'Tablet';
  }
  return 'Desktop';
}

// Helper function to log login attempt
async function logLoginAttempt(
  userId: string | null,
  email: string,
  success: boolean,
  failureReason: string | null,
  ipAddress: string,
  userAgent: string,
  dealershipId: string | null
) {
  try {
    const deviceType = getDeviceType(userAgent);

    const { error } = await supabaseAdmin
      .from('login_history')
      .insert({
        user_id: userId,
        email: email,
        success: success,
        failure_reason: failureReason,
        ip_address: ipAddress,
        user_agent: userAgent,
        device_type: deviceType,
        dealership_id: dealershipId,
      });

    if (error) {
      console.error('Failed to log login attempt:', error);
    }
  } catch (err) {
    // Log failures should not block login
    console.error('Exception logging login attempt:', err);
  }
}

export async function POST(req: NextRequest) {
  try {
    const { email, password } = await req.json();

    if (!email || !password) {
      return NextResponse.json(
        { error: "Email and password are required" },
        { status: 400 }
      );
    }

    // Get IP and user agent for login logging
    const ipAddress = req.headers.get("x-forwarded-for") || req.headers.get("x-real-ip") || "unknown";
    const userAgent = req.headers.get("user-agent") || "unknown";

    // ✅ Simple login - just use the supabase client
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error || !data?.session) {
      // Log failed login attempt
      await logLoginAttempt(
        null,
        email,
        false,
        error?.message || "Invalid credentials",
        ipAddress,
        userAgent,
        null
      );

      return NextResponse.json(
        { error: "Invalid email or password" },
        { status: 401 }
      );
    }

    // Get user profile with role and dealership_id
    const { data: userProfile } = await supabase
      .from("users")
      .select("role, full_name, phone, avatar, dealership_id, is_active")
      .eq("id", data.user.id)
      .single();

    // Check if user is active (not suspended)
    if (userProfile && !userProfile.is_active) {
      return NextResponse.json(
        { error: "Account is suspended. Please contact your administrator." },
        { status: 403 }
      );
    }

    // Log successful login
    await logLoginAttempt(
      data.user.id,
      email,
      true,
      null,
      ipAddress,
      userAgent,
      userProfile?.dealership_id || null
    );

    // Return response with role and set HttpOnly cookies so middleware can read session
    const body = {
      user: {
        ...data.user,
        role: userProfile?.role || null,
        full_name: userProfile?.full_name || null,
        phone: userProfile?.phone || null,
        avatar: userProfile?.avatar || null,
        dealership_id: userProfile?.dealership_id || null,
      },
      access_token: data.session.access_token,
      refresh_token: data.session.refresh_token,
      expires_in: data.session.expires_in,
      token_type: data.session.token_type,
    };

    const res = NextResponse.json(body);

    // Set HttpOnly cookies so server-side middleware and SSR can access session
    try {
      const cookieOptions = {
        httpOnly: true,
        path: '/',
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax' as const,
        maxAge: data.session.expires_in || 60 * 60,
      };

      res.cookies.set('sb-access-token', data.session.access_token, cookieOptions);
      if (data.session.refresh_token) {
        res.cookies.set('sb-refresh-token', data.session.refresh_token, cookieOptions);
      }
    } catch (e) {
      console.warn('Failed to set auth cookies:', e);
    }

    return res;

  } catch (err) {
    console.error("Login error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}