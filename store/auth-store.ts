import { create } from "zustand";
import { AuthUser } from "@/types";

interface AuthState {
    user: AuthUser | null;
    isAuthenticated: boolean;
    isLoading: boolean;
    isAuthModalOpen: boolean;
    authModalView: "login" | "register";
    login: (user: AuthUser) => void;
    logout: () => void;
    checkAuth: () => Promise<void>;
    openAuthModal: (view?: "login" | "register") => void;
    closeAuthModal: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
    user: null,
    isAuthenticated: false,
    isLoading: true,
    isAuthModalOpen: false,
    authModalView: "login",
    login: (user) => set({ user, isAuthenticated: true, isAuthModalOpen: false }),
    logout: async () => {
        try {
            await fetch("/api/auth/logout", { method: "POST" });
        } catch (e) {
            console.error("Logout failed", e);
        }
        set({ user: null, isAuthenticated: false });
    },
    checkAuth: async () => {
        try {
            set({ isLoading: true });
            const res = await fetch("/api/auth/me");
            if (res.ok) {
                const data = await res.json();
                set({ user: data.user, isAuthenticated: true });
            } else {
                set({ user: null, isAuthenticated: false });
            }
        } catch (error) {
            set({ user: null, isAuthenticated: false });
        } finally {
            set({ isLoading: false });
        }
    },
    openAuthModal: (view = "login") => set({ isAuthModalOpen: true, authModalView: view }),
    closeAuthModal: () => set({ isAuthModalOpen: false }),
}));
