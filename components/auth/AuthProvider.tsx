"use client";

import { useEffect, useRef } from "react";
import { useAuthStore } from "@/store/auth-store";

// Runs once on app boot to restore session from cookie
export function AuthProvider({ children }: { children: React.ReactNode }) {
    const init = useAuthStore((s) => s.init);
    const called = useRef(false);

    useEffect(() => {
        if (called.current) return;
        called.current = true;
        init();
    }, []);

    return <>{children}</>;
}
