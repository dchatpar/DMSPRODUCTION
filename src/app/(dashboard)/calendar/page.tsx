"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
    CalendarDays,
    Loader2,
    AlertCircle,
    Car,
    TestTube,
    Clock,
    Phone,
    Truck,
    FileText,
    UserCheck,
} from "lucide-react";
import { apiFetch } from "@/src/lib/fetch";
import { PageHeader } from "@/src/components/ui/PageHeader";
import { cn } from "@/src/lib/utils";

type EventType = "test_drive" | "follow_up" | "delivery" | "invoice" | "appointment";

interface CalendarEvent {
    id: string;
    type: EventType;
    title: string;
    subtitle?: string;
    date: Date;
    status?: string | null;
    href: string;
}

const TYPE_META: Record<
    EventType,
    { label: string; color: string; bar: string; icon: typeof Car }
> = {
    test_drive: {
        label: "Test drive",
        color: "bg-blue-50 text-blue-700 border-blue-200",
        bar: "bg-blue-500",
        icon: TestTube,
    },
    follow_up: {
        label: "Follow-up",
        color: "bg-amber-50 text-amber-800 border-amber-200",
        bar: "bg-amber-500",
        icon: Phone,
    },
    delivery: {
        label: "Delivery",
        color: "bg-emerald-50 text-emerald-800 border-emerald-200",
        bar: "bg-emerald-500",
        icon: Truck,
    },
    invoice: {
        label: "Invoice due",
        color: "bg-rose-50 text-rose-800 border-rose-200",
        bar: "bg-rose-500",
        icon: FileText,
    },
    appointment: {
        label: "Appointment",
        color: "bg-violet-50 text-violet-800 border-violet-200",
        bar: "bg-violet-500",
        icon: UserCheck,
    },
};

function parseDate(...candidates: Array<string | null | undefined>): Date | null {
    for (const raw of candidates) {
        if (!raw) continue;
        const d = new Date(raw);
        if (!Number.isNaN(d.getTime())) return d;
    }
    return null;
}

