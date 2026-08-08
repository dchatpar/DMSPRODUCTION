"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { CheckCircle2, Loader2, Plug, XCircle, ArrowRight, Wrench } from "lucide-react";
import { ListPageShell } from "@/src/components/ListPageShell";
import { apiFetch } from "@/src/lib/fetch";
import { DeveloperPanel } from "./DeveloperPanel";

interface IntegrationRow {
    id: string;
    name: string;
    description: string;
    configured: boolean;
    status: "live" | "missing_env" | "partial" | "url_only";
    missing: string[];
    notes: string;
    href?: string;
}

interface IntegrationsData {
    dealership_id: string | null;
    integrations: IntegrationRow[];
}

export default function IntegrationsSettingsPage() {
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [integrations, setIntegrations] = useState<IntegrationRow[]>([]);
    const [dealershipId, setDealershipId] = useState<string | null>(null);

    useEffect(() => {
        (async () => {
            try {
                setLoading(true);
                const res = await apiFetch<{
                    data: IntegrationsData;
                }>("/api/settings/integrations");
                setIntegrations(res.data.integrations || []);
                setDealershipId(res.data.dealership_id || null);
            } catch (err) {
                setError(
                    err instanceof Error
                        ? err.message
                        : "Failed to load integrations"
                );
            } finally {
                setLoading(false);
            }
        })();
    }, []);

    return (
        <ListPageShell
            title="Integrations"
            description="Email (CRM sequences), Meta/Facebook, CARFAX, Kijiji pack, AutoTrader feed — status only; secrets stay in Worker env"
            icon={Plug}
            breadcrumbs={[
                { label: "Settings", href: "/settings/integrations" },
                { label: "Integrations" },
            ]}
        >
            {loading ? (
                <div className="flex justify-center py-16">
                    <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
            ) : error ? (
                <div className="rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">
                    {error}
                </div>
            ) : (
                <div className="space-y-3">
                    <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2.5 text-sm text-amber-950">
                        <p className="font-medium">
                            Not configured — add via wrangler when ready
                        </p>
                        <p className="mt-0.5 text-xs text-amber-900/90">
                            Amber rows need Worker secrets. Do not invent keys.
                            Green &quot;live&quot; only appears after real env is
                            set.
                        </p>
                    </div>
                    {integrations.map((item) => {
                        const missing = item.status === "missing_env";
                        const ok =
                            item.status === "live" ||
                            item.status === "url_only" ||
                            item.status === "partial";
                        let statusLabel: string;
                        switch (item.status) {
                            case "missing_env":
                                statusLabel = "Not configured";
                                break;
                            case "live":
                                statusLabel = "Connected";
                                break;
                            case "partial":
                                statusLabel = "Partial";
                                break;
                            case "url_only":
                                statusLabel = "Ready (no API key)";
                                break;
                            default: {
                                const _exhaustive: never = item.status;
                                statusLabel = String(_exhaustive);
                                break;
                            }
                        }
                        return (
                            <div
                                key={item.id}
                                className={`rounded-lg border bg-card p-4 ${
                                    missing
                                        ? "border-amber-200"
                                        : "border-border"
                                }`}
                            >
                                <div className="flex items-start gap-3">
                                    <div
                                        className={`mt-0.5 rounded-md p-1.5 ${
                                            item.status === "live"
                                                ? "bg-emerald-50 text-emerald-700"
                                                : missing
                                                  ? "bg-amber-50 text-amber-700"
                                                  : "bg-[#2563EB]/10 text-[#2563EB]"
                                        }`}
                                    >
                                        {ok && !missing ? (
                                            <CheckCircle2 className="h-4 w-4" />
                                        ) : (
                                            <XCircle className="h-4 w-4" />
                                        )}
                                    </div>
                                    <div className="min-w-0 flex-1">
                                        <div className="flex flex-wrap items-center gap-2">
                                            <h2 className="text-sm font-semibold text-foreground">
                                                {item.name}
                                            </h2>
                                            <span
                                                className={`rounded-md px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${
                                                    missing
                                                        ? "bg-amber-100 text-amber-800"
                                                        : item.status === "live"
                                                          ? "bg-emerald-100 text-emerald-800"
                                                          : "bg-muted text-muted-foreground"
                                                }`}
                                            >
                                                {statusLabel}
                                            </span>
                                        </div>
                                        <p className="mt-1 text-sm text-muted-foreground">
                                            {item.description}
                                        </p>
                                        <p className="mt-2 text-xs text-foreground/80">
                                            {item.notes}
                                        </p>
                                        {item.missing.length > 0 && (
                                            <p className="mt-2 text-xs text-amber-700">
                                                Missing — add via wrangler when
                                                ready:{" "}
                                                {item.missing.join(", ")}
                                            </p>
                                        )}
                                        {item.href && (
                                            <Link
                                                href={item.href}
                                                className="mt-2 inline-flex items-center gap-1 text-xs font-medium text-[#2563EB] hover:underline"
                                            >
                                                Open module
                                                <ArrowRight className="h-3 w-3" />
                                            </Link>
                                        )}
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                    <p className="text-xs text-muted-foreground">
                        Secrets are never shown here. When ready:{" "}
                        <code className="rounded bg-muted px-1">
                            npx wrangler secret put &lt;NAME&gt; --name
                            flashfender-dms
                        </code>
                    </p>
                </div>
            )}

            <div className="pt-2">
                <div className="mb-4 flex items-center gap-2">
                    <Wrench className="h-4 w-4 text-muted-foreground" />
                    <h2 className="text-base font-semibold text-foreground">
                        Developer tools
                    </h2>
                </div>
                <DeveloperPanel dealershipId={dealershipId} />
            </div>
        </ListPageShell>
    );
}
