"use client";

import { useAuthStore } from "@/store/auth-store";
import { useRouter, usePathname } from "next/navigation";
import { useEffect } from "react";

export default function AuthGuard({ children }: { children: React.ReactNode }) {
    const { isAuthenticated, isLoading, checkAuth } = useAuthStore();
    const router = useRouter();
    const pathname = usePathname();

    useEffect(() => {
        checkAuth();
    }, [checkAuth]);

    useEffect(() => {
        if (!isLoading && !isAuthenticated) {
            const publicPaths = ["/", "/auth/login", "/auth/register"];
            if (!publicPaths.includes(pathname)) {
                router.push("/auth/login");
            }
        }
    }, [isAuthenticated, isLoading, router, pathname]);

    return <>{children}</>;
}
