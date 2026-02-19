"use client";

import { useTheme } from "next-themes";
import { useEffect, useState } from "react";
import { Moon, Sun } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

export function ThemeToggle() {
    const { theme, setTheme } = useTheme();
    const [mounted, setMounted] = useState(false);

    useEffect(() => { setMounted(true); }, []);
    if (!mounted) return null;

    return (
        <motion.button
            onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
            whileHover={{ scale: 1.08 }}
            whileTap={{ scale: 0.92 }}
            aria-label="Toggle Theme"
            style={{
                position: "relative",
                padding: 10,
                borderRadius: 12,
                background: "rgba(15,23,42,0.7)",
                border: "1px solid rgba(34,211,238,0.18)",
                cursor: "pointer",
                overflow: "hidden",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                backdropFilter: "blur(12px)",
                WebkitBackdropFilter: "blur(12px)",
                transition: "border-color 0.2s, box-shadow 0.2s",
            }}
            onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = "rgba(34,211,238,0.4)"; (e.currentTarget as HTMLElement).style.boxShadow = "0 0 14px rgba(34,211,238,0.18)"; }}
            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = "rgba(34,211,238,0.18)"; (e.currentTarget as HTMLElement).style.boxShadow = "none"; }}
        >
            <AnimatePresence mode="wait">
                {theme === "dark" ? (
                    <motion.div key="sun" initial={{ y: 16, opacity: 0, rotate: 45 }} animate={{ y: 0, opacity: 1, rotate: 0 }} exit={{ y: -16, opacity: 0, rotate: -45 }} transition={{ duration: 0.18 }}>
                        <Sun style={{ width: 18, height: 18, color: "#f59e0b", filter: "drop-shadow(0 0 6px rgba(245,158,11,0.6))" }} />
                    </motion.div>
                ) : (
                    <motion.div key="moon" initial={{ y: 16, opacity: 0, rotate: 45 }} animate={{ y: 0, opacity: 1, rotate: 0 }} exit={{ y: -16, opacity: 0, rotate: -45 }} transition={{ duration: 0.18 }}>
                        <Moon style={{ width: 18, height: 18, color: "#6366f1", filter: "drop-shadow(0 0 6px rgba(99,102,241,0.6))" }} />
                    </motion.div>
                )}
            </AnimatePresence>
        </motion.button>
    );
}
