"use client";

// Command palette (⌘K / Ctrl+K) — cmdk search over vehicles, customers, deals, leads.

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
    Car,
    FileText,
    Loader2,
    Sparkles,
    Users,
    UserRound,
} from "lucide-react";
import { apiFetch } from "@/src/lib/fetch";
import {
    Command,
    CommandEmpty,
    CommandGroup,
    CommandInput,
    CommandItem,
    CommandList,
    CommandSeparator,
} from "@/src/components/ui/command";
import { useFlashAi } from "@/src/components/ai/FlashAiProvider";

type ResultKind = "vehicle" | "customer" | "deal" | "lead";

interface SearchResult {
    id: string;
    kind: ResultKind;
    title: string;
    subtitle: string;
    href: string;
}

interface CommandPaletteProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
}

const KIND_META: Record<ResultKind, { label: string; icon: typeof Car }> = {
    vehicle: { label: "Vehicles", icon: Car },
    customer: { label: "Customers", icon: UserRound },
    deal: { label: "Deals", icon: FileText },
    lead: { label: "Leads", icon: Users },
};

function vehicleLabel(v: Record<string, unknown>): string {
    const year = v.year ?? "";
    const make = v.make ?? "";
    const model = v.model ?? "";
    const stock = v.stock_number ?? v.stockNumber;
    const parts = [year, make, model].filter(Boolean).join(" ");
    return stock ? `${parts} · ${String(stock)}` : parts || "Vehicle";
}

