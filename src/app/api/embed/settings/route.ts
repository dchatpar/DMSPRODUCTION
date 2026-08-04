// Dealership-scoped website inventory embed settings (token + snippet).
import { createTokenClient } from "@/src/lib/server-token";
import { supabaseAdmin } from "@/src/lib/supabase-admin";
import { NextRequest, NextResponse } from "next/server";

function newEmbedToken(): string {
    const bytes = new Uint8Array(24);
    crypto.getRandomValues(bytes);
    const hex = Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
    return `aix_${hex}`;
}

function buildSnippet(opts: {
    origin: string;
    dealershipId: string;
    token: string;
    vdpBase?: string | null;
}): string {
    const vdpAttr = opts.vdpBase
        ? `\n  data-vdp-base="${opts.vdpBase.replace(/"/g, "")}"`
        : "";
    return `<!-- AdaptUs inventory embed (WordPress: Custom HTML block) -->
<div
  data-adaptus-inventory
  data-dealership="${opts.dealershipId}"
  data-token="${opts.token}"${vdpAttr}
></div>
<script async src="${opts.origin}/embed/inventory.js"></script>`;
}

async function getCaller(req: NextRequest) {
    let supabase;
    try {
        supabase = createTokenClient(req);
    } catch (error: unknown) {
        if (error instanceof Error && error.message === "MISSING_BEARER_TOKEN") {
            return { error: "Authorization token required", status: 401 as const };
        }
        throw error;
    }

    const {
        data: { user },
        error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
        return { error: "Invalid or expired token", status: 401 as const };
    }

    const { data: profile } = await supabase
        .from("users")
        .select("id, role, dealership_id, is_platform_admin")
        .eq("id", user.id)
        .single();

    if (!profile) {
        return { error: "User profile not found", status: 404 as const };
    }

    return { supabase, user, profile, error: null as null, status: 200 as const };
}

/** GET current embed settings for the caller's dealership (or ?dealership_id= for platform admin). */
export async function GET(req: NextRequest) {
    try {
        const caller = await getCaller(req);
        if (caller.error || !caller.profile) {
            return NextResponse.json({ error: caller.error }, { status: caller.status });
        }

        const url = new URL(req.url);
        const requestedId = url.searchParams.get("dealership_id");
        const isPlatformAdmin = caller.profile.is_platform_admin === true;
        const isDealershipAdmin = caller.profile.role === "Admin";

        if (!isPlatformAdmin && !isDealershipAdmin) {
            return NextResponse.json(
                { error: "Unauthorized - Admin access required" },
                { status: 403 }
            );
        }

        let dealershipId = caller.profile.dealership_id as string | null;
        if (isPlatformAdmin && requestedId) {
            dealershipId = requestedId;
        }

        if (!dealershipId) {
            return NextResponse.json(
                { error: "No dealership context" },
                { status: 400 }
            );
        }

        // Non-platform admins cannot spoof another dealership
        if (!isPlatformAdmin && dealershipId !== caller.profile.dealership_id) {
            return NextResponse.json(
                { error: "Forbidden - Dealership access denied" },
                { status: 403 }
            );
        }

        const { data: dealership, error } = await supabaseAdmin
            .from("dealerships")
            .select("id, name, slug, settings, business_name")
            .eq("id", dealershipId)
            .single();

        if (error || !dealership) {
            return NextResponse.json({ error: "Dealership not found" }, { status: 404 });
        }

        const settings = (dealership.settings || {}) as Record<string, unknown>;
        let token = typeof settings.embed_token === "string" ? settings.embed_token : null;
        const vdpBase =
            typeof settings.embed_vdp_base === "string" ? settings.embed_vdp_base : null;

        // Lazy-provision token on first view (no vehicle/deal rows touched)
        if (!token) {
            token = newEmbedToken();
            const nextSettings = { ...settings, embed_token: token };
            await supabaseAdmin
                .from("dealerships")
                .update({ settings: nextSettings })
                .eq("id", dealershipId);
        }

        const origin = url.origin;
        const snippet = buildSnippet({
            origin,
            dealershipId: dealership.id,
            token,
            vdpBase,
        });

        return NextResponse.json({
            data: {
                dealership_id: dealership.id,
                dealership_name: dealership.business_name || dealership.name,
                slug: dealership.slug,
                embed_token: token,
                embed_vdp_base: vdpBase,
                embed_token_required: settings.embed_token_required === true,
                snippet,
                api_url: `${origin}/api/vehicles/public?dealership_id=${dealership.id}&token=${token}`,
                wordpress_note:
                    "WordPress: Appearance → Widgets or any page → add a Custom HTML block → paste the snippet. For best SEO, prefer native pages fed by the JSON API.",
            },
        });
    } catch (error: unknown) {
        console.error("Error fetching embed settings:", error);
        const message = error instanceof Error ? error.message : "Internal server error";
        return NextResponse.json({ error: message }, { status: 500 });
    }
}

