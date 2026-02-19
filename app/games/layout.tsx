"use client";

import { Navbar } from "@/components/layout/Navbar";
import { Sidebar } from "@/components/layout/Sidebar";
import AuthGuard from "@/components/auth/AuthGuard";

export default function GamesLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <AuthGuard>
            <div className="min-h-screen bg-[#0F172A] relative">

                {/* ── GLOBAL BACKGROUND (matches home page) ── */}
                <div className="fixed inset-0 pointer-events-none -z-10">
                    {/* base dark */}
                    <div className="absolute inset-0 bg-[#0F172A]" />
                    {/* grid lines */}
                    <div className="absolute inset-0" style={{ backgroundImage: "linear-gradient(to right, rgba(99,102,241,0.05) 1px, transparent 1px), linear-gradient(to bottom, rgba(99,102,241,0.05) 1px, transparent 1px)", backgroundSize: "40px 40px" }} />
                    {/* dot overlay */}
                    <div className="absolute inset-0 opacity-20" style={{ backgroundImage: "radial-gradient(rgba(148,163,184,0.4) 1px, transparent 1px)", backgroundSize: "40px 40px" }} />
                    {/* indigo blob top-left */}
                    <div className="absolute top-[10%] left-[5%] w-[500px] h-[500px] rounded-full" style={{ background: "radial-gradient(circle, rgba(99,102,241,0.12) 0%, transparent 70%)" }} />
                    {/* cyan blob bottom-right */}
                    <div className="absolute bottom-[5%] right-[5%] w-[600px] h-[600px] rounded-full" style={{ background: "radial-gradient(circle, rgba(34,211,238,0.08) 0%, transparent 70%)" }} />
                    {/* extra subtle mid glow */}
                    <div className="absolute top-[50%] left-[50%] -translate-x-1/2 -translate-y-1/2 w-[800px] h-[400px] rounded-full" style={{ background: "radial-gradient(ellipse, rgba(99,102,241,0.04) 0%, transparent 70%)" }} />
                </div>

                <Navbar />
                <div className="flex container mx-auto max-w-7xl pt-32 lg:pt-36 gap-6 px-4 sm:px-6 lg:px-8">
                    <Sidebar />
                    <main className="flex-1 pb-28 lg:pb-10 flex flex-col items-stretch lg:items-stretch">
                        {children}
                    </main>
                </div>
            </div>
        </AuthGuard>
    );
}