export function CommandPalette({ open, onOpenChange }: CommandPaletteProps) {
    const router = useRouter();
    const { openPanel } = useFlashAi();
    const [query, setQuery] = useState("");
    const [loading, setLoading] = useState(false);
    const [results, setResults] = useState<SearchResult[]>([]);

    const close = useCallback(() => {
        onOpenChange(false);
        setQuery("");
        setResults([]);
    }, [onOpenChange]);

    const askFlash = useCallback(() => {
        const seed = query.trim().length >= 2 ? query.trim() : undefined;
        close();
        openPanel(seed);
    }, [close, openPanel, query]);

    useEffect(() => {
        if (!open) return;
        const q = query.trim();
        if (q.length < 2) {
            setResults([]);
            setLoading(false);
            return;
        }

        let cancelled = false;
        setLoading(true);
        const timer = window.setTimeout(async () => {
            try {
                const enc = encodeURIComponent(q);
                const [vehicles, customers, deals, leads] = await Promise.all([
                    apiFetch<{ data: Record<string, unknown>[] }>(
                        `/api/vehicles?q=${enc}&limit=5`,
                        { silent: true }
                    ).catch(() => ({ data: [] })),
                    apiFetch<{ data: Record<string, unknown>[] }>(
                        `/api/customers?q=${enc}&limit=5`,
                        { silent: true }
                    ).catch(() => ({ data: [] })),
                    apiFetch<{ data: Record<string, unknown>[] }>(
                        `/api/deals?q=${enc}&limit=5`,
                        { silent: true }
                    ).catch(() => ({ data: [] })),
                    apiFetch<{ data: Record<string, unknown>[] }>(
                        `/api/leads?q=${enc}&limit=5`,
                        { silent: true }
                    ).catch(() => ({ data: [] })),
                ]);

                if (cancelled) return;

                const next: SearchResult[] = [];

                for (const v of vehicles.data ?? []) {
                    const id = String(v.id);
                    next.push({
                        id,
                        kind: "vehicle",
                        title: vehicleLabel(v),
                        subtitle: String(v.vin ?? v.status ?? "Inventory"),
                        href: `/inventory/${v.vin ?? id}`,
                    });
                }
                for (const c of customers.data ?? []) {
                    const id = String(c.id);
                    const name =
                        [c.first_name, c.last_name].filter(Boolean).join(" ") ||
                        String(c.full_name ?? c.email ?? "Customer");
                    next.push({
                        id,
                        kind: "customer",
                        title: name,
                        subtitle: String(c.email ?? c.phone ?? "Customer"),
                        href: `/customers/${id}`,
                    });
                }
                for (const d of deals.data ?? []) {
                    const id = String(d.id);
                    next.push({
                        id,
                        kind: "deal",
                        title: String(d.deal_number ?? d.title ?? `Deal ${id.slice(0, 8)}`),
                        subtitle: String(d.deal_status ?? d.status ?? "Deal"),
                        href: `/deals?id=${id}`,
                    });
                }
                for (const l of leads.data ?? []) {
                    const id = String(l.id);
                    const name =
                        [l.first_name, l.last_name].filter(Boolean).join(" ") ||
                        String(l.name ?? l.email ?? "Lead");
                    next.push({
                        id,
                        kind: "lead",
                        title: name,
                        subtitle: String(l.status ?? l.source ?? "Lead"),
                        href: `/leads?id=${id}`,
                    });
                }

                setResults(next);
            } finally {
                if (!cancelled) setLoading(false);
            }
        }, 220);

        return () => {
            cancelled = true;
            window.clearTimeout(timer);
        };
    }, [open, query]);

    const select = useCallback(
        (item: SearchResult) => {
            close();
            router.push(item.href);
        },
        [close, router]
    );

    if (!open) return null;

    const order: ResultKind[] = ["vehicle", "customer", "deal", "lead"];
    const grouped = order
        .map((kind) => ({
            kind,
            items: results.filter((r) => r.kind === kind),
        }))
        .filter((g) => g.items.length > 0);

    return (
        <div className="fixed inset-0 z-[80]" role="dialog" aria-modal="true" aria-label="Command palette">
            <button
                type="button"
                className="absolute inset-0 bg-foreground/40 animate-fade-in"
                onClick={close}
                aria-label="Close command palette"
            />
            <div className="absolute left-1/2 top-[12vh] w-[min(560px,calc(100vw-2rem))] -translate-x-1/2 animate-fade-in-down overflow-hidden rounded-xl border border-border bg-card shadow-xl">
                <Command shouldFilter={false} loop>
                    <div className="relative">
                        <CommandInput
                            value={query}
                            onValueChange={setQuery}
                            placeholder="Search vehicles, customers, deals, leads…"
                        />
                        {loading ? (
                            <Loader2 className="pointer-events-none absolute right-3 top-3.5 h-4 w-4 animate-spin text-muted-foreground" />
                        ) : (
                            <kbd className="pointer-events-none absolute right-3 top-3.5 hidden rounded border border-border bg-muted px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground sm:inline">
                                ESC
                            </kbd>
                        )}
                    </div>
                    <CommandList>
                        <CommandGroup heading="Flash AI">
                            <CommandItem
                                value="ask-flash-ai"
                                onSelect={() => askFlash()}
                            >
                                <Sparkles className="h-4 w-4 shrink-0 text-primary" />
                                <span className="min-w-0 flex-1">
                                    <span className="block truncate text-sm font-medium">
                                        Ask Flash AI
                                    </span>
                                    <span className="block truncate text-xs text-muted-foreground">
                                        Desk copilot · drafts never auto-send
                                    </span>
                                </span>
                            </CommandItem>
                        </CommandGroup>
                        <CommandSeparator />
                        {query.trim().length < 2 ? (
                            <p className="px-3 py-6 text-center text-sm text-muted-foreground">
                                Type at least 2 characters to search records.
                            </p>
                        ) : null}
                        {query.trim().length >= 2 && !loading ? (
                            <CommandEmpty>No results for “{query.trim()}”.</CommandEmpty>
                        ) : null}
                        {grouped.map((group) => {
                            const Meta = KIND_META[group.kind];
                            const Icon = Meta.icon;
                            return (
                                <CommandGroup key={group.kind} heading={Meta.label}>
                                    {group.items.map((item) => (
                                        <CommandItem
                                            key={`${item.kind}-${item.id}`}
                                            value={`${item.kind}-${item.id}-${item.title}`}
                                            onSelect={() => select(item)}
                                        >
                                            <Icon className="h-4 w-4 shrink-0 text-muted-foreground" />
                                            <span className="min-w-0 flex-1">
                                                <span className="block truncate text-sm font-medium">
                                                    {item.title}
                                                </span>
                                                <span className="block truncate text-xs text-muted-foreground">
                                                    {item.subtitle}
                                                </span>
                                            </span>
                                        </CommandItem>
                                    ))}
                                </CommandGroup>
                            );
                        })}
                    </CommandList>
                </Command>
            </div>
        </div>
    );
}
