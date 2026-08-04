import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { ApiErrorBridge } from "@/src/components/ApiErrorBridge";
import { ESBUILD_NAME_HELPER } from "@/src/components/ThemeProvider";
import { Toaster } from "@/src/components/ui/toaster";
import "./globals.css";
import "react-day-picker/style.css";

const geistSans = Geist({
    variable: "--font-geist-sans",
    subsets: ["latin"],
    display: "swap",
});

const geistMono = Geist_Mono({
    variable: "--font-geist-mono",
    subsets: ["latin"],
    display: "swap",
});

export const metadata: Metadata = {
    title: {
        default: "FlashFender",
        template: "%s · FlashFender",
    },
    description: "FlashFender Dealer Management System",
    icons: {
        icon: [
            { url: "/favicon.png", sizes: "32x32", type: "image/png" },
            { url: "/brand/favicon-16.png", sizes: "16x16", type: "image/png" },
            { url: "/brand/flashfender-mark.png", type: "image/png" },
        ],
        apple: [{ url: "/apple-touch-icon.png", sizes: "180x180", type: "image/png" }],
    },
};

export default function RootLayout({
    children,
}: Readonly<{
    children: React.ReactNode;
}>) {
    return (
        <html
            lang="en"
            className={`${geistSans.variable} ${geistMono.variable}`}
            suppressHydrationWarning
        >
            <head>
                <script
                    dangerouslySetInnerHTML={{ __html: ESBUILD_NAME_HELPER }}
                />
            </head>
            <body
                className={`${geistSans.className} min-h-dvh bg-background text-foreground antialiased`}
            >
                {children}
                <Toaster />
                <ApiErrorBridge />
            </body>
        </html>
    );
}
