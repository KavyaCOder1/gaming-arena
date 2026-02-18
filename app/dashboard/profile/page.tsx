"use client";

import { useAuthStore } from "@/store/auth-store";
import { User, Settings, LogOut, Shield, Calendar, Clock } from "lucide-react";
import { formatDate } from "@/lib/utils";

export default function ProfilePage() {
    const { user, logout } = useAuthStore();

    if (!user) return null;

    return (
        <div className="space-y-8 max-w-4xl">
            <h1 className="text-3xl font-bold font-mono">PLAYER PROFILE</h1>

            {/* Profile Header */}
            <div className="glass-card p-8 flex flex-col md:flex-row items-center gap-8 relative overflow-hidden">
                <div className="absolute top-0 right-0 w-64 h-64 bg-primary/10 rounded-full blur-[80px] pointer-events-none" />

                <div className="w-32 h-32 rounded-full bg-gradient-to-br from-primary to-purple-600 flex items-center justify-center text-4xl font-bold text-white shadow-[0_0_30px_theme(colors.primary.DEFAULT)] border-4 border-black/20">
                    {user.username.substring(0, 2).toUpperCase()}
                </div>

                <div className="flex-1 text-center md:text-left space-y-2">
                    <h2 className="text-3xl font-bold">{user.username}</h2>
                    <div className="flex flex-wrap justify-center md:justify-start gap-4 text-sm text-muted-foreground">
                        <span className="flex items-center gap-1 bg-white/5 px-3 py-1 rounded-full">
                            <Shield className="w-4 h-4" /> ID: {user.id.substring(0, 8)}...
                        </span>
                        <span className="flex items-center gap-1 bg-white/5 px-3 py-1 rounded-full">
                            <Calendar className="w-4 h-4" /> Joined {formatDate(new Date())}
                        </span>
                    </div>
                </div>

                <button
                    onClick={() => logout()}
                    className="px-6 py-2 rounded-lg border border-destructive/50 text-destructive hover:bg-destructive/10 transition-colors flex items-center gap-2"
                >
                    <LogOut className="w-4 h-4" />
                    Sign Out
                </button>
            </div>

            {/* Account Settings Placeholder */}
            <div className="glass-card p-6">
                <h3 className="text-xl font-bold mb-6 flex items-center gap-2">
                    <Settings className="w-5 h-5 text-primary" />
                    Account Settings
                </h3>

                <div className="space-y-6">
                    <div className="p-4 rounded-lg bg-white/5 border border-white/5">
                        <h4 className="font-medium mb-1">Change Password</h4>
                        <p className="text-sm text-muted-foreground mb-4">Update your account password securely.</p>
                        <button className="px-4 py-2 text-sm bg-secondary text-secondary-foreground rounded hover:bg-secondary/80 transition-colors">
                            Update Password
                        </button>
                    </div>

                    <div className="p-4 rounded-lg bg-white/5 border border-white/5">
                        <h4 className="font-medium mb-1">Notifications</h4>
                        <p className="text-sm text-muted-foreground mb-4">Manage your email and push notifications.</p>
                        <div className="flex items-center gap-2">
                            <div className="w-10 h-6 bg-primary/20 rounded-full relative cursor-not-allowed">
                                <div className="absolute left-1 top-1 w-4 h-4 bg-primary rounded-full shadow-sm" />
                            </div>
                            <span className="text-sm text-muted-foreground">Email Notifications (Coming Soon)</span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
