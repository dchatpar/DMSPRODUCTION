"use client";

// src/components/ui/ModalShell.tsx
// F-09 of v3 master plan. Standardized modal shell — replaces the
// 14 hand-rolled modal patterns across the app. Includes:
// - Backdrop click to close
// - Escape to close
// - Focus trap (basic, but covers Tab cycling)
// - Top-of-modal error banner
// - Title + description + footer slot
// - Body scroll lock
// - Animation

import { useEffect, useRef, type ReactNode } from "react";
import { X } from "lucide-react";
import { Button } from "./Button";
import { cn } from "@/src/lib/utils";
import { useOverlayDismiss } from "@/src/hooks/useOverlayDismiss";

export interface ModalShellProps {
    open: boolean;
    onClose: () => void;
    title: string;
    description?: string;
    children: ReactNode;
    /** Footer slot (typically a save button on the right). */
    footer?: ReactNode;
    /** Optional error to display at the top. */
    error?: string | null;
    /** Max width preset. */
    size?: "sm" | "md" | "lg" | "xl" | "2xl" | "3xl" | "4xl";
    /** When true, clicking the backdrop does NOT close. */
    persistent?: boolean;
    /** Hide the default close X button (useful for fullscreen modals). */
    hideCloseButton?: boolean;
    /** Optional icon to show next to the title. */
    titleIcon?: ReactNode;
    /** Optional badge or extra content next to the title. */
    titleExtra?: ReactNode;
}

const SIZE_CLASSES = {
    sm: "max-w-sm",
    md: "max-w-md",
    lg: "max-w-lg",
    xl: "max-w-xl",
    "2xl": "max-w-2xl",
    "3xl": "max-w-3xl",
    "4xl": "max-w-4xl",
};

export function ModalShell({
    open,
    onClose,
    title,
    description,
    children,
    footer,
    error,
    size = "lg",
    persistent = false,
    hideCloseButton = false,
    titleIcon,
    titleExtra,
}: ModalShellProps) {
    const dialogRef = useRef<HTMLDivElement | null>(null);
    const lastFocusRef = useRef<HTMLElement | null>(null);

    useOverlayDismiss(onClose, { open, persistent });

    // Body scroll lock + focus management
    useEffect(() => {
        if (!open) return;
        lastFocusRef.current = document.activeElement as HTMLElement | null;
        const previousOverflow = document.body.style.overflow;
        document.body.style.overflow = "hidden";

        // Initial focus on the dialog
        const t = setTimeout(() => {
            const focusable = dialogRef.current?.querySelector<HTMLElement>(
                'input, select, textarea, button:not([data-modal-close]), [href], [tabindex]:not([tabindex="-1"])'
            );
            focusable?.focus();
        }, 50);

        return () => {
            clearTimeout(t);
            document.body.style.overflow = previousOverflow;
            lastFocusRef.current?.focus?.();
        };
    }, [open]);

    // Focus trap (Escape handled by useOverlayDismiss)
    useEffect(() => {
        if (!open) return;
        const onKey = (e: KeyboardEvent) => {
            if (e.key !== "Tab" || !dialogRef.current) return;
            const focusables = dialogRef.current.querySelectorAll<HTMLElement>(
                'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
            );
            if (focusables.length === 0) return;
            const first = focusables[0];
            const last = focusables[focusables.length - 1];
            if (e.shiftKey && document.activeElement === first) {
                e.preventDefault();
                last.focus();
            } else if (!e.shiftKey && document.activeElement === last) {
                e.preventDefault();
                first.focus();
            }
        };
        document.addEventListener("keydown", onKey);
        return () => document.removeEventListener("keydown", onKey);
    }, [open]);

    if (!open) return null;

    return (
        <div
            className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 md:p-8"
            role="dialog"
            aria-modal="true"
            aria-labelledby="modal-title"
            aria-describedby={description ? "modal-description" : undefined}
        >
            {/* Backdrop */}
            <div
                className="absolute inset-0 animate-fade-in bg-foreground/40 backdrop-blur-sm"
                onClick={() => !persistent && onClose()}
                aria-hidden
            />

            {/* Dialog */}
            <div
                ref={dialogRef}
                className={cn(
                    "relative w-full overflow-hidden rounded-2xl border border-border bg-card text-card-foreground shadow-lg animate-scale-in",
                    "max-h-[calc(100dvh-2rem)] sm:max-h-[calc(100dvh-4rem)] flex flex-col",
                    SIZE_CLASSES[size]
                )}
            >
                {/* Header */}
                <div className="flex items-start gap-3 border-b border-border px-6 py-5">
                    {titleIcon && (
                        <div className="mt-0.5 inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary-50 text-primary">
                            {titleIcon}
                        </div>
                    )}
                    <div className="flex-1 min-w-0">
                        <h2 id="modal-title" className="text-h3 text-foreground">
                            {title}
                        </h2>
                        {description && (
                            <p id="modal-description" className="mt-1 text-sm text-muted-foreground">
                                {description}
                            </p>
                        )}
                    </div>
                    {titleExtra}
                    {!hideCloseButton && (
                        <Button
                            data-modal-close
                            variant="ghost"
                            size="icon"
                            onClick={onClose}
                            aria-label="Close dialog"
                            className="h-10 w-10 shrink-0"
                        >
                            <X className="h-4 w-4" />
                        </Button>
                    )}
                </div>

                {/* Error banner */}
                {error && (
                    <div
                        role="alert"
                        className="border-b border-destructive/20 bg-destructive-50 px-6 py-3.5 text-sm text-destructive"
                    >
                        {error}
                    </div>
                )}

                {/* Body — form fields space-y-4 min via --space-field */}
                <div className="flex-1 space-y-4 overflow-y-auto px-6 py-5">{children}</div>

                {/* Footer */}
                {footer && (
                    <div className="flex min-h-12 items-center justify-end gap-2 border-t border-border bg-muted/30 px-6 py-3.5">
                        {footer}
                    </div>
                )}
            </div>
        </div>
    );
}
