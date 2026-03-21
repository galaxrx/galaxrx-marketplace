"use client";

import { useCallback, useEffect, useRef, useState, type PointerEvent as ReactPointerEvent, type ReactNode } from "react";

const STORAGE_KEY = "galaxrx-sidebar-width-px";
const DEFAULT_WIDTH = 224; // matches previous w-56
const MIN_WIDTH = 200;
const MAX_WIDTH = 440;

function readStoredWidth(): number | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const n = Number.parseInt(raw, 10);
    if (!Number.isFinite(n)) return null;
    return Math.min(MAX_WIDTH, Math.max(MIN_WIDTH, n));
  } catch {
    return null;
  }
}

function SidebarResizeGrip({
  width,
  onWidthChange,
  onResizeEnd,
}: {
  width: number;
  onWidthChange: (width: number) => void;
  onResizeEnd: () => void;
}) {
  const dragging = useRef(false);

  const cleanup = useCallback(() => {
    if (!dragging.current) return;
    dragging.current = false;
    document.body.style.removeProperty("cursor");
    document.body.style.removeProperty("user-select");
    onResizeEnd();
  }, [onResizeEnd]);

  const onPointerDown = (e: ReactPointerEvent<HTMLDivElement>) => {
    e.preventDefault();
    if (dragging.current) return;
    dragging.current = true;
    document.body.style.cursor = "col-resize";
    document.body.style.userSelect = "none";
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);

    const onMove = (ev: PointerEvent) => {
      if (!dragging.current) return;
      const next = Math.min(MAX_WIDTH, Math.max(MIN_WIDTH, ev.clientX));
      onWidthChange(next);
    };

    const onUp = () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      window.removeEventListener("pointercancel", onUp);
      try {
        (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId);
      } catch {
        /* ignore */
      }
      cleanup();
    };

    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    window.addEventListener("pointercancel", onUp);

    onWidthChange(Math.min(MAX_WIDTH, Math.max(MIN_WIDTH, e.clientX)));
  };

  return (
    <div
      role="separator"
      aria-orientation="vertical"
      aria-valuemin={MIN_WIDTH}
      aria-valuemax={MAX_WIDTH}
      aria-valuenow={Math.round(width)}
      aria-label="Drag to resize sidebar"
      onPointerDown={onPointerDown}
      className="group absolute right-0 top-0 z-20 flex h-full w-3 translate-x-1/2 cursor-col-resize touch-none select-none items-center justify-center"
    >
      <span className="h-12 w-px rounded-full bg-white/25 transition-colors group-hover:bg-gold/70 group-active:bg-gold" />
    </div>
  );
}

type Props = {
  sidebar: ReactNode;
  children: ReactNode;
};

export default function DashboardSidebarShell({ sidebar, children }: Props) {
  const [width, setWidth] = useState(DEFAULT_WIDTH);
  const widthRef = useRef(DEFAULT_WIDTH);

  useEffect(() => {
    widthRef.current = width;
  }, [width]);

  useEffect(() => {
    const stored = readStoredWidth();
    if (stored != null) {
      setWidth(stored);
      widthRef.current = stored;
    }
  }, []);

  const applyWidth = useCallback((w: number) => {
    widthRef.current = w;
    setWidth(w);
  }, []);

  const commitWidth = useCallback(() => {
    try {
      localStorage.setItem(STORAGE_KEY, String(widthRef.current));
    } catch {
      /* ignore */
    }
  }, []);

  return (
    <div
      className="app-theme-inner min-h-screen flex flex-col"
      style={
        {
          "--dashboard-sidebar-width": `${width}px`,
        } as React.CSSProperties
      }
    >
      <aside className="app-nav relative hidden w-[var(--dashboard-sidebar-width)] shrink-0 flex-col border-r border-white/10 md:fixed md:left-0 md:top-0 md:z-30 md:flex md:h-screen md:min-h-0">
        {sidebar}
        <SidebarResizeGrip width={width} onWidthChange={applyWidth} onResizeEnd={commitWidth} />
      </aside>
      {children}
    </div>
  );
}
