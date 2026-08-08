import { NextRequest, NextResponse } from "next/server";
import { requireDealershipAccess } from "@/src/lib/auth-helpers";
import { revokeApiToken } from "@/src/lib/api/tokens";

type Params = { params: Promise<{ id: string }> };

export async function DELETE(req: NextRequest, { params }: Params) {
    try {
        const auth = await requireDealershipAccess(req);
        if (auth.error || !auth.profile) {
            return NextResponse.json(
                { error: auth.error || "Unauthorized" },
                { status: auth.status || 401 }
            );
        }
        const isAdmin =
            auth.profile.is_platform_admin ||
            auth.profile.role === "Admin" ||
            auth.profile.role === "Manager";
        if (!isAdmin) {
            return NextResponse.json(
                { error: "Forbidden - Admin or Manager required" },
                { status: 403 }
            );
        }

        const { id } = await params;
        const result = await revokeApiToken(auth.dealership_id, id);
        if (!result.ok) {
            return NextResponse.json({ error: result.error }, { status: 400 });
        }
        return NextResponse.json({ data: { id }, message: "API token revoked." });
    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : "Internal server error";
        console.error("API token revoke error:", message);
        return NextResponse.json({ error: message }, { status: 500 });
    }
}
