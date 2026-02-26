import { create } from "zustand";

export interface AuthUser {
    id: string;
    username: string;
}

interface AuthState {
    user: AuthUser | null;
    isAuthenticated: boolean;
    isLoading: boolean;
    isAuthModalOpen: boolean;
    authModalView: "login" | "register";
    // Set user after successful login/register
    setUser: (user: AuthUser) => void;
    // Clear user on logout
    clearUser: () => void;
    // Check session cookie on app boot — called ONCE
    init: () => Promise<void>;
    openAuthModal: (view?: "login" | "register") => void;
    closeAuthModal: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
    user: null,
    isAuthenticated: false,
    isLoading: true,
    isAuthModalOpen: false,
    authModalView: "login",

    setUser: (user) => set({
        user,
        isAuthenticated: true,
        isLoading: false,
        isAuthModalOpen: false,
    }),

    clearUser: () => set({
        user: null,
        isAuthenticated: false,
        isLoading: false,
    }),

    init: async () => {
        try {
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