export default function CalendarPage() {
    const [events, setEvents] = useState<CalendarEvent[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [filter, setFilter] = useState<EventType | "all">("all");

    useEffect(() => {
        let cancelled = false;
        (async () => {
            setLoading(true);
            setError(null);
            try {
                const [td, fu, deals, invoices] = await Promise.all([
                    apiFetch<{ data: any[] }>("/api/test-drives?limit=80", { silent: true }).catch(() => ({ data: [] })),
                    apiFetch<{ data: any[] }>("/api/follow-ups?limit=80", { silent: true }).catch(() => ({ data: [] })),
                    apiFetch<{ data: any[] }>("/api/deals?limit=80", { silent: true }).catch(() => ({ data: [] })),
                    apiFetch<{ data: any[] }>("/api/invoices?limit=80&status=Pending", { silent: true }).catch(() => ({ data: [] })),
                ]);
                if (cancelled) return;

                const next: CalendarEvent[] = [];

                for (const row of td?.data ?? []) {
                    const date = parseDate(row.scheduled_at, row.scheduled_date, row.start_time);
                    if (!date) continue;
                    next.push({
                        id: `td-${row.id}`,
                        type: "test_drive",
                        title: row.customer?.name || row.lead?.customer?.name || "Test drive",
                        subtitle: row.vehicle
                            ? `${row.vehicle.year ?? ""} ${row.vehicle.make ?? ""} ${row.vehicle.model ?? ""}`.trim()
                            : undefined,
                        date,
                        status: row.status,
                        href: "/test-drives",
                    });
                }

                for (const row of fu?.data ?? []) {
                    const date = parseDate(row.follow_up_date, row.due_date);
                    if (!date) continue;
                    next.push({
                        id: `fu-${row.id}`,
                        type: "follow_up",
                        title: row.customer?.name || row.subject || "Follow-up",
                        subtitle: row.notes || row.type || undefined,
                        date,
                        status: row.status,
                        href: "/follow-ups",
                    });
                }

                for (const row of deals?.data ?? []) {
                    const status = (row.deal_status || "").toLowerCase();
                    if (!["paid off", "finance", "down payment"].includes(status)) continue;
                    const date = parseDate(row.deal_date, row.created_at);
                    if (!date) continue;
                    next.push({
                        id: `dl-${row.id}`,
                        type: "delivery",
                        title: row.customer?.name || "Deal delivery",
                        subtitle: row.vehicle
                            ? `${row.vehicle.year ?? ""} ${row.vehicle.make ?? ""} ${row.vehicle.model ?? ""}`.trim()
                            : formatDealStatus(row.deal_status),
                        date,
                        status: row.deal_status,
                        href: "/deals",
                    });
                }

                for (const row of invoices?.data ?? []) {
                    const date = parseDate(row.due_date, row.invoice_date, row.created_at);
                    if (!date) continue;
                    next.push({
                        id: `inv-${row.id}`,
                        type: "invoice",
                        title: row.customer?.name || row.invoice_number || "Invoice due",
                        subtitle: row.total != null ? `$${Number(row.total).toLocaleString()}` : row.status,
                        date,
                        status: row.status,
                        href: "/invoices",
                    });
                }

                next.sort((a, b) => a.date.getTime() - b.date.getTime());
                setEvents(next);
            } catch (err) {
                if (!cancelled) {
                    setError(err instanceof Error ? err.message : "Failed to load calendar");
                }
            } finally {
                if (!cancelled) setLoading(false);
            }
        })();
        return () => {
            cancelled = true;
        };
    }, []);

    const filtered = useMemo(
        () => (filter === "all" ? events : events.filter((e) => e.type === filter)),
        [events, filter]
    );

    const counts = useMemo(() => {
        const c: Record<string, number> = { all: events.length };
        for (const e of events) c[e.type] = (c[e.type] || 0) + 1;
        return c;
    }, [events]);

    return (
        <div className="space-y-6 p-4 sm:p-6">
            <PageHeader
                title="Calendar"
                description="Test drives, follow-ups, deliveries, and invoice due dates"
                icon={CalendarDays}
                actions={
                    <Link
                        href="/test-drives"
                        className="inline-flex items-center gap-2 rounded-lg border border-border bg-card px-3 py-2 text-sm font-medium hover:bg-muted"
                    >
                        <TestTube className="h-4 w-4" />
                        Test Drives
                    </Link>
                }
            />

            <div className="flex flex-wrap gap-2">
                <FilterChip
                    active={filter === "all"}
                    label={`All (${counts.all || 0})`}
                    onClick={() => setFilter("all")}
                />
                {(Object.keys(TYPE_META) as EventType[]).map((t) => (
                    <FilterChip
                        key={t}
                        active={filter === t}
                        label={`${TYPE_META[t].label} (${counts[t] || 0})`}
                        className={TYPE_META[t].color}
                        onClick={() => setFilter(t)}
                    />
                ))}
            </div>

            {loading ? (
                <div className="flex items-center justify-center py-16 text-muted-foreground">
                    <Loader2 className="h-6 w-6 animate-spin" />
                </div>
            ) : error ? (
                <div className="flex items-center gap-2 rounded-xl border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">
                    <AlertCircle className="h-4 w-4 shrink-0" />
                    {error}
                </div>
            ) : filtered.length === 0 ? (
                <div className="rounded-2xl border border-border bg-card p-10 text-center">
                    <Clock className="mx-auto mb-3 h-8 w-8 text-muted-foreground" />
                    <p className="text-sm font-medium text-foreground">No scheduled events</p>
                    <p className="mt-1 text-sm text-muted-foreground">
                        Test drives, follow-ups, and due invoices will appear here.
                    </p>
                </div>
            ) : (
                <ul className="space-y-3">
                    {filtered.map((ev) => {
                        const meta = TYPE_META[ev.type];
                        const Icon = meta.icon;
                        return (
                            <li key={ev.id}>
                                <Link
                                    href={ev.href}
                                    className="flex flex-wrap items-start gap-4 rounded-xl border border-border bg-card p-4 transition-colors hover:border-primary/30 hover:bg-muted/30"
                                >
                                    <div className={cn("w-1 self-stretch rounded-full", meta.bar)} />
                                    <div className="min-w-[7rem] rounded-lg bg-muted/60 px-3 py-2 text-center">
                                        <p className="text-xs font-medium uppercase text-muted-foreground">
                                            {ev.date.toLocaleDateString("en-CA", { month: "short" })}
                                        </p>
                                        <p className="text-2xl font-bold text-foreground">{ev.date.getDate()}</p>
                                        <p className="text-xs text-muted-foreground">
                                            {ev.date.toLocaleTimeString("en-CA", {
                                                hour: "numeric",
                                                minute: "2-digit",
                                            })}
                                        </p>
                                    </div>
                                    <div className="min-w-0 flex-1">
                                        <div className="flex flex-wrap items-center gap-2">
                                            <span
                                                className={cn(
                                                    "inline-flex items-center gap-1 rounded-md border px-2 py-0.5 text-[11px] font-semibold",
                                                    meta.color
                                                )}
                                            >
                                                <Icon className="h-3 w-3" />
                                                {meta.label}
                                            </span>
                                            {ev.status && (
                                                <span className="rounded-full bg-muted px-2 py-0.5 text-xs font-medium">
                                                    {ev.status}
                                                </span>
                                            )}
                                        </div>
                                        <p className="mt-1.5 font-medium text-foreground">{ev.title}</p>
                                        {ev.subtitle && (
                                            <p className="mt-0.5 flex items-center gap-1.5 text-sm text-muted-foreground">
                                                <Car className="h-3.5 w-3.5 shrink-0" />
                                                {ev.subtitle}
                                            </p>
                                        )}
                                    </div>
                                </Link>
                            </li>
                        );
                    })}
                </ul>
            )}
        </div>
    );
}

function FilterChip({
    active,
    label,
    onClick,
    className,
}: {
    active: boolean;
    label: string;
    onClick: () => void;
    className?: string;
}) {
    return (
        <button
            type="button"
            onClick={onClick}
            className={cn(
                "rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors",
                active
                    ? "border-primary bg-primary text-white"
                    : className || "border-border bg-card text-muted-foreground hover:bg-muted"
            )}
        >
            {label}
        </button>
    );
}

function formatDealStatus(status: string | null | undefined): string {
    return status || "Deal";
}
