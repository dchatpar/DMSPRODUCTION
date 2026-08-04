"use client";

import { useEffect, useState } from "react";
import { Code2, Copy, RefreshCw, Check, Globe, AlertCircle, Loader2 } from "lucide-react";
import { ListPageShell } from "@/src/components/ListPageShell";
import { Button } from "@/src/components/ui/Button";
import { apiFetch } from "@/src/lib/fetch";
import { toast } from "@/src/lib/toast";

interface EmbedSettings {
    dealership_id: string;
    dealership_name: string;
    slug: string | null;
    embed_token: string;
    embed_vdp_base: string | null;
    embed_token_required: boolean;
    snippet: string;
    api_url: string;
    wordpress_note: string;
}

export default function WebsiteEmbedSettingsPage() {
    const [data, setData] = useState<EmbedSettings | null>(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [rotating, setRotating] = useState(false);
    const [copied, setCopied] = useState(false);
    const [vdpBase, setVdpBase] = useState("");
    const [error, setError] = useState<string | null>(null);

    const load = async () => {
        try {
            setLoading(true);
            setError(null);
            const res = await apiFetch<{ data: EmbedSettings }>("/api/embed/settings");
            setData(res.data);
            setVdpBase(res.data.embed_vdp_base || "");
        } catch (err) {
            setError(err instanceof Error ? err.message : "Failed to load embed settings");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        void load();
    }, []);

    const copySnippet = async () => {
        if (!data?.snippet) return;
        try {
            await navigator.clipboard.writeText(data.snippet);
            setCopied(true);
            toast.success("Copied", "Embed snippet copied to clipboard.");
            setTimeout(() => setCopied(false), 2000);
        } catch {
            toast.error("Copy failed", "Select the snippet and copy manually.");
        }
    };

    const rotateToken = async () => {
        try {
            setRotating(true);
            const res = await apiFetch<{ data: EmbedSettings & { message?: string } }>(
                "/api/embed/settings",
                { method: "POST", body: { action: "rotate", embed_vdp_base: vdpBase } }
            );
            setData((prev) =>
                prev
                    ? {
                          ...prev,
                          ...res.data,
                          dealership_name: prev.dealership_name,
                          wordpress_note: prev.wordpress_note,
                          api_url: res.data.api_url || prev.api_url,
                      }
                    : (res.data as EmbedSettings)
            );
            toast.success("Token rotated", res.data.message || "Update pasted snippets on your site.");
            await load();
        } catch (err) {
            toast.error("Rotate failed", err instanceof Error ? err.message : "Try again");
        } finally {
            setRotating(false);
        }
    };

    const saveVdp = async () => {
        try {
            setSaving(true);
            const res = await apiFetch<{ data: EmbedSettings }>(
                "/api/embed/settings",
                { method: "POST", body: { embed_vdp_base: vdpBase } }
            );
            setData((prev) => (prev ? { ...prev, ...res.data } : (res.data as EmbedSettings)));
            toast.success("Saved", "VDP link base updated.");
            await load();
        } catch (err) {
            toast.error("Save failed", err instanceof Error ? err.message : "Try again");
        } finally {
            setSaving(false);
        }
    };

    return (
        <ListPageShell
            title="Website inventory embed"
            description="Drop-in widget for your dealership website or WordPress Custom HTML block. Scoped to this dealership only."
            icon={Globe}
            actions={
                <Button variant="outline" size="sm" onClick={() => void load()} disabled={loading}>
                    <RefreshCw className="h-3.5 w-3.5" />
                    Refresh
                </Button>
            }
        >
            {loading ? (
                <div className="flex items-center gap-2 py-16 text-sm text-muted-foreground">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Loading embed settings…
                </div>
            ) : error ? (
                <div className="flex items-start gap-2 rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">
                    <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                    <div>
                        <p className="font-medium">Could not load embed settings</p>
                        <p className="mt-0.5 text-destructive/80">{error}</p>
                        <p className="mt-2 text-muted-foreground">
                            Dealership Admin/Manager or platform admin access is required.
                        </p>
                    </div>
                </div>
            ) : data ? (
                <div className="mx-auto max-w-3xl space-y-6">
                    <section className="space-y-3 border-b border-border pb-6">
                        <h2 className="text-sm font-semibold tracking-tight text-foreground">
                            {data.dealership_name}
                        </h2>
                        <p className="text-[13px] text-muted-foreground">
                            Public API returns only <span className="font-medium text-foreground">Active</span>{" "}
                            vehicles for this dealership. Other tenants are never included.
                        </p>
                        <dl className="grid gap-2 text-[13px] sm:grid-cols-2">
                            <div>
                                <dt className="text-muted-foreground">Dealership ID</dt>
                                <dd className="font-mono text-xs text-foreground">{data.dealership_id}</dd>
                            </div>
                            <div>
                                <dt className="text-muted-foreground">Embed token</dt>
                                <dd className="truncate font-mono text-xs text-foreground">{data.embed_token}</dd>
                            </div>
                        </dl>
                    </section>

                    <section className="space-y-3 border-b border-border pb-6">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                            <h2 className="flex items-center gap-2 text-sm font-semibold tracking-tight">
                                <Code2 className="h-4 w-4 text-muted-foreground" />
                                Embed snippet
                            </h2>
                            <div className="flex gap-2">
                                <Button variant="outline" size="sm" onClick={() => void copySnippet()}>
                                    {copied ? (
                                        <Check className="h-3.5 w-3.5" />
                                    ) : (
                                        <Copy className="h-3.5 w-3.5" />
                                    )}
                                    {copied ? "Copied" : "Copy"}
                                </Button>
                                <Button
                                    variant="secondary"
                                    size="sm"
                                    onClick={() => void rotateToken()}
                                    disabled={rotating}
                                    loading={rotating}
                                >
                                    Rotate token
                                </Button>
                            </div>
                        </div>
                        <pre className="overflow-x-auto rounded-lg border border-border bg-muted/40 p-4 text-[12px] leading-relaxed text-foreground">
                            {data.snippet}
                        </pre>
                        <p className="text-[13px] text-muted-foreground">{data.wordpress_note}</p>
                    </section>

                    <section className="space-y-3 border-b border-border pb-6">
                        <h2 className="text-sm font-semibold tracking-tight">Vehicle detail page base URL</h2>
                        <p className="text-[13px] text-muted-foreground">
                            Optional. Card clicks open{" "}
                            <code className="rounded bg-muted px-1 text-xs">base/&#123;vehicleId&#125;</code>.
                        </p>
                        <div className="flex flex-col gap-2 sm:flex-row">
                            <input
                                type="url"
                                value={vdpBase}
                                onChange={(e) => setVdpBase(e.target.value)}
                                placeholder="https://yoursite.com/inventory"
                                className="h-9 flex-1 rounded-md border border-border bg-card px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
                            />
                            <Button size="sm" onClick={() => void saveVdp()} disabled={saving} loading={saving}>
                                Save
                            </Button>
                        </div>
                    </section>

                    <section className="space-y-2">
                        <h2 className="text-sm font-semibold tracking-tight">JSON API</h2>
                        <p className="break-all font-mono text-[11px] text-muted-foreground">{data.api_url}</p>
                        <p className="text-[13px] text-muted-foreground">
                            Without <code className="rounded bg-muted px-1 text-xs">dealership_id</code>,{" "}
                            <code className="rounded bg-muted px-1 text-xs">slug</code>, or{" "}
                            <code className="rounded bg-muted px-1 text-xs">token</code> the API returns{" "}
                            <strong>400</strong>. When an embed token exists, prefer including it in
                            the snippet. Locking to token-only requires operator{" "}
                            <code className="rounded bg-muted px-1 text-xs">embed_token_required</code>{" "}
                            in dealership settings (not self-serve yet). Native WordPress pages fed
                            by this API remain best for SEO; the widget adds optional JSON-LD on
                            cards.
                        </p>
                    </section>
                </div>
            ) : null}
        </ListPageShell>
    );
}
