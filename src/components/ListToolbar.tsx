"use client";

// Sticky list toolbar: debounced search, filter selects, optional view toggle,
// export, and primary CTA. Navigation uses Link / router.push — never window.location.

import Link from "next/link";
import { useRouter } from "next/navigation";
import {
    Download,
    LayoutGrid,
    List,
    Loader2,
    Plus,
    Search,
    type LucideIcon,
} from "lucide-react";
import type { ReactNode } from "react";
import { Button } from "@/src/components/ui/Button";
import { cn } from "@/src/lib/utils";

export type ListViewMode = "table" | "kanban";

export interface ListToolbarFilter {
    id: string;
    value: string;
    onChange: (value: string) => void;
    options: Array<{ value: string; label: string }>;
    /** Shown as the empty/all option label. */
    allLabel?: string;
    "aria-label"?: string;
}

export interface ListToolbarProps {
    searchPlaceholder?: string;
    searchValue: string;
    onSearchChange: (value: string) => void;
    filters?: ListToolbarFilter[];
    /** Extra controls (date pickers, more-filters popover, etc.). */
    extraFilters?: ReactNode;
    viewMode?: ListViewMode;
    onViewModeChange?: (mode: ListViewMode) => void;
    onExport?: () => void;
    exportLoading?: boolean;
    exportLabel?: string;
    /** Prefer href for primary CTA; onPrimaryClick wins when both are set. */
    primaryHref?: string;
    primaryLabel?: string;
    primaryIcon?: LucideIcon;
    onPrimaryClick?: () => void;
    showPrimary?: boolean;
    className?: string;
    children?: ReactNode;
}

export function ListToolbar({
    searchPlaceholder = "Search…",
    searchValue,
    onSearchChange,
    filters = [],
    extraFilters,
    viewMode,
    onViewModeChange,
    onExport,
    exportLoading = false,
    exportLabel = "Export",
    primaryHref,
    primaryLabel,
    primaryIcon: PrimaryIcon = Plus,
    onPrimaryClick,
    showPrimary = true,
    className,
    children,
}: ListToolbarProps) {
    const router = useRouter();

    const renderPrimary = () => {
        if (!showPrimary || !primaryLabel) return null;

        const label = (
            <>
                <PrimaryIcon className="h-4 w-4" />
                <span className="hidden sm:inline">{primaryLabel}</span>
            </>
        );

        if (onPrimaryClick) {
            return (
                <Button
                    size="sm"
                    onClick={() => {
                        onPrimaryClick();
                    }}
                >
                    {label}
                </Button>
            );
        }

        if (primaryHref) {
            return (
                <Link
                    href={primaryHref}
                    className="inline-flex h-10 min-h-10 items-center justify-center gap-1.5 rounded-md bg-primary px-3 text-sm font-medium text-primary-foreground shadow-sm transition-colors hover:bg-primary-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                    onClick={(e) => {
                        // Prefer client navigation; Link already does this.
                        e.preventDefault();
                        router.push(primaryHref);
                    }}
                >
                    {label}
                </Link>
            );
        }

        return null;
    };

    return (
        <div
            className={cn(
                "sticky top-0 z-10 rounded-xl border border-border bg-card/95 px-4 py-3.5 shadow-sm backdrop-blur-sm",
                className
            )}
        >
            <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
                <div className="relative min-w-0 flex-1">
                    <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <input
                        type="search"
                        placeholder={searchPlaceholder}
                        value={searchValue}
                        onChange={(e) => onSearchChange(e.target.value)}
                        className="min-h-10 w-full rounded-lg border border-border bg-background py-2 pl-9 pr-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring/40"
                        aria-label={searchPlaceholder}
                    />
                </div>
                <div className="flex flex-wrap items-center gap-2">
                    {filters.map((filter) => (
                        <select
                            key={filter.id}
                            value={filter.value}
                            onChange={(e) => filter.onChange(e.target.value)}
                            aria-label={filter["aria-label"] ?? filter.allLabel ?? filter.id}
                            className="min-h-10 rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring/40"
                        >
                            <option value="">{filter.allLabel ?? "All"}</option>
                            {filter.options.map((opt) => (
                                <option key={opt.value} value={opt.value}>
                                    {opt.label}
                                </option>
                            ))}
                        </select>
                    ))}
                    {extraFilters}
                    {onViewModeChange && viewMode != null && (
                        <div className="flex rounded-lg bg-muted/60 p-1">
                            <button
                                type="button"
                                onClick={() => onViewModeChange("table")}
                                className={cn(
                                    "inline-flex min-h-10 items-center justify-center rounded-md p-2 transition-all",
                                    viewMode === "table"
                                        ? "bg-card text-primary shadow-sm"
                                        : "text-muted-foreground hover:text-foreground"
                                )}
                                title="Table view"
                                aria-label="Table view"
                                aria-pressed={viewMode === "table"}
                            >
                                <List className="h-4 w-4" />
                            </button>
                            <button
                                type="button"
                                onClick={() => onViewModeChange("kanban")}
                                className={cn(
                                    "inline-flex min-h-10 items-center justify-center rounded-md p-2 transition-all",
                                    viewMode === "kanban"
                                        ? "bg-card text-primary shadow-sm"
                                        : "text-muted-foreground hover:text-foreground"
                                )}
                                title="Kanban view"
                                aria-label="Kanban view"
                                aria-pressed={viewMode === "kanban"}
                            >
                                <LayoutGrid className="h-4 w-4" />
                            </button>
                        </div>
                    )}
                    {onExport && (
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={onExport}
                            disabled={exportLoading}
                        >
                            {exportLoading ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                                <Download className="h-4 w-4" />
                            )}
                            <span className="hidden sm:inline">{exportLabel}</span>
                        </Button>
                    )}
                    {renderPrimary()}
                    {children}
                </div>
            </div>
        </div>
    );
}
