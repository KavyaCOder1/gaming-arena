"use client";

import { useAuthStore } from "@/store/auth-store";
import { useRouter, usePathname } from "next/navigation";
import { useEffect } from "react";

export default function AuthGuard({ children }: { children: React.ReactNode }) {
    const { isAuthenticated, isLoading } = useAuthStore();
    const router = useRouter();
    const pathname = usePathname();

    // Redirect to login only once loading is done and user is confirmed not authenticated
    useEffect(() => {
        if (isLoading) return;
        if (!isAuthenticated) {
            router.replace("/auth/login");
        }
    }, [isAuthenticated, isLoading, router, pathname]);

    // Show nothing while checking auth — prevents flash of protected content
    if (isLoading) {
        return (
            <div style={{
                minHeight: "100vh",
                background: "#0F172A",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
            }}>
                <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 16 }}>
                    <div style={{
                        width: 48, height: 48, borderRadius: "50%",
                        border: "3px solid rgba(34,211,238,0.15)",
                        borderTopColor: "#22d3ee",
                        animation: "authSpin 0.8s linear infinite",
                    }} />
                    <span style={{
                        fontFamily: "'Orbitron', sans-serif",
                        fontSize: 10, fontWeight: 700,
                        color: "#475569", letterSpacing: "0.25em",
                        textTransform: "uppercase",
                    }}>AUTHENTICATING...</span>
                </div>
                <style>{`@keyframes authSpin { to { transform: rotate(360deg); } }`}</style>
            </div>
        );
    }

    // Not authenticated — render nothing, redirect is happening
    if (!isAuthenticated) return null;

    return <>{children}</>;
}
