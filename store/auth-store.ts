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

export const useAuthStore = create<AuthState>((set, get) => ({
    user: null,
    isAuthenticated: false,
    isLoading: true,
    isAuthModalOpen: false,
    authModalView: "login",

    // Called right after a successful login/register API response
    // Sets state immediately from the data the API already returned
    login: (user) => set({
        user,
        isAuthenticated: true,
        isLoading: false,
        isAuthModalOpen: false,
    }),

    logout: async () => {
        try {
            await fetch("/api/auth/logout", { method: "POST" });
        } catch (e) {
            console.error("Logout failed", e);
        }
        set({ user: null, isAuthenticated: false, isLoading: false });
    },

    // Only used on initial page load by AuthProvider — verifies the cookie session
    checkAuth: async () => {
        // If already authenticated, skip the network call
        if (get().isAuthenticated) {
            set({ isLoading: false });
            return;
        }
        try {
            set({ isLoading: true });
            const res = await fetch("/api/auth/me");
            if (res.ok) {
                const data = await res.json();
                set({ user: data.user, isAuthenticated: true, isLoading: false });
            } else {
                set({ user: null, isAuthenticated: false, isLoading: false });
            }
        } catch {
            set({ user: null, isAuthenticated: false, isLoading: false });
        }
    },

    openAuthModal: (view = "login") => set({ isAuthModalOpen: true, authModalView: view }),
    closeAuthModal: () => set({ isAuthModalOpen: false }),
}));
