"use client";

import { Sparkles } from "lucide-react";
import { cn } from "@/src/lib/utils";

/** Amber honesty banner when MiniMax key is missing. */
export function AiNotConfiguredBanner({
    className,
    compact,
}: {
    className?: string;
    compact?: boolean;
}) {
    return (
        <div
            role="status"
            className={cn(
                "rounded-md border border-amber-200 bg-amber-50 text-amber-950",
                compact ? "px-2.5 py-2 text-xs" : "px-3 py-2.5 text-sm",
                className
            )}
        >
            <p className="flex items-start gap-2 font-medium">
                <Sparkles className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-700" />
                <span>
                    Flash AI not configured — add{" "}
                    <code className="rounded bg-amber-100/80 px-1">MINIMAX_API_KEY</code>{" "}
                    via wrangler. No fake success.
                </span>
            </p>
        </div>
    );
}
