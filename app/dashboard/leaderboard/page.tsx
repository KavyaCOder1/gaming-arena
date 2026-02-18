"use client";

import { useState, useEffect } from "react";
import { LeaderboardTable } from "@/components/leaderboard/LeaderboardTable";
import { LeaderboardWithUser } from "@/types";
import { Trophy, Medal, Crown, Timer, Zap } from "lucide-react";
import { motion } from "framer-motion";

export default function LeaderboardPage() {
    const [activeTab, setActiveTab] = useState("ALL");
    const [data, setData] = useState<LeaderboardWithUser[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const fetchLeaderboard = async () => {
            setIsLoading(true);
            try {
                const query = activeTab !== "ALL" ? `?gameType=${activeTab}` : "";
                const res = await fetch(`/api/leaderboard${query}`);
                const data = await res.json();
                if (data.success) {
                    setData(data.data);
                }
            } catch (error) {
                console.error("Failed to fetch leaderboard", error);
            } finally {
                setIsLoading(false);
            }
        };

        fetchLeaderboard();
    }, [activeTab]);

    const tabs = [
        { id: "ALL", label: "All Games", icon: Trophy },
        { id: "WORD_SEARCH", label: "Word Search", icon: Zap },
        { id: "TIC_TAC_TOE", label: "Tic Tac Toe", icon: Crown },
        { id: "MEMORY", label: "Memory", icon: Timer },
        { id: "PACMAN", label: "Pacman", icon: Medal },
    ];

    return (
        <div className="space-y-6">
            <div className="flex flex-col gap-2">
                <h1 className="text-3xl font-bold font-mono text-primary flex items-center gap-3">
                    <Trophy className="w-8 h-8 text-yellow-500" />
                    GLOBAL RANKINGS
                </h1>
                <p className="text-muted-foreground">See who rules the arena. Can you reach the top?</p>
            </div>

            <div className="flex flex-wrap gap-2 pb-4 border-b border-white/5">
                {tabs.map((tab) => {
                    const Icon = tab.icon;
                    return (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id)}
                            className={`
                flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-all
                ${activeTab === tab.id
                                    ? "bg-primary text-primary-foreground shadow-[0_0_15px_theme(colors.primary.DEFAULT)]"
                                    : "bg-white/5 hover:bg-white/10 text-muted-foreground hover:text-foreground"}
              `}
                        >
                            <Icon className="w-4 h-4" />
                            {tab.label}
                        </button>
                    );
                })}
            </div>

            {isLoading ? (
                <div className="space-y-4">
                    {[...Array(5)].map((_, i) => (
                        <div key={i} className="h-16 w-full glass rounded-xl animate-pulse bg-white/5" />
                    ))}
                </div>
            ) : (
                <LeaderboardTable entries={data} gameType={activeTab !== "ALL" ? activeTab : undefined} />
            )}
        </div>
    );
}
