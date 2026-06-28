"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import Sidebar from "@/src/components/Sidebar";

export default function DashboardLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const router = useRouter();

    useEffect(() => {
        const checkAuth = async () => {
            // Check both localStorage and sessionStorage
            const token = localStorage.getItem("access_token") || sessionStorage.getItem("access_token");

            if (!token) {
                // Try to get from cookies via API
                try {
                    const response = await fetch("/api/auth/check", {
                        method: "GET",
                    });
                    if (!response.ok) {
                        router.push("/login");
                        return;
                    }
                    const data = await response.json();
                    if (!data.authenticated) {
                        router.push("/login");
                    }
                } catch (err) {
                    router.push("/login");
                }
            }
        };

        checkAuth();
    }, [router]);

    return (
        <div className="flex h-screen">
            <Sidebar />
            <main className="flex-1 overflow-auto p-6 bg-gray-50 pt-16 lg:pt-6">
                {children}
            </main>
        </div>
    );
}