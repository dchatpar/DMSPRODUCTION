import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Toaster } from "sonner";
import { ApiErrorBridge } from "@/src/components/ApiErrorBridge";
import { ESBUILD_NAME_HELPER } from "@/src/components/ThemeProvider";
import "./globals.css";

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
        default: "Flash Fender",
        template: "%s · Flash Fender",
    },
    description: "Flash Fender Dealer Management System",
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
                <Toaster
                    position="top-right"
                    richColors
                    closeButton
                    duration={5000}
                />
                <ApiErrorBridge />
            </body>
        </html>
    );
}
