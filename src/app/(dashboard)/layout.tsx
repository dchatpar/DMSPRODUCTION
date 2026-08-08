"use client";

import { usePathname } from "next/navigation";
import Sidebar from "@/src/components/Sidebar";
import { TopHeader } from "@/src/components/TopHeader";
import { MobileBottomNav } from "@/src/components/MobileBottomNav";
import { ThemeProvider } from "@/src/components/ThemeProvider";
import { TrialBanner } from "@/src/components/TrialBanner";
import { ImpersonationBanner } from "@/src/components/ImpersonationBanner";
import { TrialExpiredLock } from "@/src/components/TrialExpiredLock";
import { FlashAiProvider } from "@/src/components/ai/FlashAiProvider";
import { cn } from "@/src/lib/utils";

export default function DashboardLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    // Session is in HttpOnly cookies. Middleware redirects unauthenticated
    // requests. ThemeProvider is dashboard-only (not root/auth).
    const pathname = usePathname();
    const isIntakeWizard =
        pathname === "/inventory/new" ||
        pathname === "/inventory/add" ||
        (pathname?.startsWith("/inventory/") && pathname?.endsWith("/edit"));

    return (
        <ThemeProvider
            attribute="class"
            defaultTheme="light"
            enableSystem
            disableTransitionOnChange
        >
            <FlashAiProvider>
                <div className="flex h-screen bg-background text-foreground">
                    <Sidebar />
                    <div className="relative flex min-w-0 flex-1 flex-col overflow-hidden">
                        {!isIntakeWizard && <TopHeader />}
                        <ImpersonationBanner />
                        <TrialBanner />
                        <main
                            className={cn(
                                "relative flex-1 overflow-auto bg-page",
                                isIntakeWizard ? "pb-0 pt-14 lg:pt-0" : "pb-20 pt-14 lg:pb-0 lg:pt-0"
                            )}
                        >
                            <div className="relative min-h-full">
                                {children}
                                <TrialExpiredLock />
                            </div>
                        </main>
                    </div>
                    <MobileBottomNav />
                </div>
            </FlashAiProvider>
        </ThemeProvider>
    );
}
