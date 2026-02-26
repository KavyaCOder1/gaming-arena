"use client";

import { useEffect, useRef, useState, useCallback } from "react";

export function CustomScrollbar() {
  const trackRef = useRef<HTMLDivElement>(null);
  const thumbRef = useRef<HTMLDivElement>(null);
  const rafRef = useRef<number>(0);
  const isDragging = useRef(false);
  const dragStartY = useRef(0);
  const dragStartScroll = useRef(0);

  const [visible, setVisible] = useState(false);
  const [thumbHeight, setThumbHeight] = useState(40);
  const [thumbTop, setThumbTop] = useState(0);
  const [active, setActive] = useState(false);
  const hideTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  const compute = useCallback(() => {
    const doc = document.documentElement;
    const scrollable = doc.scrollHeight - doc.clientHeight;
    if (scrollable <= 0) { setVisible(false); return; }

    const trackH = window.innerHeight;
    const ratio = doc.clientHeight / doc.scrollHeight;
    const th = Math.max(40, Math.round(ratio * trackH));
    setThumbHeight(th);

    const scrolled = window.scrollY / scrollable;
    const maxTop = trackH - th;
    setThumbTop(Math.round(scrolled * maxTop));
  }, []);

  const showAndScheduleHide = useCallback(() => {
    setVisible(true);
    clearTimeout(hideTimer.current);
    hideTimer.current = setTimeout(() => {
      if (!isDragging.current) setVisible(false);
    }, 1500);
  }, []);

  const onScroll = useCallback(() => {
    cancelAnimationFrame(rafRef.current);
    rafRef.current = requestAnimationFrame(compute);
    if (!isDragging.current) showAndScheduleHide();
  }, [compute, showAndScheduleHide]);

  useEffect(() => {
    compute();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", compute);
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", compute);
      clearTimeout(hideTimer.current);
      cancelAnimationFrame(rafRef.current);
    };
  }, [compute, onScroll]);

  const onMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    isDragging.current = true;
    dragStartY.current = e.clientY;
    dragStartScroll.current = window.scrollY;
    setActive(true);
    setVisible(true);

    const onMove = (ev: MouseEvent) => {
      const delta = ev.clientY - dragStartY.current;
      const doc = document.documentElement;
      const scrollable = doc.scrollHeight - doc.clientHeight;
      const maxTop = window.innerHeight - thumbHeight;
      const scrollDelta = (delta / maxTop) * scrollable;
      window.scrollTo({ top: dragStartScroll.current + scrollDelta });
    };

    const onUp = () => {
      isDragging.current = false;
      setActive(false);
      showAndScheduleHide();
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    };

    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
  };

  const onTrackClick = (e: React.MouseEvent) => {
    if (thumbRef.current && thumbRef.current.contains(e.target as Node)) return;
    const trackRect = trackRef.current!.getBoundingClientRect();
    const clickY = e.clientY - trackRect.top;
    const doc = document.documentElement;
    const scrollable = doc.scrollHeight - doc.clientHeight;
    const ratio = clickY / window.innerHeight;
    window.scrollTo({ top: ratio * scrollable, behavior: "smooth" });
  };

  return (
    <>
      {/* Hide native scrollbar globally */}
      <style>{`
        html { overflow-y: scroll; scrollbar-width: none; }
        html::-webkit-scrollbar { display: none; }
        body { overflow-y: visible; }
      `}</style>

      {/* Track */}
      <div
        ref={trackRef}
        onClick={onTrackClick}
        style={{
          position: "fixed",
          top: 0,
          right: 0,
          width: 12,
          height: "100vh",
          zIndex: 9999,
          cursor: "pointer",
          background: "rgba(8, 12, 25, 0.9)",
          borderLeft: "1px solid rgba(34,211,238,0.06)",
          opacity: visible || active ? 1 : 0,
          transition: "opacity 0.5s ease",
          pointerEvents: visible || active ? "auto" : "none",
        }}
      >
        {/* Track center line */}
        <div style={{
          position: "absolute",
          left: "50%",
          top: "5%",
          bottom: "5%",
          width: 1,
          transform: "translateX(-50%)",
          background: "linear-gradient(180deg, transparent, rgba(99,102,241,0.2) 20%, rgba(34,211,238,0.15) 50%, rgba(99,102,241,0.2) 80%, transparent)",
          pointerEvents: "none",
        }} />

        {/* Thumb */}
        <div
          ref={thumbRef}
          onMouseDown={onMouseDown}
          onMouseEnter={() => { setActive(true); setVisible(true); clearTimeout(hideTimer.current); }}
          onMouseLeave={() => { if (!isDragging.current) { setActive(false); showAndScheduleHide(); } }}
          style={{
            position: "absolute",
            right: 2,
            left: 2,
            top: thumbTop,
            height: thumbHeight,
            borderRadius: 999,
            cursor: isDragging.current ? "grabbing" : "grab",
            userSelect: "none",
            background: active
              ? "linear-gradient(180deg, #67e8f9 0%, #818cf8 45%, #a78bfa 75%, #67e8f9 100%)"
              : "linear-gradient(180deg, #22d3ee 0%, #6366f1 55%, #22d3ee 100%)",
            boxShadow: active
              ? "0 0 20px rgba(34,211,238,1), 0 0 40px rgba(99,102,241,0.6), 0 0 60px rgba(34,211,238,0.2), inset 0 0 10px rgba(255,255,255,0.15)"
              : "0 0 10px rgba(34,211,238,0.6), 0 0 20px rgba(99,102,241,0.3)",
            transition: isDragging.current
              ? "none"
              : "background 0.25s ease, box-shadow 0.25s ease",
          }}
        >
          {/* Shine overlay */}
          <div style={{
            position: "absolute",
            top: 3,
            left: 2,
            right: 2,
            height: "45%",
            borderRadius: 999,
            background: "linear-gradient(180deg, rgba(255,255,255,0.35) 0%, transparent 100%)",
            pointerEvents: "none",
          }} />

          {/* Grip lines (only if tall enough) */}
          {thumbHeight > 55 && (
            <div style={{
              position: "absolute",
              top: "50%",
              left: "50%",
              transform: "translate(-50%, -50%)",
              display: "flex",
              flexDirection: "column",
              gap: 3,
              pointerEvents: "none",
            }}>
              {[0, 1, 2].map(i => (
                <div key={i} style={{
                  width: 5,
                  height: 1,
                  borderRadius: 1,
                  background: "rgba(255,255,255,0.55)",
                }} />
              ))}
            </div>
          )}
        </div>
      </div>
    </>
  );
}
