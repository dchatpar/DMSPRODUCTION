"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabaseBrowser } from "@/src/lib/supabase-browser";
import Sidebar from "@/src/components/Sidebar";


export default function DashboardLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const router = useRouter();

    useEffect(() => {
        // Check if user is authenticated
        const checkAuth = async () => {
            const { data: { session } } = await supabaseBrowser.auth.getSession();

            if (!session) {
                // Redirect to login if not authenticated
                router.push("/login");
            }
        };

        checkAuth();

        // Listen for auth changes
        const { data: { subscription } } = supabaseBrowser.auth.onAuthStateChange(
            (event, session) => {
                if (event === "SIGNED_OUT" || !session) {
                    router.push("/login");
                }
            }
        );

        return () => {
            subscription.unsubscribe();
        };
    }, [router]);

    return (
        <div className="flex h-screen">
            {/* Sidebar - similar to React Router's outlet sidebar */}
            <Sidebar />

            {/* Main content - similar to React Router's outlet */}
            <main className="flex-1 overflow-auto p-6 bg-gray-50">
                {children}
            </main>
        </div>
    );
}