"use client";

// src/components/ui/StatCard.tsx
// F-09 of v3 master plan. KPI tile for dashboards.

import type { LucideIcon } from "lucide-react";
import { ArrowUpRight, ArrowDownRight } from "lucide-react";
import { cn, formatCompact, formatCurrency } from "@/src/lib/utils";

export interface StatCardProps {
    label: string;
    value: number | string;
    /** Optional delta vs previous period. Positive = green, negative = red. */
    delta?: number;
    deltaLabel?: string;
    icon?: LucideIcon;
    iconClassName?: string;
    format?: "number" | "currency" | "compact" | "raw";
    loading?: boolean;
    href?: string;
    className?: string;
}

export function StatCard({
    label,
    value,
    delta,
    deltaLabel,
    icon: Icon,
    iconClassName = "bg-primary-50 text-primary",
    format = "number",
    loading = false,
    href,
    className = "",
}: StatCardProps) {
    const display = (() => {
        if (loading || value == null || value === "") return "—";
        if (format === "raw") return String(value);
        if (typeof value !== "number") return String(value);
        if (format === "currency") return formatCurrency(value);
        if (format === "compact") return formatCompact(value);
        return new Intl.NumberFormat("en-US").format(value);
    })();

    const deltaPositive = typeof delta === "number" && delta >= 0;
    const CardTag = href ? "a" : "div";
    const hrefProps = href ? { href } : {};

    // Prefer MetricStrip on list pages. StatCard is for dashboard chart tiles only —
    // no decorative hover orbs; hairline border, no shadow fluff.
    return (
        <CardTag
            {...hrefProps}
            className={cn(
                "flex flex-col gap-2 rounded-lg border border-border bg-card p-4 shadow-none",
                href &&
                    "transition-colors hover:bg-muted/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
                className
            )}
        >
            <div className="flex items-start justify-between gap-2">
                <p className="text-caption text-muted-foreground">{label}</p>
                {Icon && (
                    <div
                        className={cn(
                            "inline-flex h-8 w-8 items-center justify-center rounded-md",
                            iconClassName
                        )}
                    >
                        <Icon className="h-4 w-4" />
                    </div>
                )}
            </div>

            <div className="flex items-end gap-2">
                {loading ? (
                    <div className="h-8 w-24 animate-shimmer rounded bg-muted" />
                ) : (
                    <p className="text-h1 text-foreground tabular-nums">{display}</p>
                )}
                {typeof delta === "number" && !loading && (
                    <span
                        className={cn(
                            "mb-1 inline-flex items-center gap-0.5 rounded-md px-1.5 py-0.5 text-xs font-semibold",
                            deltaPositive
                                ? "bg-success-50 text-success"
                                : "bg-destructive-50 text-destructive"
                        )}
                    >
                        {deltaPositive ? (
                            <ArrowUpRight className="h-3 w-3" />
                        ) : (
                            <ArrowDownRight className="h-3 w-3" />
                        )}
                        {Math.abs(delta).toFixed(1)}%
                    </span>
                )}
            </div>

            {deltaLabel && !loading && (
                <p className="text-xs text-muted-foreground">{deltaLabel}</p>
            )}
        </CardTag>
    );
}
