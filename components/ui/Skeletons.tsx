"use client";

// Pulse animation base
const pulse = {
  background: "linear-gradient(90deg, rgba(255,255,255,0.04) 0%, rgba(255,255,255,0.08) 50%, rgba(255,255,255,0.04) 100%)",
  backgroundSize: "200% 100%",
  animation: "skeletonPulse 1.6s ease-in-out infinite",
  borderRadius: 10,
};

const cardBase = {
  background: "rgba(15,23,42,0.75)",
  backdropFilter: "blur(16px)",
  border: "1px solid rgba(34,211,238,0.08)",
  borderRadius: 20,
  overflow: "hidden" as const,
};

// ── Single shimmer block ──────────────────────────────────────────────────────
export function SkeletonBlock({ height = 20, width = "100%", radius = 8, style = {} }: {
  height?: number; width?: number | string; radius?: number; style?: React.CSSProperties;
}) {
  return (
    <div style={{ ...pulse, height, width, borderRadius: radius, flexShrink: 0, ...style }} />
  );
}

// ── Dashboard main page skeleton ─────────────────────────────────────────────
export function DashboardSkeleton() {
  return (
    <div style={{ width: "100%" }}>
      {/* header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 28, gap: 16 }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <SkeletonBlock height={32} width={220} radius={10} />
          <SkeletonBlock height={12} width={160} radius={6} />
        </div>
        <SkeletonBlock height={36} width={120} radius={20} />
      </div>

      {/* stats grid */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 12, marginBottom: 20 }}>
        {[...Array(4)].map((_, i) => (
          <div key={i} style={{ ...cardBase, padding: 20, minHeight: 130 }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 16 }}>
              <SkeletonBlock height={10} width={80} radius={6} />
              <SkeletonBlock height={16} width={16} radius={4} />
            </div>
            <SkeletonBlock height={36} width={90} radius={8} />
          </div>
        ))}
      </div>

      {/* recent games 2-col grid */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
        {[...Array(4)].map((_, i) => (
          <div key={i} style={{ ...cardBase }}>
            <div style={{ padding: "16px 22px", borderBottom: "1px solid rgba(255,255,255,0.05)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <SkeletonBlock height={12} width={100} radius={6} />
              <SkeletonBlock height={24} width={60} radius={20} />
            </div>
            <div style={{ padding: 16, display: "flex", flexDirection: "column", gap: 10 }}>
              {[...Array(3)].map((_, j) => (
                <div key={j} style={{ display: "flex", gap: 12, alignItems: "center" }}>
                  <SkeletonBlock height={12} width={60} radius={6} />
                  <SkeletonBlock height={12} width={80} radius={6} />
                  <SkeletonBlock height={12} width={50} radius={6} />
                  <SkeletonBlock height={12} width={40} radius={6} />
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
      <Style />
    </div>
  );
}

// ── Games page skeleton ───────────────────────────────────────────────────────
export function GamesSkeleton() {
  return (
    <div style={{ width: "100%" }}>
      {/* header card */}
      <div style={{ ...cardBase, padding: "22px 28px", marginBottom: 20 }}>
        <SkeletonBlock height={14} width={130} radius={20} style={{ marginBottom: 14 }} />
        <SkeletonBlock height={36} width={280} radius={10} style={{ marginBottom: 12 }} />
        <SkeletonBlock height={14} width="70%" radius={6} style={{ marginBottom: 6 }} />
        <SkeletonBlock height={14} width="50%" radius={6} style={{ marginBottom: 18 }} />
        <div style={{ display: "flex", gap: 10 }}>
          {[130, 100, 130].map((w, i) => <SkeletonBlock key={i} height={28} width={w} radius={20} />)}
        </div>
      </div>

      {/* game cards grid */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 14 }}>
        {[...Array(6)].map((_, i) => (
          <div key={i} style={{ ...cardBase }}>
            <SkeletonBlock height={0} width="100%" radius={0} style={{ aspectRatio: "4/3", borderRadius: "18px 18px 0 0", height: "auto" }} />
            <div style={{ padding: "14px 16px 16px", display: "flex", flexDirection: "column", gap: 10 }}>
              <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                <SkeletonBlock height={32} width={32} radius={9} />
                <SkeletonBlock height={14} width={100} radius={6} />
              </div>
              <SkeletonBlock height={12} width="90%" radius={5} />
              <SkeletonBlock height={12} width="70%" radius={5} />
              <SkeletonBlock height={38} width="100%" radius={10} />
            </div>
          </div>
        ))}
      </div>
      <Style />
    </div>
  );
}

// ── Leaderboard page skeleton ─────────────────────────────────────────────────
export function LeaderboardSkeleton() {
  return (
    <div style={{ width: "100%" }}>
      {/* header */}
      <div style={{ marginBottom: 32 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
          <SkeletonBlock height={2} width={32} radius={1} />
          <SkeletonBlock height={10} width={120} radius={6} />
        </div>
        <SkeletonBlock height={34} width={260} radius={10} style={{ marginBottom: 8 }} />
        <SkeletonBlock height={13} width={320} radius={6} />
      </div>

      {/* tabs */}
      <div style={{ display: "flex", gap: 8, marginBottom: 22, flexWrap: "wrap" }}>
        {[100, 90, 80, 90, 70, 90, 130, 110].map((w, i) => (
          <SkeletonBlock key={i} height={38} width={w} radius={40} />
        ))}
      </div>

      {/* table card */}
      <div style={{ ...cardBase }}>
        <div style={{ padding: "14px 22px", borderBottom: "1px solid rgba(255,255,255,0.06)", display: "flex", justifyContent: "space-between" }}>
          <SkeletonBlock height={10} width={160} radius={6} />
          <SkeletonBlock height={10} width={70} radius={6} />
        </div>
        <div style={{ padding: 16, display: "flex", flexDirection: "column", gap: 10 }}>
          {[...Array(8)].map((_, i) => (
            <div key={i} style={{ display: "flex", alignItems: "center", gap: 16, padding: "6px 0" }}>
              <SkeletonBlock height={38} width={38} radius={11} />
              <SkeletonBlock height={38} width={38} radius={11} />
              <SkeletonBlock height={14} width={120} radius={6} />
              <div style={{ marginLeft: "auto" }}>
                <SkeletonBlock height={20} width={80} radius={6} />
              </div>
              <SkeletonBlock height={14} width={50} radius={6} />
            </div>
          ))}
        </div>
      </div>
      <Style />
    </div>
  );
}

// ── Profile page skeleton ─────────────────────────────────────────────────────
export function ProfileSkeleton() {
  return (
    <div style={{ width: "100%", maxWidth: 900 }}>
      {/* hero card */}
      <div style={{ ...cardBase, padding: "36px 32px", marginBottom: 24 }}>
        <div style={{ display: "flex", gap: 28, alignItems: "center", flexWrap: "wrap" }}>
          <SkeletonBlock height={110} width={110} radius={28} />
          <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 12 }}>
            <SkeletonBlock height={36} width={220} radius={10} />
            <SkeletonBlock height={8} width="80%" radius={4} />
            <div style={{ display: "flex", gap: 10 }}>
              <SkeletonBlock height={32} width={100} radius={10} />
              <SkeletonBlock height={32} width={160} radius={10} />
            </div>
          </div>
          <SkeletonBlock height={42} width={110} radius={14} />
        </div>
      </div>

      {/* stat pills */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(180px,1fr))", gap: 14, marginBottom: 28 }}>
        {[...Array(4)].map((_, i) => (
          <div key={i} style={{ ...cardBase, padding: "20px 22px", display: "flex", alignItems: "center", gap: 16 }}>
            <SkeletonBlock height={46} width={46} radius={14} />
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              <SkeletonBlock height={9} width={80} radius={5} />
              <SkeletonBlock height={22} width={60} radius={6} />
            </div>
          </div>
        ))}
      </div>

      {/* rank progression */}
      <div>
        <SkeletonBlock height={16} width={180} radius={8} style={{ marginBottom: 20 }} />
        <div style={{ display: "flex", gap: 8 }}>
          {[...Array(4)].map((_, i) => (
            <div key={i} style={{ ...cardBase, flex: 1, minHeight: 200, padding: 16 }}>
              <SkeletonBlock height={60} width={60} radius={30} style={{ margin: "0 auto 14px" }} />
              <SkeletonBlock height={14} width="70%" radius={6} style={{ margin: "0 auto 8px" }} />
              <SkeletonBlock height={10} width="50%" radius={5} style={{ margin: "0 auto" }} />
            </div>
          ))}
        </div>
      </div>
      <Style />
    </div>
  );
}

function Style() {
  return (
    <style>{`
      @keyframes skeletonPulse {
        0%   { background-position:  200% 0; }
        100% { background-position: -200% 0; }
      }
    `}</style>
  );
}