/** POST rotate token or update VDP base. Body: { action?: "rotate", embed_vdp_base?: string, dealership_id?: string } */
export async function POST(req: NextRequest) {
    try {
        const caller = await getCaller(req);
        if (caller.error || !caller.profile) {
            return NextResponse.json({ error: caller.error }, { status: caller.status });
        }

        const isPlatformAdmin = caller.profile.is_platform_admin === true;
        const isDealershipAdmin = caller.profile.role === "Admin";

        if (!isPlatformAdmin && !isDealershipAdmin) {
            return NextResponse.json(
                { error: "Unauthorized - Admin access required" },
                { status: 403 }
            );
        }

        const body = await req.json().catch(() => ({}));
        const action = body.action as string | undefined;

        let dealershipId = caller.profile.dealership_id as string | null;
        if (isPlatformAdmin && typeof body.dealership_id === "string") {
            dealershipId = body.dealership_id;
        }

        if (!dealershipId) {
            return NextResponse.json({ error: "No dealership context" }, { status: 400 });
        }

        if (!isPlatformAdmin && dealershipId !== caller.profile.dealership_id) {
            return NextResponse.json(
                { error: "Forbidden - Dealership access denied" },
                { status: 403 }
            );
        }

        const { data: dealership, error } = await supabaseAdmin
            .from("dealerships")
            .select("id, name, slug, settings, business_name")
            .eq("id", dealershipId)
            .single();

        if (error || !dealership) {
            return NextResponse.json({ error: "Dealership not found" }, { status: 404 });
        }

        const settings = { ...((dealership.settings || {}) as Record<string, unknown>) };

        if (action === "rotate" || !settings.embed_token) {
            settings.embed_token = newEmbedToken();
        }

        if (typeof body.embed_vdp_base === "string") {
            settings.embed_vdp_base = body.embed_vdp_base.trim() || null;
        }

        if (typeof body.embed_token_required === "boolean") {
            settings.embed_token_required = body.embed_token_required;
        }

        const { error: updateError } = await supabaseAdmin
            .from("dealerships")
            .update({ settings })
            .eq("id", dealershipId);

        if (updateError) throw updateError;

        const origin = new URL(req.url).origin;
        const token = settings.embed_token as string;
        const vdpBase =
            typeof settings.embed_vdp_base === "string" ? settings.embed_vdp_base : null;

        return NextResponse.json({
            data: {
                dealership_id: dealership.id,
                embed_token: token,
                embed_vdp_base: vdpBase,
                embed_token_required: settings.embed_token_required === true,
                snippet: buildSnippet({
                    origin,
                    dealershipId: dealership.id,
                    token,
                    vdpBase,
                }),
                message:
                    action === "rotate"
                        ? "Embed token rotated. Update any pasted snippets on your website."
                        : "Embed settings saved.",
            },
        });
    } catch (error: unknown) {
        console.error("Error updating embed settings:", error);
        const message = error instanceof Error ? error.message : "Internal server error";
        return NextResponse.json({ error: message }, { status: 500 });
    }
}
