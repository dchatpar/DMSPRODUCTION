import type { NextConfig } from "next";
import { SECURITY_HEADERS } from "./src/lib/security-headers";

const SUPABASE_HOST = "zwfeitodxikdwymkieai.supabase.co";

const nextConfig: NextConfig = {
    images: {
        // Use our custom Supabase loader so <Image> requests go through
        // /storage/v1/render/image/... with width/quality params.
        loader: "custom",
        loaderFile: "./supabase-image-loader.ts",
        // Allow non-Supabase image hosts (Hillz CDN, etc.) to be served
        // by Next.js's default optimizer.
        remotePatterns: [
            { protocol: "https", hostname: SUPABASE_HOST },
            { protocol: "https", hostname: "hillzcdn.ca" },
            { protocol: "https", hostname: "*.supabase.co" },
        ],
    },
    async headers() {
        return [
            {
                source: "/(.*)",
                headers: SECURITY_HEADERS,
            },
        ];
    },
};

export default nextConfig;
