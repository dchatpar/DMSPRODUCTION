"use client";

// Sticky top header: breadcrumbs, ⌘K trigger, activity notifications, avatar menu.

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
    Bell,
    ChevronRight,
    LogOut,
    Search,
    Settings,
    Sparkles,
    User,
} from "lucide-react";
import { apiFetch } from "@/src/lib/fetch";
import { toast } from "@/src/lib/toast";
import { Avatar } from "@/src/components/ui/Avatar";
import { BrandLogo } from "@/src/components/BrandLogo";
import { CommandPalette } from "@/src/components/CommandPalette";
import { ThemeToggle } from "@/src/components/ThemeToggle";
import { useFlashAi } from "@/src/components/ai/FlashAiProvider";
import { cn } from "@/src/lib/utils";

interface UserData {
    full_name: string;
    email: string;
    role: string;
    avatar: string | null;
}

type AppNotification = {
    id: string;
    kind: "follow_up" | "task" | "invoice" | "lead";
    title: string;
    body: string;
    href: string;
    at: string | null;
    overdue: boolean;
};

const SEGMENT_LABELS: Record<string, string> = {
    dashboard: "Dashboard",
    leads: "Lead Center",
    "test-drives": "Test Drives",
    deals: "Deals",
    "follow-ups": "Follow-ups",
    quotations: "Quotations",
    "email-sequences": "Email sequences",
    calendar: "Calendar",
    inventory: "Inventory",
    purchases: "Purchase from Public",
    gallery: "Image Library",
    new: "Add Vehicle",
    add: "Add Vehicle",
    edit: "Edit",
    customers: "Customers",
    invoices: "Invoices",
    expenses: "Expenses",
    reports: "Reports",
    social: "Social Posting",
    tasks: "Tasks",
    tickets: "Tickets",
    users: "Users & Roles",
    roles: "Roles & Permissions",
    profile: "Profile",
    settings: "Settings",
    business: "Business",
    integrations: "Integrations",
    subscription: "Subscription",
    billing: "Billing",
    finance: "Finance",
    vendors: "Vendors",
    tools: "Tools",
};

function titleCase(segment: string): string {
    return segment
        .split("-")
        .map((p) => p.charAt(0).toUpperCase() + p.slice(1))
        .join(" ");
}

function buildBreadcrumbs(pathname: string) {
    const parts = pathname.split("/").filter(Boolean);
    if (parts.length === 0) {
        return [{ label: "Dashboard", href: "/dashboard" }];
    }
    const crumbs: { label: string; href?: string }[] = [
        { label: "Home", href: "/dashboard" },
    ];
    let acc = "";
    parts.forEach((part, i) => {
        acc += `/${part}`;
        const isLast = i === parts.length - 1;
        const label = SEGMENT_LABELS[part] ?? titleCase(part);
        crumbs.push(isLast ? { label } : { label, href: acc });
    });
    return crumbs;
}

