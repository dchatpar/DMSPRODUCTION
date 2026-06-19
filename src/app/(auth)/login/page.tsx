"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { supabaseBrowser } from "@/src/lib/supabase-browser";
import {
    Car,
    Mail,
    Lock,
    Eye,
    EyeOff,
    Loader2,
    Shield,
    CheckCircle
} from "lucide-react";

export default function LoginPage() {
    const router = useRouter();
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const [rememberMe, setRememberMe] = useState(false);
    const emailInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        if (emailInputRef.current) {
            emailInputRef.current.focus();
        }
    }, []);

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError("");

        if (!email.trim()) {
            setError("Email address is required");
            setLoading(false);
            return;
        }
        if (!password.trim()) {
            setError("Password is required");
            setLoading(false);
            return;
        }

        try {
            const { data, error } = await supabaseBrowser.auth.signInWithPassword({
                email: email.trim(),
                password,
            });

            if (error) {
                throw error;
            }

            if (data?.session) {
                localStorage.setItem("access_token", data.session.access_token);
                localStorage.setItem("refresh_token", data.session.refresh_token || "");
                localStorage.setItem("user_email", data.user?.email || "");

                router.push("/dashboard");
                router.refresh();
            }
        } catch (err: any) {
            if (err.message.includes("Invalid login credentials")) {
                setError("Invalid email or password. Please try again.");
            } else if (err.message.includes("Email not confirmed")) {
                setError("Please confirm your email address before logging in.");
            } else {
                setError(err.message || "An error occurred during login.");
            }
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="w-full max-w-md">
            <div className="bg-white rounded-2xl shadow-xl border border-gray-100 p-8">
                {/* Logo/Brand */}
                <div className="text-center mb-8">
                    <img
                        src="/dms.svg"
                        alt="DMS Logo"
                        className="w-28 h-10 mx-auto"
                    />
                    <p className="text-sm text-gray-500 mt-1">
                        Sign in to your account
                    </p>
                </div>

                {/* Error Alert */}
                {error && (
                    <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl">
                        <div className="flex items-start gap-3">
                            <div className="flex-shrink-0 mt-0.5">
                                <div className="w-5 h-5 rounded-full bg-red-100 flex items-center justify-center">
                                    <span className="text-red-500 text-xs font-bold">!</span>
                                </div>
                            </div>
                            <div className="flex-1">
                                <p className="text-sm text-red-600">{error}</p>
                            </div>
                            <button
                                onClick={() => setError("")}
                                className="flex-shrink-0 text-red-400 hover:text-red-600 transition-colors"
                            >
                                <span className="text-lg">×</span>
                            </button>
                        </div>
                    </div>
                )}

                {/* Login Form */}
                <form onSubmit={handleLogin} className="space-y-5">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1.5">
                            Email Address
                        </label>
                        <div className="relative">
                            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                            <input
                                ref={emailInputRef}
                                type="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-xl text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                                placeholder="you@dealership.com"
                                required
                                disabled={loading}
                            />
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1.5">
                            Password
                        </label>
                        <div className="relative">
                            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                            <input
                                type={showPassword ? "text" : "password"}
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                className="w-full pl-10 pr-12 py-2.5 border border-gray-300 rounded-xl text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                                placeholder="Enter your password"
                                required
                                disabled={loading}
                            />
                            <button
                                type="button"
                                onClick={() => setShowPassword(!showPassword)}
                                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                                disabled={loading}
                            >
                                {showPassword ? (
                                    <EyeOff className="w-4 h-4" />
                                ) : (
                                    <Eye className="w-4 h-4" />
                                )}
                            </button>
                        </div>
                    </div>

                    <div className="flex items-center justify-between">
                        <label className="flex items-center gap-2 text-sm text-gray-600 cursor-pointer">
                            <input
                                type="checkbox"
                                checked={rememberMe}
                                onChange={(e) => setRememberMe(e.target.checked)}
                                className="w-4 h-4 border-gray-300 rounded text-blue-600 focus:ring-blue-500"
                            />
                            Remember me
                        </label>
                        <button
                            type="button"
                            className="text-sm text-blue-600 hover:text-blue-700 font-medium transition-colors"
                        >
                            Forgot password?
                        </button>
                    </div>

                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full py-2.5 px-4 bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-medium rounded-xl hover:shadow-lg hover:shadow-blue-500/25 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                    >
                        {loading ? (
                            <>
                                <Loader2 className="w-5 h-5 animate-spin" />
                                <span>Signing in...</span>
                            </>
                        ) : (
                            <>
                                <span>Sign In</span>
                                <span className="text-lg">→</span>
                            </>
                        )}
                    </button>
                </form>

                {/* Divider */}
                <div className="relative my-6">
                    <div className="absolute inset-0 flex items-center">
                        <div className="w-full border-t border-gray-200"></div>
                    </div>
                    <div className="relative flex justify-center text-sm">
                        <span className="px-4 bg-white text-gray-500">Secure Login</span>
                    </div>
                </div>

                {/* Footer */}
                <div className="space-y-3">
                    <div className="flex items-center justify-center gap-6 text-xs text-gray-500">
                        <span className="flex items-center gap-1">
                            <Shield className="w-3 h-3" />
                            Encrypted
                        </span>
                        <span>•</span>
                        <span className="flex items-center gap-1">
                            <CheckCircle className="w-3 h-3 text-green-500" />
                            Secure
                        </span>
                        <span>•</span>
                        <span>24/7 Support</span>
                    </div>

                    <p className="text-center text-xs text-gray-400">
                        © 2024 Adaptus DMS. All rights reserved.
                    </p>
                </div>
            </div>
        </div>
    );
}