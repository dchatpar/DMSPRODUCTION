import { NextRequest, NextResponse } from "next/server";
import {
    requireDealershipAccess,
    pickSupabaseClient,
} from "@/src/lib/auth-helpers";
import {
    autoTraderRowsToCsv,
    autoTraderRowsToPipeFeed,
    buildAutoTraderPackMeta,
} from "@/src/lib/syndication/autotrader";
import {
    buildAutoTraderRowsForVehicles,
    loadDealershipSyndicationContext,
    recordSyndicationExport,
    SYNDICATION_VEHICLE_SELECT,
} from "@/src/lib/syndication/helpers";

/**
 * Batch marketplace feed export (AutoTrader Canada).
 *
 * GET /api/vehicles/syndication?board=autotrader&format=feed|csv|json
 * Optional: status=Active (default Active), ids=uuid,uuid (multi-VIN subset)
 *
 * Honest MVP: downloadable feed — no SFTP / auto-post.
 */
export async function GET(req: NextRequest) {
    try {
        const auth = await requireDealershipAccess(req);
        if (auth.error || !auth.profile) {
            return NextResponse.json(
                { error: auth.error || "Unauthorized" },
                { status: 401 }
            );
        }

        const dealershipId = auth.profile.dealership_id;
        if (!dealershipId) {
            return NextResponse.json(
                { error: "Dealership required" },
                { status: 400 }
            );
        }

        let supabase;
        try {
            supabase = pickSupabaseClient(req, auth.profile).supabase;
        } catch (error: unknown) {
            if (
                error instanceof Error &&
                error.message === "MISSING_BEARER_TOKEN"
            ) {
                return NextResponse.json(
                    { error: "Authorization token required" },
                    { status: 401 }
                );
            }
            throw error;
        }

        const url = new URL(req.url);
        const board = (url.searchParams.get("board") || "autotrader").toLowerCase();
        const format = (url.searchParams.get("format") || "feed").toLowerCase();
        const statusFilter =
            url.searchParams.get("status") || "Active";
        const idsRaw = url.searchParams.get("ids");

        if (board !== "autotrader") {
            return NextResponse.json(
                {
                    error:
                        "Batch export supports board=autotrader. Use /api/vehicles/[id]/syndication for kijiji.",
                },
                { status: 400 }
            );
        }

        const ctx = await loadDealershipSyndicationContext(
            supabase,
            dealershipId
        );

        let query = supabase
            .from("vehicles")
            .select(SYNDICATION_VEHICLE_SELECT)
            .eq("dealership_id", dealershipId);

        if (idsRaw) {
            const ids = idsRaw
                .split(",")
                .map((s) => s.trim())
                .filter(Boolean)
                .slice(0, 200);
            if (ids.length === 0) {
                return NextResponse.json(
                    { error: "ids query must list at least one vehicle id" },
                    { status: 400 }
                );
            }
            query = query.in("id", ids);
        } else if (statusFilter && statusFilter.toLowerCase() !== "all") {
            query = query.eq("status", statusFilter);
        }

        const { data: vehicles, error } = await query.limit(500);

        if (error) {
            return NextResponse.json(
                { error: error.message || "Failed to load vehicles" },
                { status: 500 }
            );
        }

        const list = (vehicles || []) as Record<string, unknown>[];
        if (list.length === 0) {
            return NextResponse.json(
                {
                    error: "No vehicles matched for feed export",
                    meta: buildAutoTraderPackMeta([]),
                },
                { status: 404 }
            );
        }

        const rows = buildAutoTraderRowsForVehicles(list, ctx.autotrader);
        const meta = buildAutoTraderPackMeta(rows);
        const okRows = rows.filter((r) => r.ok);

        if (okRows.length === 0) {
            return NextResponse.json(
                {
                    error:
                        "Every matched vehicle is missing required AutoTrader fields (VIN, price, photos, year/make/model)",
                    meta,
                },
                { status: 422 }
            );
        }

        const stamp = new Date().toISOString().slice(0, 10);

        if (format === "json") {
            return NextResponse.json({ data: { rows }, meta });
        }

        await recordSyndicationExport(supabase, dealershipId, ctx.settings, {
            board: "autotrader",
            included: meta.included,
            skipped: meta.skipped,
            vins: okRows.map((r) => r.vin),
        });

        if (format === "csv") {
            const body = autoTraderRowsToCsv(rows);
            return new NextResponse(body + "\n", {
                status: 200,
                headers: {
                    "Content-Type": "text/csv; charset=utf-8",
                    "Content-Disposition": `attachment; filename="autotrader-ca-batch-${stamp}.csv"`,
                    "X-Syndication-Included": String(meta.included),
                    "X-Syndication-Skipped": String(meta.skipped),
                },
            });
        }

        // Default: pipe feed
        const body = autoTraderRowsToPipeFeed(rows);
        return new NextResponse(body + (body ? "\n" : ""), {
            status: 200,
            headers: {
                "Content-Type": "text/plain; charset=utf-8",
                "Content-Disposition": `attachment; filename="autotrader-ca-batch-${stamp}.txt"`,
                "X-Syndication-Included": String(meta.included),
                "X-Syndication-Skipped": String(meta.skipped),
            },
        });
    } catch (error: unknown) {
        console.error("Error building batch syndication feed:", error);
        return NextResponse.json(
            {
                error:
                    error instanceof Error
                        ? error.message
                        : "Failed to build feed",
            },
            { status: 500 }
        );
    }
}
