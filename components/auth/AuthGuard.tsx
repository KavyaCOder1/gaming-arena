"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/store/auth-store";

export default function AuthGuard({ children }: { children: React.ReactNode }) {
    const { isAuthenticated, isLoading } = useAuthStore();
    const router = useRouter();

    useEffect(() => {
        if (!isLoading && !isAuthenticated) {
            router.replace("/auth/login");
        }
    }, [isLoading, isAuthenticated]);

    if (isLoading) {
        return (
            <div style={{ minHeight: "100vh", background: "#0F172A", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 14 }}>
                    <div style={{ width: 44, height: 44, borderRadius: "50%", border: "3px solid rgba(34,211,238,0.1)", borderTopColor: "#22d3ee", animation: "authspin 0.8s linear infinite" }} />
                    <span style={{ fontFamily: "'Orbitron',sans-serif", fontSize: 9, color: "#334155", letterSpacing: "0.3em", textTransform: "uppercase" }}>Authenticating</span>
                </div>
                <style>{`@keyframes authspin { to { transform: rotate(360deg); } }`}</style>
            </div>
        );
    }

    if (!isAuthenticated) return null;

    return <>{children}</>;
}