export function TopHeader() {
    const pathname = usePathname() ?? "";
    const router = useRouter();
    const { openPanel } = useFlashAi();
    const [cmdOpen, setCmdOpen] = useState(false);
    const [notifOpen, setNotifOpen] = useState(false);
    const [menuOpen, setMenuOpen] = useState(false);
    const [user, setUser] = useState<UserData | null>(null);
    const [logoutLoading, setLogoutLoading] = useState(false);
    const [notifications, setNotifications] = useState<AppNotification[]>([]);
    const [notifLoading, setNotifLoading] = useState(false);
    const menuRef = useRef<HTMLDivElement>(null);
    const notifRef = useRef<HTMLDivElement>(null);

    const breadcrumbs = useMemo(() => buildBreadcrumbs(pathname), [pathname]);
    const unreadCount = notifications.length;
    const isMac =
        typeof navigator !== "undefined" &&
        /Mac|iPhone|iPad/.test(navigator.platform);

    useEffect(() => {
        let cancelled = false;
        (async () => {
            try {
                const data = await apiFetch<{ data: UserData }>("/api/me", { silent: true });
                if (!cancelled && data?.data) setUser(data.data);
            } catch {
                /* bridge handles auth */
            }
        })();
        return () => {
            cancelled = true;
        };
    }, []);

    useEffect(() => {
        let cancelled = false;
        (async () => {
            setNotifLoading(true);
            try {
                const res = await apiFetch<{ data: AppNotification[]; unread: number }>(
                    "/api/notifications",
                    { silent: true }
                );
                if (!cancelled) setNotifications(res?.data ?? []);
            } catch {
                if (!cancelled) setNotifications([]);
            } finally {
                if (!cancelled) setNotifLoading(false);
            }
        })();
        return () => {
            cancelled = true;
        };
    }, [pathname]);

    useEffect(() => {
        const onKey = (e: KeyboardEvent) => {
            if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
                e.preventDefault();
                setCmdOpen(true);
            }
        };
        window.addEventListener("keydown", onKey);
        return () => window.removeEventListener("keydown", onKey);
    }, []);

    useEffect(() => {
        const onDoc = (e: MouseEvent) => {
            const t = e.target as Node;
            if (menuRef.current && !menuRef.current.contains(t)) setMenuOpen(false);
            if (notifRef.current && !notifRef.current.contains(t)) setNotifOpen(false);
        };
        document.addEventListener("mousedown", onDoc);
        return () => document.removeEventListener("mousedown", onDoc);
    }, []);

    async function handleLogout() {
        if (logoutLoading) return;
        setLogoutLoading(true);
        try {
            await apiFetch("/api/auth/logout", { method: "POST" });
            toast.success("Signed out", "You have been logged out.");
            router.push("/login");
            router.refresh();
        } catch (err) {
            toast.error(
                "Could not sign out",
                err instanceof Error ? err.message : "Please try again."
            );
            setLogoutLoading(false);
        }
    }

    return (
        <>
            <header className="sticky top-0 z-30 hidden h-16 shrink-0 items-center gap-3 border-b border-border bg-card px-4 lg:flex">
                <div className="shrink-0 pr-2">
                    <BrandLogo variant="lockup" size="sm" href="/dashboard" />
                </div>
                <nav aria-label="Breadcrumb" className="min-w-0 flex-1">
                    <ol className="flex items-center gap-1 text-sm text-muted-foreground">
                        {breadcrumbs.map((c, i) => (
                            <li key={`${c.label}-${i}`} className="flex min-w-0 items-center gap-1">
                                {i > 0 && <ChevronRight className="h-3.5 w-3.5 shrink-0 opacity-50" />}
                                {c.href ? (
                                    <Link href={c.href} className="truncate hover:text-foreground">
                                        {c.label}
                                    </Link>
                                ) : (
                                    <span className="truncate font-medium text-foreground">{c.label}</span>
                                )}
                            </li>
                        ))}
                    </ol>
                </nav>

                <button
                    type="button"
                    onClick={() => setCmdOpen(true)}
                    className="inline-flex h-9 w-64 max-w-[40vw] items-center gap-2 rounded-lg border border-border bg-muted/40 px-3 text-sm text-muted-foreground hover:bg-muted"
                >
                    <Search className="h-4 w-4 shrink-0" />
                    <span className="flex-1 truncate text-left">Search…</span>
                    <kbd className="rounded border border-border bg-card px-1.5 py-0.5 text-[10px] font-medium">
                        {isMac ? "⌘K" : "Ctrl+K"}
                    </kbd>
                </button>

                <button
                    type="button"
                    onClick={() => openPanel()}
                    className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-primary/20 bg-primary/5 px-2.5 text-sm font-medium text-primary hover:bg-primary/10"
                    aria-label="Ask Flash AI"
                >
                    <Sparkles className="h-4 w-4" />
                    <span className="hidden sm:inline">Ask Flash AI</span>
                </button>

                <div className="relative" ref={notifRef}>
                    <button
                        type="button"
                        onClick={() => {
                            setNotifOpen((v) => !v);
                            setMenuOpen(false);
                        }}
                        className="relative inline-flex h-9 w-9 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground"
                        aria-label={
                            unreadCount > 0
                                ? `Notifications, ${unreadCount} due`
                                : "Notifications"
                        }
                        aria-expanded={notifOpen}
                    >
                        <Bell className="h-4.5 w-4.5 h-[18px] w-[18px]" />
                        {unreadCount > 0 && (
                            <span
                                className="absolute right-1.5 top-1.5 h-1.5 w-1.5 rounded-full bg-primary"
                                aria-hidden
                            />
                        )}
                    </button>
                    {notifOpen && (
                        <div className="absolute right-0 top-full z-40 mt-1.5 w-80 overflow-hidden rounded-xl border border-border bg-card shadow-lg animate-fade-in-down">
                            <div className="border-b border-border px-3 py-2.5">
                                <p className="text-sm font-semibold text-foreground">Notifications</p>
                                <p className="text-xs text-muted-foreground">
                                    Due follow-ups, tasks, and overdue invoices
                                </p>
                            </div>
                            {notifLoading ? (
                                <div className="px-3 py-8 text-center text-sm text-muted-foreground">
                                    Loading…
                                </div>
                            ) : notifications.length === 0 ? (
                                <div className="px-3 py-8 text-center">
                                    <Bell className="mx-auto mb-2 h-5 w-5 text-muted-foreground" />
                                    <p className="text-sm text-muted-foreground">
                                        No due items right now
                                    </p>
                                </div>
                            ) : (
                                <ul className="max-h-80 overflow-y-auto py-1">
                                    {notifications.map((n) => (
                                        <li key={n.id}>
                                            <Link
                                                href={n.href}
                                                onClick={() => setNotifOpen(false)}
                                                className="block px-3 py-2.5 hover:bg-muted"
                                            >
                                                <p className="text-sm font-medium text-foreground">
                                                    {n.title}
                                                </p>
                                                <p className="truncate text-xs text-muted-foreground">
                                                    {n.body}
                                                </p>
                                            </Link>
                                        </li>
                                    ))}
                                </ul>
                            )}
                        </div>
                    )}
                </div>

                <ThemeToggle />

                <div className="relative" ref={menuRef}>
                    <button
                        type="button"
                        onClick={() => {
                            setMenuOpen((v) => !v);
                            setNotifOpen(false);
                        }}
                        className={cn(
                            "inline-flex items-center gap-2 rounded-lg p-1 pr-2 transition-colors hover:bg-muted",
                            menuOpen && "bg-muted"
                        )}
                        aria-label="Account menu"
                        aria-expanded={menuOpen}
                    >
                        <Avatar
                            src={user?.avatar}
                            name={user?.full_name}
                            email={user?.email}
                            size="sm"
                        />
                        <span className="hidden max-w-[120px] truncate text-sm font-medium text-foreground xl:inline">
                            {user?.full_name || user?.email || "Account"}
                        </span>
                    </button>
                    {menuOpen && (
                        <div className="absolute right-0 top-full z-40 mt-1.5 w-56 overflow-hidden rounded-xl border border-border bg-card shadow-lg animate-fade-in-down">
                            <div className="border-b border-border px-3 py-2.5">
                                <p className="truncate text-sm font-semibold text-foreground">
                                    {user?.full_name || "Account"}
                                </p>
                                <p className="truncate text-xs text-muted-foreground">
                                    {user?.email}
                                </p>
                            </div>
                            <ul className="p-1">
                                <li>
                                    <Link
                                        href="/profile"
                                        onClick={() => setMenuOpen(false)}
                                        className="flex items-center gap-2 rounded-lg px-2.5 py-2 text-sm text-foreground hover:bg-muted"
                                    >
                                        <User className="h-4 w-4 text-muted-foreground" />
                                        Profile
                                    </Link>
                                </li>
                                <li>
                                    <Link
                                        href="/settings/business"
                                        onClick={() => setMenuOpen(false)}
                                        className="flex items-center gap-2 rounded-lg px-2.5 py-2 text-sm text-foreground hover:bg-muted"
                                    >
                                        <Settings className="h-4 w-4 text-muted-foreground" />
                                        Settings
                                    </Link>
                                </li>
                                <li>
                                    <button
                                        type="button"
                                        onClick={handleLogout}
                                        disabled={logoutLoading}
                                        className="flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-sm text-destructive hover:bg-destructive-50 disabled:opacity-50"
                                    >
                                        <LogOut className="h-4 w-4" />
                                        Sign out
                                    </button>
                                </li>
                            </ul>
                        </div>
                    )}
                </div>
            </header>

            <div className="fixed inset-x-0 top-0 z-30 flex h-14 items-center justify-end gap-1 px-3 safe-top lg:hidden pointer-events-none">
                <div className="pointer-events-auto flex items-center gap-1">
                    <button
                        type="button"
                        onClick={() => setCmdOpen(true)}
                        className="inline-flex h-9 w-9 items-center justify-center rounded-lg bg-card/90 text-muted-foreground shadow-sm ring-1 ring-border hover:text-foreground"
                        aria-label="Search"
                    >
                        <Search className="h-4 w-4" />
                    </button>
                    <button
                        type="button"
                        onClick={() => setNotifOpen((v) => !v)}
                        className="relative inline-flex h-9 w-9 items-center justify-center rounded-lg bg-card/90 text-muted-foreground shadow-sm ring-1 ring-border hover:text-foreground"
                        aria-label={
                            unreadCount > 0
                                ? `Notifications, ${unreadCount} due`
                                : "Notifications"
                        }
                    >
                        <Bell className="h-4 w-4" />
                        {unreadCount > 0 && (
                            <span
                                className="absolute right-1.5 top-1.5 h-1.5 w-1.5 rounded-full bg-primary"
                                aria-hidden
                            />
                        )}
                    </button>
                </div>
            </div>

            <CommandPalette open={cmdOpen} onOpenChange={setCmdOpen} />
        </>
    );
}
