"use client";

// Decision-first inline metrics — preferred over equal StatCard grids on list pages.

import type { ReactNode } from "react";
import { cn, formatCompact, formatCurrency } from "@/src/lib/utils";

export interface MetricStripItem {
    label: string;
    value: number | string;
    /** Optional delta vs previous period (percent). */
    delta?: number;
    hint?: string;
    format?: "number" | "currency" | "compact" | "raw";
    /** Soft semantic tint for the value (status meaning only). */
    tone?: "default" | "hot" | "warm" | "cold" | "success" | "warning" | "destructive";
    /** Optional click handler (e.g. Aging KPI → filtered inventory). */
    onClick?: () => void;
}

export interface MetricStripProps {
    items: MetricStripItem[];
    loading?: boolean;
    className?: string;
    /** Optional trailing slot (e.g. period selector). */
    trailing?: ReactNode;
}

function formatValue(
    value: number | string,
    format: MetricStripItem["format"] = "number"
): string {
    if (value == null || value === "") return "—";
    if (format === "raw") return String(value);
    if (typeof value !== "number") return String(value);
    if (format === "currency") return formatCurrency(value);
    if (format === "compact") return formatCompact(value);
    return new Intl.NumberFormat("en-US").format(value);
}

const TONE_VALUE: Record<NonNullable<MetricStripItem["tone"]>, string> = {
    default: "text-foreground",
    hot: "text-destructive",
    warm: "text-warning",
    cold: "text-muted-foreground",
    success: "text-success",
    warning: "text-warning",
    destructive: "text-destructive",
};

export function MetricStrip({ items, loading = false, className, trailing }: MetricStripProps) {
    return (
        <div
            className={cn(
                "flex flex-wrap items-stretch gap-0 overflow-x-auto rounded-lg border border-border bg-card",
                className
            )}
            role="group"
            aria-label="Key metrics"
        >
            {items.map((item, index) => {
                const tone = item.tone ?? "default";
                const clickable = Boolean(item.onClick) && !loading;
                const inner = (
                    <>
                        <p className="text-[11px] font-medium uppercase tracking-[0.06em] text-muted-foreground">
                            {item.label}
                        </p>
                        {loading ? (
                            <div className="h-6 w-14 animate-shimmer rounded bg-muted" />
                        ) : (
                            <p
                                className={cn(
                                    "text-lg font-semibold tabular-nums tracking-tight",
                                    TONE_VALUE[tone]
                                )}
                            >
                                {formatValue(item.value, item.format)}
                            </p>
                        )}
                        {!loading && item.hint ? (
                            <p className="text-[11px] text-muted-foreground">{item.hint}</p>
                        ) : null}
                        {!loading && typeof item.delta === "number" ? (
                            <p
                                className={cn(
                                    "text-[11px] font-medium tabular-nums",
                                    item.delta >= 0 ? "text-success" : "text-destructive"
                                )}
                            >
                                {item.delta >= 0 ? "+" : ""}
                                {item.delta.toFixed(1)}%
                            </p>
                        ) : null}
                    </>
                );
                return clickable ? (
                    <button
                        key={`${item.label}-${index}`}
                        type="button"
                        onClick={item.onClick}
                        className={cn(
                            "flex min-w-[7.5rem] flex-1 flex-col justify-center gap-1 px-4 py-3.5 text-left transition-colors hover:bg-muted/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring",
                            index > 0 && "border-l border-border"
                        )}
                    >
                        {inner}
                    </button>
                ) : (
                    <div
                        key={`${item.label}-${index}`}
                        className={cn(
                            "flex min-w-[7.5rem] flex-1 flex-col justify-center gap-1 px-4 py-3.5",
                            index > 0 && "border-l border-border"
                        )}
                    >
                        {inner}
                    </div>
                );
            })}
            {trailing ? (
                <div className="ml-auto flex items-center border-l border-border px-4 py-3">
                    {trailing}
                </div>
            ) : null}
        </div>
    );
}
