"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { supabaseBrowser } from "@/src/lib/supabase-browser";
import { hasPermission as checkPermission } from "@/src/lib/permission-middleware";
import {
    LayoutDashboard,
    BarChart3,
    Users,
    TestTube,
    FileText,
    Receipt,
    Car,
    Share2,
    UserCog,
    Settings,
    LogOut,
    ChevronDown,
    ChevronRight,
    User,
    Mail,
    Phone,
    Shield,
    Menu,
    X,
    FlaskConical,
    ReceiptIcon,
    Loader2,
    Store,
    Wrench,
    Scan,
    Calculator,
    Phone as PhoneIcon,
    FileSignature,
    LogIn,
    CreditCard,
    UserCheck,
    Key,
    Flag,
} from "lucide-react";

interface UserData {
    full_name: string;
    email: string;
    role: string;
    phone: string;
    avatar: string | null;
    is_platform_admin: boolean;
    dealership_id: string | null;
    dealership_name?: string;
    user_permissions?: string[];
    effective_permissions?: string[];
}

// Platform admin navigation sections
const platformAdminSections = [
    {
        title: "PLATFORM",
        items: [
            { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
            { name: "All Dealerships", href: "/dealerships", icon: Store },
            { name: "Audit Logs", href: "/platform/audit-logs", icon: Shield },
            { name: "Login History", href: "/platform/login-history", icon: LogIn },
            { name: "Analytics", href: "/platform/analytics", icon: BarChart3 },
            { name: "Subscriptions", href: "/platform/subscriptions", icon: CreditCard },
        ],
    },
    {
        title: "ADMIN TOOLS",
        items: [
            { name: "Impersonate User", href: "/platform/impersonate", icon: UserCheck },
            { name: "Reset Password", href: "/platform/reset-password", icon: Key },
            { name: "Feature Flags", href: "/platform/feature-flags", icon: Flag },
            { name: "Platform Settings", href: "/settings/platform", icon: Settings },
        ],
    },
];

// Regular dealership navigation sectionss
const navigationSections = [
    {
        title: "OVERVIEW",
        items: [
            { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
            // { name: "Calendar", href: "/calendar", icon: BarChart3 },
        ],
    },
    {
        title: "SALES",
        items: [
            { name: "Lead Center", href: "/leads", icon: Users },
            { name: "Test Drives", href: "/test-drives", icon: TestTube },
            { name: "Deals", href: "/deals", icon: FileText },
            { name: "Follow-ups", href: "/follow-ups", icon: Receipt },
        ],
    },
    {
        title: "INVENTORY",
        items: [{ name: "All Vehicles", href: "/inventory", icon: Car }],
    },
    {
        title: "CUSTOMERS",
        items: [{ name: "Customer Directory", href: "/customers", icon: Users }],
    },
    {
        title: "FINANCIAL",
        items: [
            { name: "Invoices", href: "/invoices", icon: Receipt },
            { name: "Expenses", href: "/expenses", icon: ReceiptIcon },
            { name: "Vendors", href: "/vendors", icon: Store },
            { name: "Reports", href: "/reports", icon: BarChart3 },
        ],
    },
    // {
    //     title: "MARKETING",
    //     items: [{ name: "Social Posting", href: "/social", icon: Share2 }],
    // },
    {
        title: "MANAGEMENT",
        items: [
            { name: "Users & Roles", href: "/users", icon: UserCog },
            { name: "Roles & Permissions", href: "/roles", icon: Shield },
            { name: "Tasks", href: "/tasks", icon: ReceiptIcon },
            { name: "Tickets", href: "/tickets", icon: FlaskConical },
        ],
    },
    {
        title: "TOOLS",
        items: [
            { name: "Dealership Tools", href: "/tools", icon: Wrench },
        ],
    },
    {
        title: "SETTINGS",
        items: [
            { name: "Profile", href: "/profile", icon: Settings },
            // { name: "Business Profile", href: "/business", icon: Settings },
        ],
    },
];

export default function Sidebar() {
    const pathname = usePathname();
    const router = useRouter();
    const [isCollapsed, setIsCollapsed] = useState(false);
    const [isMobileOpen, setIsMobileOpen] = useState(false);
    const [userData, setUserData] = useState<UserData | null>(null);
    const [loading, setLoading] = useState(true);
    const [logoutLoading, setLogoutLoading] = useState(false);
    const [expandedSections, setExpandedSections] = useState<string[]>([
        "OVERVIEW", "SALES", "INVENTORY", "CUSTOMERS", "FINANCIAL", "MANAGEMENT", "SETTINGS"
    ]);

    // Close mobile sidebar on route change
    useEffect(() => {
        setIsMobileOpen(false);
    }, [pathname]);

    // Prevent body scroll when mobile sidebar is open
    useEffect(() => {
        if (isMobileOpen) {
            document.body.style.overflow = "hidden";
        } else {
            document.body.style.overflow = "";
        }
        return () => {
            document.body.style.overflow = "";
        };
    }, [isMobileOpen]);

    useEffect(() => {
        const fetchUserData = async () => {
            try {
                const token = localStorage.getItem("access_token");
                if (!token) {
                    setLoading(false);
                    return;
                }

                const response = await fetch("/api/me", {
                    headers: {
                        Authorization: `Bearer ${token}`,
                    },
                });

                if (response.ok) {
                    const data = await response.json();
                    setUserData(data.data);
                } else if (response.status === 401) {
                    // Token expired or invalid
                    localStorage.removeItem("access_token");
                    localStorage.removeItem("refresh_token");
                    router.push("/login");
                }
            } catch (error) {
                console.error("Failed to fetch user data:", error);
            } finally {
                setLoading(false);
            }
        };

        fetchUserData();
    }, [router]);

    const handleLogout = async () => {
        setLogoutLoading(true);
        try {
            // Sign out from Supabase
            await supabaseBrowser.auth.signOut();

            // Clear local storage
            localStorage.removeItem("access_token");
            localStorage.removeItem("refresh_token");
            localStorage.removeItem("user_email");

            // Redirect to login page immediately
            router.push("/login");
            router.refresh();
        } catch (error) {
            console.error("Logout error:", error);
            // Even if there's an error, clear tokens and redirect
            localStorage.removeItem("access_token");
            localStorage.removeItem("refresh_token");
            router.push("/login");
            router.refresh();
        } finally {
            setLogoutLoading(false);
        }
    };

    const toggleSection = (title: string) => {
        setExpandedSections((prev) =>
            prev.includes(title)
                ? prev.filter((t) => t !== title)
                : [...prev, title]
        );
    };

    const getInitials = (name: string) => {
        if (!name) return "U";
        return name
            .split(" ")
            .map((word) => word[0])
            .join("")
            .toUpperCase()
            .slice(0, 2);
    };

    const getRoleColor = (role: string) => {
        const colors: Record<string, string> = {
            Admin: "bg-purple-100 text-purple-700",
            Manager: "bg-blue-100 text-blue-700",
            Staff: "bg-green-100 text-green-700",
            Salesperson: "bg-orange-100 text-orange-700",
        };
        return colors[role] || "bg-gray-100 text-gray-700";
    };

    // Get user initials or default
    const userInitials = userData?.full_name ? getInitials(userData.full_name) : "U";
    const displayName = userData?.full_name || "User";
    const displayEmail = userData?.email || "";

    // Determine which navigation sections to show
    const activeSections = userData?.is_platform_admin ? platformAdminSections : navigationSections;
    const allSections = ["PLATFORM", "MANAGEMENT", "OVERVIEW", "SALES", "INVENTORY", "CUSTOMERS", "FINANCIAL", "TOOLS", "SETTINGS"];

    // Map sidebar pages to their required read permissions
    const pagePermMap: Record<string, string> = {
        "/dashboard": "dashboard:read",
        "/leads": "leads:read",
        "/test-drives": "test_drives:read",
        "/deals": "deals:read",
        "/follow-ups": "follow_ups:read",
        "/inventory": "vehicles:read",
        "/customers": "customers:read",
        "/invoices": "invoices:read",
        "/expenses": "expenses:read",
        "/vendors": "vendors:read",
        "/reports": "reports:read",
        "/users": "users:read",
        "/roles": "roles:read",
        "/tasks": "tasks:read",
        "/tickets": "tickets:read",
        "/tools": "tools:read",
        "/profile": "profile:read",
    };

    // Check if user has permission to see a nav item
    const hasPermission = (href: string): boolean => {
        // Admin and platform admin see everything
        if (userData?.role === "Admin" || userData?.is_platform_admin) return true;

        // Get user's effective permissions (role + individual overrides)
        const effectivePermissions: string[] = userData?.effective_permissions || userData?.user_permissions || [];

        // If user has full access (*), show everything
        if (effectivePermissions.includes("*")) return true;

        // Check if user has the required permission for this page
        const permKey = pagePermMap[href];
        if (!permKey) return true; // If not in map, show it

        // Check for specific permission using centralized helper
        if (checkPermission(effectivePermissions, permKey)) return true;

        // Also check for :assigned variant (user can see assigned items only)
        // e.g., leads:read:assigned means they can see leads nav but scoped to assigned
        const assignedPermKey = permKey + ":assigned";
        if (checkPermission(effectivePermissions, assignedPermKey)) return true;

        return false;
    };

    // Filter navigation items based on permissions
    const filteredSections = activeSections.map(section => ({
        ...section,
        items: section.items.filter(item => hasPermission(item.href))
    })).filter(section => section.items.length > 0);

    return (
        <>
            {/* Mobile Header */}
            <div className="lg:hidden fixed top-0 left-0 right-0 z-40 bg-white border-b border-gray-200 flex items-center justify-between p-4">
                <img src="/logo.svg" alt="DMS Logo" className="w-28 h-10" />
                <button
                    onClick={() => setIsMobileOpen(true)}
                    className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                >
                    <Menu className="w-6 h-6 text-gray-500" />
                </button>
            </div>

            {/* Mobile Overlay */}
            {isMobileOpen && (
                <div
                    className="lg:hidden fixed inset-0 bg-black/50 z-40"
                    onClick={() => setIsMobileOpen(false)}
                />
            )}

            {/* Mobile Sidebar */}
            <aside
                className={`
                    lg:hidden fixed left-0 top-0 bottom-0 z-50 bg-white flex flex-col transition-transform duration-300
                    ${isMobileOpen ? "translate-x-0" : "-translate-x-full"}
                    ${isCollapsed ? "w-20" : "w-64"}
                `}
            >
                {/* Header */}
                <div className="flex items-center justify-between p-4 border-b border-gray-200">
                    {!isCollapsed && (
                        <div className="flex items-center gap-2">
                            <img src="/logo.svg" alt="DMS Logo" className="w-28 h-10" />
                        </div>
                    )}
                    <button
                        onClick={() => setIsMobileOpen(false)}
                        className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors"
                    >
                        <X className="w-5 h-5 text-gray-500" />
                    </button>
                </div>

                {/* Navigation */}
                <nav className="flex-1 overflow-y-auto p-3 space-y-4">
                    {filteredSections.map((section) => {
                        const isExpanded = expandedSections.includes(section.title);

                        return (
                            <div key={section.title}>
                                {/* Section Title */}
                                {!isCollapsed && (
                                    <button
                                        onClick={() => toggleSection(section.title)}
                                        className="flex items-center justify-between w-full px-2 py-1.5 text-xs font-semibold text-gray-400 uppercase tracking-wider hover:text-gray-600 transition-colors"
                                    >
                                        <span>{section.title}</span>
                                        {isExpanded ? (
                                            <ChevronDown className="w-3 h-3 transition-transform duration-200" />
                                        ) : (
                                            <ChevronRight className="w-3 h-3 transition-transform duration-200" />
                                        )}
                                    </button>
                                )}

                                {/* Navigation Items */}
                                {isExpanded && (
                                    <ul className="space-y-1 mt-1">
                                        {section.items.map((item) => {
                                            const Icon = item.icon;
                                            const isActive = pathname === item.href;

                                            return (
                                                <li key={item.href}>
                                                    <Link
                                                        href={item.href}
                                                        className={`
                                                            flex items-center gap-3 px-3 py-2 rounded-lg transition-all duration-200
                                                            ${isActive
                                                                ? "bg-blue-50 text-blue-700"
                                                                : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
                                                            }
                                                            ${isCollapsed ? "justify-center" : ""}
                                                        `}
                                                        title={isCollapsed ? item.name : undefined}
                                                    >
                                                        <Icon className={`w-5 h-5 flex-shrink-0`} />
                                                        {!isCollapsed && (
                                                            <span className="text-sm font-medium truncate">
                                                                {item.name}
                                                            </span>
                                                        )}
                                                        {isActive && !isCollapsed && (
                                                            <span className="ml-auto w-1.5 h-6 bg-blue-600 rounded-full"></span>
                                                        )}
                                                    </Link>
                                                </li>
                                            );
                                        })}
                                    </ul>
                                )}
                            </div>
                        );
                    })}
                </nav>

                {/* User Profile & Logout */}
                <div className="border-t border-gray-200 p-3 space-y-2">
                    {/* User Profile */}
                    <div className="flex items-center gap-3 px-2 py-2 rounded-lg hover:bg-gray-50 transition-colors">
                        {loading ? (
                            <div className="w-9 h-9 rounded-full bg-gray-200 animate-pulse flex items-center justify-center">
                                <Loader2 className="w-4 h-4 text-gray-400 animate-spin" />
                            </div>
                        ) : userData?.avatar ? (
                            <img
                                src={userData.avatar}
                                alt={userData.full_name}
                                className="w-9 h-9 rounded-full object-cover ring-2 ring-gray-200"
                                onError={(e) => {
                                    // If image fails to load, show initials
                                    (e.target as HTMLImageElement).style.display = 'none';
                                    const parent = (e.target as HTMLImageElement).parentElement;
                                    if (parent) {
                                        const fallback = document.createElement('div');
                                        fallback.className = 'w-9 h-9 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white text-sm font-medium';
                                        fallback.textContent = userInitials;
                                        parent.appendChild(fallback);
                                    }
                                }}
                            />
                        ) : (
                            <div className="w-9 h-9 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white text-sm font-medium ring-2 ring-blue-100">
                                {userInitials}
                            </div>
                        )}

                        {!isCollapsed && (
                            <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium text-gray-900 truncate">
                                    {loading ? "Loading..." : displayName}
                                </p>
                                <div className="flex items-center gap-1.5 flex-wrap">
                                    <p className="text-xs text-gray-500 truncate">
                                        {loading ? "..." : displayEmail}
                                    </p>
                                    {userData?.is_platform_admin && (
                                        <span className="px-1.5 py-0.5 text-[10px] font-medium rounded bg-amber-100 text-amber-700">
                                            Platform Admin
                                        </span>
                                    )}
                                    {userData?.role && !userData?.is_platform_admin && (
                                        <span
                                            className={`px-1.5 py-0.5 text-[10px] font-medium rounded ${getRoleColor(
                                                userData.role
                                            )}`}
                                        >
                                            {userData.role}
                                        </span>
                                    )}
                                    {userData?.dealership_name && !userData?.is_platform_admin && (
                                        <span className="px-1.5 py-0.5 text-[10px] font-medium rounded bg-gray-100 text-gray-600">
                                            {userData.dealership_name}
                                        </span>
                                    )}
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Logout Button */}
                    <button
                        onClick={handleLogout}
                        disabled={logoutLoading}
                        className={`
                            flex items-center gap-3 w-full px-3 py-2 rounded-lg text-red-600 hover:bg-red-50 transition-colors
                            ${isCollapsed ? "justify-center" : ""}
                            ${logoutLoading ? "opacity-50 cursor-not-allowed" : ""}
                        `}
                        title={isCollapsed ? "Logout" : undefined}
                    >
                        {logoutLoading ? (
                            <Loader2 className="w-5 h-5 flex-shrink-0 animate-spin" />
                        ) : (
                            <LogOut className="w-5 h-5 flex-shrink-0" />
                        )}
                        {!isCollapsed && (
                            <span className="text-sm font-medium">
                                {logoutLoading ? "Logging out..." : "Logout"}
                            </span>
                        )}
                    </button>
                </div>
            </aside>

            {/* Desktop Sidebar */}
            <aside
                className={`hidden lg:flex bg-white border-r border-gray-200 flex-col transition-all duration-300 ${isCollapsed ? "w-20" : "w-64"}`}
            >
                {/* Header */}
                <div className="flex items-center justify-between p-4 border-b border-gray-200">
                    {!isCollapsed && (
                        <div className="flex items-center gap-2">
                            <img src="/logo.svg" alt="DMS Logo" className="w-28 h-10" />
                        </div>
                    )}
                    <button
                        onClick={() => setIsCollapsed(!isCollapsed)}
                        className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors"
                    >
                        {isCollapsed ? (
                            <Menu className="w-5 h-5 text-gray-500" />
                        ) : (
                            <X className="w-5 h-5 text-gray-500" />
                        )}
                    </button>
                </div>

                {/* Navigation */}
                <nav className="flex-1 overflow-y-auto p-3 space-y-4">
                    {filteredSections.map((section) => {
                        const isExpanded = expandedSections.includes(section.title);

                        return (
                            <div key={section.title}>
                                {/* Section Title */}
                                {!isCollapsed && (
                                    <button
                                        onClick={() => toggleSection(section.title)}
                                        className="flex items-center justify-between w-full px-2 py-1.5 text-xs font-semibold text-gray-400 uppercase tracking-wider hover:text-gray-600 transition-colors"
                                    >
                                        <span>{section.title}</span>
                                        {isExpanded ? (
                                            <ChevronDown className="w-3 h-3 transition-transform duration-200" />
                                        ) : (
                                            <ChevronRight className="w-3 h-3 transition-transform duration-200" />
                                        )}
                                    </button>
                                )}

                                {/* Navigation Items */}
                                {isExpanded && (
                                    <ul className="space-y-1 mt-1">
                                        {section.items.map((item) => {
                                            const Icon = item.icon;
                                            const isActive = pathname === item.href;

                                            return (
                                                <li key={item.href}>
                                                    <Link
                                                        href={item.href}
                                                        className={`
                                                            flex items-center gap-3 px-3 py-2 rounded-lg transition-all duration-200
                                                            ${isActive
                                                                ? "bg-blue-50 text-blue-700"
                                                                : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
                                                            }
                                                            ${isCollapsed ? "justify-center" : ""}
                                                        `}
                                                        title={isCollapsed ? item.name : undefined}
                                                    >
                                                        <Icon className={`w-5 h-5 flex-shrink-0`} />
                                                        {!isCollapsed && (
                                                            <span className="text-sm font-medium truncate">
                                                                {item.name}
                                                            </span>
                                                        )}
                                                        {isActive && !isCollapsed && (
                                                            <span className="ml-auto w-1.5 h-6 bg-blue-600 rounded-full"></span>
                                                        )}
                                                    </Link>
                                                </li>
                                            );
                                        })}
                                    </ul>
                                )}
                            </div>
                        );
                    })}
                </nav>

                {/* User Profile & Logout */}
                <div className="border-t border-gray-200 p-3 space-y-2">
                    {/* User Profile */}
                    <div className="flex items-center gap-3 px-2 py-2 rounded-lg hover:bg-gray-50 transition-colors">
                        {loading ? (
                            <div className="w-9 h-9 rounded-full bg-gray-200 animate-pulse flex items-center justify-center">
                                <Loader2 className="w-4 h-4 text-gray-400 animate-spin" />
                            </div>
                        ) : userData?.avatar ? (
                            <img
                                src={userData.avatar}
                                alt={userData.full_name}
                                className="w-9 h-9 rounded-full object-cover ring-2 ring-gray-200"
                                onError={(e) => {
                                    // If image fails to load, show initials
                                    (e.target as HTMLImageElement).style.display = 'none';
                                    const parent = (e.target as HTMLImageElement).parentElement;
                                    if (parent) {
                                        const fallback = document.createElement('div');
                                        fallback.className = 'w-9 h-9 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white text-sm font-medium';
                                        fallback.textContent = userInitials;
                                        parent.appendChild(fallback);
                                    }
                                }}
                            />
                        ) : (
                            <div className="w-9 h-9 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white text-sm font-medium ring-2 ring-blue-100">
                                {userInitials}
                            </div>
                        )}

                        {!isCollapsed && (
                            <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium text-gray-900 truncate">
                                    {loading ? "Loading..." : displayName}
                                </p>
                                <div className="flex items-center gap-1.5 flex-wrap">
                                    <p className="text-xs text-gray-500 truncate">
                                        {loading ? "..." : displayEmail}
                                    </p>
                                    {userData?.is_platform_admin && (
                                        <span className="px-1.5 py-0.5 text-[10px] font-medium rounded bg-amber-100 text-amber-700">
                                            Platform Admin
                                        </span>
                                    )}
                                    {userData?.role && !userData?.is_platform_admin && (
                                        <span
                                            className={`px-1.5 py-0.5 text-[10px] font-medium rounded ${getRoleColor(
                                                userData.role
                                            )}`}
                                        >
                                            {userData.role}
                                        </span>
                                    )}
                                    {userData?.dealership_name && !userData?.is_platform_admin && (
                                        <span className="px-1.5 py-0.5 text-[10px] font-medium rounded bg-gray-100 text-gray-600">
                                            {userData.dealership_name}
                                        </span>
                                    )}
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Logout Button */}
                    <button
                        onClick={handleLogout}
                        disabled={logoutLoading}
                        className={`
                            flex items-center gap-3 w-full px-3 py-2 rounded-lg text-red-600 hover:bg-red-50 transition-colors
                            ${isCollapsed ? "justify-center" : ""}
                            ${logoutLoading ? "opacity-50 cursor-not-allowed" : ""}
                        `}
                        title={isCollapsed ? "Logout" : undefined}
                    >
                        {logoutLoading ? (
                            <Loader2 className="w-5 h-5 flex-shrink-0 animate-spin" />
                        ) : (
                            <LogOut className="w-5 h-5 flex-shrink-0" />
                        )}
                        {!isCollapsed && (
                            <span className="text-sm font-medium">
                                {logoutLoading ? "Logging out..." : "Logout"}
                            </span>
                        )}
                    </button>
                </div>
            </aside>
        </>
    );
}