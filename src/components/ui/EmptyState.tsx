"use client";

// src/components/ui/EmptyState.tsx
// F-09 of v3 master plan. Five flavors of empty state per industry
// guidance: first-use, no-results, error, permission, cleared.

import Link from "next/link";
import {
    Inbox,
    SearchX,
    AlertCircle,
    Lock,
    ArchiveX,
    type LucideIcon,
} from "lucide-react";
import { Button } from "./Button";
import { cn } from "@/src/lib/utils";

type EmptyKind = "first-use" | "no-results" | "error" | "permission" | "cleared";

const DEFAULTS: Record<EmptyKind, { icon: LucideIcon; title: string; description: string }> = {
    "first-use": {
        icon: Inbox,
        title: "Nothing here yet",
        description: "Get started by adding your first item.",
    },
    "no-results": {
        icon: SearchX,
        title: "No matches",
        description: "Try adjusting your filters or search terms.",
    },
    error: {
        icon: AlertCircle,
        title: "Something went wrong",
        description: "We couldn't load this. Please try again.",
    },
    permission: {
        icon: Lock,
        title: "You don't have access",
        description: "Ask your administrator for the right permissions.",
    },
    cleared: {
        icon: ArchiveX,
        title: "All clear",
        description: "Nothing matches the current view.",
    },
};

export interface EmptyStateAction {
    label: string;
    href?: string;
    onClick?: () => void;
    /** Optional icon for the action button. */
    icon?: LucideIcon;
    /** Visual variant of the action button (defaults to "primary"). */
    variant?: "primary" | "premium" | "outline" | "secondary" | "ghost" | "destructive";
}

export interface EmptyStateProps {
    kind?: EmptyKind;
    icon?: LucideIcon;
    title?: string;
    description?: string;
    action?: EmptyStateAction;
    secondaryAction?: EmptyStateAction;
    className?: string;
}

export function EmptyState({
    kind = "first-use",
    icon: IconOverride,
    title,
    description,
    action,
    secondaryAction,
    className = "",
}: EmptyStateProps) {
    const defaults = DEFAULTS[kind];
    const Icon = IconOverride ?? defaults.icon;
    const t = title ?? defaults.title;
    const d = description ?? defaults.description;
    const ActionIcon = action?.icon;
    const SecondaryIcon = secondaryAction?.icon;

    return (
        <div
            className={cn(
                "flex flex-col items-center justify-center rounded-2xl border border-dashed border-border bg-muted/30 px-6 py-16 text-center animate-fade-in",
                className
            )}
        >
            <div className="mb-4 inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-primary-50 to-violet-50 text-primary dark:from-primary-50 dark:to-violet-50">
                <Icon className="h-7 w-7" />
            </div>
            <h3 className="text-h3 text-foreground">{t}</h3>
            {d && <p className="mt-1.5 max-w-sm text-sm text-muted-foreground">{d}</p>}
            {(action || secondaryAction) && (
                <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
                    {action && (
                        action.href ? (
                            <Button asChild variant={action.variant}>
                                <Link href={action.href}>
                                    {ActionIcon && <ActionIcon className="h-4 w-4 mr-2" />}
                                    {action.label}
                                </Link>
                            </Button>
                        ) : (
                            <Button onClick={action.onClick} variant={action.variant}>
                                {ActionIcon && <ActionIcon className="h-4 w-4 mr-2" />}
                                {action.label}
                            </Button>
                        )
                    )}
                    {secondaryAction && (
                        secondaryAction.href ? (
                            <Button variant={secondaryAction.variant ?? "outline"} asChild>
                                <Link href={secondaryAction.href}>
                                    {SecondaryIcon && <SecondaryIcon className="h-4 w-4 mr-2" />}
                                    {secondaryAction.label}
                                </Link>
                            </Button>
                        ) : (
                            <Button
                                variant={secondaryAction.variant ?? "outline"}
                                onClick={secondaryAction.onClick}
                            >
                                {SecondaryIcon && <SecondaryIcon className="h-4 w-4 mr-2" />}
                                {secondaryAction.label}
                            </Button>
                        )
                    )}
                </div>
            )}
        </div>
    );
}
