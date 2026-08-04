// Integration status (env-gated). Never returns secret values.
import { NextRequest, NextResponse } from "next/server";
import { requireDealershipAccess } from "@/src/lib/auth-helpers";
import { isResendConfigured } from "@/src/lib/resend";
import { getFacebookEnv } from "@/src/lib/social/facebook";
import { getCarfaxEnv } from "@/src/lib/carfax";
import { supabaseAdmin } from "@/src/lib/supabase-admin";

type IntegrationStatus = {
    id: string;
    name: string;
    description: string;
    configured: boolean;
    status: "live" | "missing_env" | "partial" | "url_only";
    missing: string[];
    notes: string;
    href?: string;
};

export async function GET(req: NextRequest) {
    try {
        const auth = await requireDealershipAccess(req);
        if (auth.error || !auth.profile) {
            return NextResponse.json(
                { error: auth.error || "Unauthorized" },
                { status: 401 }
            );
        }

        const facebook = getFacebookEnv();
        const resendOk = isResendConfigured();
        const carfax = getCarfaxEnv();

        let facebookConnected = false;
        let facebookPageName: string | null = null;
        let autotraderCompanySet = false;
        let autotraderLastExport: string | null = null;
        const dealershipId = auth.profile.dealership_id;
        if (dealershipId) {
            const { data: fbRow } = await supabaseAdmin
                .from("facebook_business_account")
                .select("page_name, is_active, access_token")
                .eq("dealership_id", dealershipId)
                .order("updated_at", { ascending: false })
                .limit(1)
                .maybeSingle();
            facebookConnected = Boolean(
                fbRow?.is_active && fbRow?.access_token
            );
            facebookPageName = fbRow?.page_name || null;

            const { data: dealer } = await supabaseAdmin
                .from("dealerships")
                .select("settings")
                .eq("id", dealershipId)
                .maybeSingle();
            const settings = (dealer?.settings || {}) as Record<string, unknown>;
            autotraderCompanySet = Boolean(
                (typeof settings.autotrader_company_id === "string" &&
                    settings.autotrader_company_id.trim()) ||
                    (typeof settings.autotrader_companyId === "string" &&
                        settings.autotrader_companyId.trim())
            );
            const syndication =
                typeof settings.syndication === "object" &&
                settings.syndication !== null
                    ? (settings.syndication as Record<string, unknown>)
                    : {};
            const atMeta =
                typeof syndication.autotrader === "object" &&
                syndication.autotrader !== null
                    ? (syndication.autotrader as Record<string, unknown>)
                    : {};
            autotraderLastExport =
                typeof atMeta.last_export_at === "string"
                    ? atMeta.last_export_at
                    : null;
        }

        const metaStatus: IntegrationStatus["status"] = !facebook.oauth_ready
            ? "missing_env"
            : facebookConnected
              ? "live"
              : "partial";

        const integrations: IntegrationStatus[] = [
            {
                id: "resend",
                name: "Resend (email)",
                description:
                    "OTP, password reset, trial mail, and CRM lead email sequences.",
                configured: resendOk,
                status: resendOk ? "live" : "missing_env",
                missing: [
                    ...(!process.env.RESEND_API_KEY ? ["RESEND_API_KEY"] : []),
                    ...(!process.env.EMAIL_FROM ? ["EMAIL_FROM"] : []),
                ],
                href: "/email-sequences",
                notes: resendOk
                    ? "Worker env has RESEND_API_KEY and EMAIL_FROM. CRM sequences can send from Lead Center / Email sequences."
                    : "Not configured — add via wrangler when ready. Enroll works; sends stay blocked (no fake Sent). Do not invent keys.",
            },
            {
                id: "meta_facebook",
                name: "Meta / Facebook",
                description:
                    "Social posting — connect a Facebook Page to publish & schedule.",
                configured: facebook.oauth_ready,
                status: metaStatus,
                missing: facebook.missing,
                href: "/social",
                notes: !facebook.oauth_ready
                    ? "Not configured — add via wrangler when ready (FACEBOOK_APP_ID/SECRET; optional FACEBOOK_REDIRECT_URI, SOCIAL_CRON_SECRET). Drafts OK; Connect stays disabled."
                    : facebookConnected
                      ? `Page connected${facebookPageName ? `: ${facebookPageName}` : ""}. Publish/schedule from Social.`
                      : "App credentials present — connect a Page from Social Posting.",
            },
            {
                id: "carfax",
                name: "CARFAX",
                description:
                    "PDF upload, partner VHR link, or partner API fetch per vehicle.",
                configured: carfax.configured,
                status: carfax.status,
                missing: carfax.missing,
                notes: carfax.notes,
            },
            {
                id: "kijiji_syndication",
                name: "Kijiji listing pack",
                description:
                    "Copy/export Kijiji-ready text, JSON, or CSV from vehicle VDP.",
                configured: true,
                status: "url_only",
                missing: [],
                href: "/inventory",
                notes:
                    "Honest MVP — no Kijiji API credentials. Open a vehicle VDP → Marketplace syndication.",
            },
            {
                id: "autotrader_syndication",
                name: "AutoTrader Canada feed",
                description:
                    "Pipe-delimited / CSV inventory feed for AT.ca partner upload (download only).",
                configured: true,
                status: autotraderCompanySet ? "partial" : "url_only",
                missing: autotraderCompanySet
                    ? []
                    : ["settings.autotrader_company_id"],
                href: "/inventory",
                notes: autotraderLastExport
                    ? `Export/feed ready. Last export ${autotraderLastExport}. Not auto-listed — upload via your AT/HomeNet process.${
                          autotraderCompanySet
                              ? ""
                              : " Set autotrader_company_id in Business settings JSON when you have a Company ID."
                      }`
                    : `VDP or Inventory → AutoTrader pipe feed / CSV. Batch: Active stock via Inventory “AT.ca feed”.${
                          autotraderCompanySet
                              ? ""
                              : " Optional: set settings.autotrader_company_id for partner CompanyID."
                      }`,
            },
        ];

        return NextResponse.json({
            data: {
                integrations,
                email_from_set: Boolean(process.env.EMAIL_FROM),
                secrets_present: {
                    RESEND_API_KEY: Boolean(process.env.RESEND_API_KEY),
                    EMAIL_FROM: Boolean(process.env.EMAIL_FROM),
                    FACEBOOK_APP_ID: Boolean(process.env.FACEBOOK_APP_ID),
                    FACEBOOK_APP_SECRET: Boolean(
                        process.env.FACEBOOK_APP_SECRET
                    ),
                    FACEBOOK_REDIRECT_URI: Boolean(
                        process.env.FACEBOOK_REDIRECT_URI
                    ),
                    SOCIAL_CRON_SECRET: Boolean(
                        process.env.SOCIAL_CRON_SECRET
                    ),
                    CARFAX_PARTNER_ID: Boolean(process.env.CARFAX_PARTNER_ID),
                    CARFAX_API_KEY: Boolean(process.env.CARFAX_API_KEY),
                    CARFAX_API_URL: Boolean(process.env.CARFAX_API_URL),
                },
            },
        });
    } catch (error: unknown) {
        console.error("Error fetching integration status:", error);
        return NextResponse.json(
            {
                error:
                    error instanceof Error
                        ? error.message
                        : "Internal server error",
            },
            { status: 500 }
        );
    }
}
