"use client";

import { useAuthStore } from "@/store/auth-store";
import { useEffect, useRef } from "react";

export function AuthProvider({ children }: { children: React.ReactNode }) {
    const { checkAuth } = useAuthStore();
    const initialized = useRef(false);

    useEffect(() => {
        // Only run once on app mount — checkAuth skips if already authenticated
        if (!initialized.current) {
            initialized.current = true;
            checkAuth();
        }
    }, []); // eslint-disable-line react-hooks/exhaustive-deps

    return <>{children}</>;
}
