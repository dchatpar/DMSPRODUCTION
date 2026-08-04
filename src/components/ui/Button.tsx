"use client";

// Brand Blue shadcn-aligned variants with full microstates.

import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from "react";
import { Loader2 } from "lucide-react";

type ButtonVariant =
    | "default"
    | "primary"
    | "secondary"
    | "outline"
    | "ghost"
    | "destructive"
    | "link"
    | "premium";
type ButtonSize = "sm" | "md" | "lg" | "icon";

const VARIANT_CLASSES: Record<ButtonVariant, string> = {
    default:
        "bg-primary text-primary-foreground hover:bg-primary-600 active:bg-primary-700 shadow-none",
    primary:
        "bg-primary text-primary-foreground hover:bg-primary-600 active:bg-primary-700 shadow-none",
    secondary:
        "bg-secondary text-secondary-foreground hover:bg-muted active:bg-muted/80 border border-border",
    outline:
        "border border-border bg-card text-foreground hover:bg-muted active:bg-muted/80",
    ghost:
        "bg-transparent text-foreground hover:bg-muted active:bg-muted/80",
    destructive:
        "bg-destructive text-destructive-foreground hover:bg-destructive/90 active:bg-destructive/80 shadow-none",
    link:
        "bg-transparent text-primary underline-offset-4 hover:underline active:opacity-80 px-0",
    premium:
        "bg-primary text-primary-foreground hover:bg-primary-600 active:bg-primary-700 shadow-none",
};

const SIZE_CLASSES: Record<ButtonSize, string> = {
    sm: "min-h-8 h-8 px-3 text-[13px] gap-1.5 rounded-md",
    md: "min-h-9 h-9 px-3.5 text-sm gap-2 rounded-md",
    lg: "min-h-10 h-10 px-5 text-sm gap-2 rounded-md",
    icon: "min-h-9 min-w-9 h-9 w-9 p-0 rounded-md",
};

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
    variant?: ButtonVariant;
    size?: ButtonSize;
    loading?: boolean;
    leftIcon?: ReactNode;
    rightIcon?: ReactNode;
    asChild?: boolean;
}

const cn = (...classes: (string | false | null | undefined)[]) =>
    classes.filter(Boolean).join(" ");

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
    {
        className = "",
        variant = "default",
        size = "md",
        loading = false,
        disabled,
        leftIcon,
        rightIcon,
        children,
        type = "button",
        ...rest
    },
    ref
) {
    return (
        <button
            ref={ref}
            type={type}
            disabled={disabled || loading}
            aria-busy={loading || undefined}
            className={cn(
                "inline-flex items-center justify-center font-medium transition-colors",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
                "disabled:pointer-events-none disabled:opacity-50",
                VARIANT_CLASSES[variant],
                SIZE_CLASSES[size],
                className
            )}
            {...rest}
        >
            {loading ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : leftIcon}
            {children}
            {!loading && rightIcon}
        </button>
    );
});
