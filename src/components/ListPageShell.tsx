"use client";

// Shared list page composition: padding → PageHeader → MetricStrip → toolbar → body.
// Prefer MetricStrip for KPIs (decision-first); avoid equal StatCard grids.

import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";
import { PageHeader, type BreadcrumbItem } from "@/src/components/ui/PageHeader";
import { cn } from "@/src/lib/utils";

export interface ListPageShellProps {
    title: string;
    description?: string;
    icon?: LucideIcon;
    breadcrumbs?: BreadcrumbItem[];
    /** Header action buttons (refresh, export, primary CTA, view toggle, etc.). */
    actions?: ReactNode;
    /** Optional meta row under the title (counts, filters applied). */
    meta?: ReactNode;
    /** KPI strip — prefer MetricStrip over equal StatCard grids. */
    kpis?: ReactNode;
    /** Sticky filter / search toolbar. */
    toolbar?: ReactNode;
    /** Main content: table, kanban, or EmptyState. */
    children: ReactNode;
    className?: string;
}

export function ListPageShell({
    title,
    description,
    icon,
    breadcrumbs,
    actions,
    meta,
    kpis,
    toolbar,
    children,
    className,
}: ListPageShellProps) {
    return (
        <div className={cn("animate-fade-in space-y-5 px-4 py-5 sm:px-6", className)}>
            <PageHeader
                title={title}
                description={description}
                icon={icon}
                breadcrumbs={breadcrumbs}
                actions={actions}
                meta={meta}
            />
            {kpis ? <div className="min-w-0">{kpis}</div> : null}
            {toolbar}
            {children}
        </div>
    );
}
