"use client";

import { motion } from "framer-motion";
import { Navbar } from "@/components/layout/Navbar";

export default function AuthLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <div className="min-h-screen flex flex-col relative overflow-hidden bg-background">
            <Navbar />

            {/* Animated Background Mesh */}
            <div className="absolute inset-0 z-0 opacity-40 dark:opacity-60 overflow-hidden pointer-events-none">
                <div className="absolute top-0 right-0 w-[800px] h-[800px] bg-primary/20 rounded-full blur-[120px] -mr-96 -mt-96 animate-glow-pulse" />
                <div className="absolute left-0 bottom-0 w-[600px] h-[600px] bg-secondary/20 rounded-full blur-[100px] -ml-64 -mb-64 animate-glow-pulse delay-1000" />
                <div className="absolute inset-0" style={{ backgroundImage: "radial-gradient(var(--border) 1px, transparent 1px)", backgroundSize: "40px 40px" }} />
            </div>

            <div className="flex-1 flex items-center justify-center relative z-10 p-6 pt-32 pb-20">
                <motion.div
                    initial={{ opacity: 0, scale: 0.95, y: 20 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    transition={{ duration: 0.5 }}
                    className="w-full max-w-md relative"
                >
                    {/* Glow effect for the form container */}
                    <div className="absolute -inset-1 bg-gradient-to-r from-primary/20 to-secondary/20 rounded-[2.5rem] blur-2xl opacity-50 group-hover:opacity-100 transition duration-1000" />

                    <div className="relative">
                        {children}
                    </div>
                </motion.div>
            </div>

            <div className="p-8 text-center text-[10px] font-black tracking-widest text-muted-foreground/30 uppercase relative z-10">
                &copy; 2026 Gaming Arena Security Protocol
            </div>
        </div>
    );
}
