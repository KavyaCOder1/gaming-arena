"use client";

import { Navbar } from "@/components/layout/Navbar";
import { Sidebar } from "@/components/layout/Sidebar";
import AuthGuard from "@/components/auth/AuthGuard";

export default function DashboardLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <AuthGuard>
            <div className="min-h-screen bg-background">
                <Navbar />
                <div className="flex container mx-auto max-w-7xl pt-32 lg:pt-36 gap-6 px-4 sm:px-6 lg:px-8">
                    <Sidebar />
                    <main className="flex-1 pb-32 lg:pb-10">
                        {children}
                    </main>
                </div>
            </div>
        </AuthGuard>
    );
}
