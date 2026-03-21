"use client";

import { useRef, useEffect } from "react";

const CYAN_HOT = "79, 195, 247";
const WHITE_HOT = "232, 244, 253";

const WAVE_SETS = [
  { yBase: 0.62, amplitude: 0.09, freq: 1.4, speed: 0.0000045, lineCount: 18, color: "#1a4a9e", alpha: 0.55, width: 0.7 },
  { yBase: 0.55, amplitude: 0.12, freq: 1.1, speed: 0.0000032, lineCount: 14, color: "#2060cc", alpha: 0.45, width: 0.6 },
  { yBase: 0.70, amplitude: 0.07, freq: 1.8, speed: 0.0000055, lineCount: 10, color: "#0d3b8c", alpha: 0.4, width: 0.5 },
  { yBase: 0.45, amplitude: 0.15, freq: 0.9, speed: 0.0000025, lineCount: 8, color: "#4fc3f7", alpha: 0.25, width: 0.4 },
  { yBase: 0.75, amplitude: 0.06, freq: 2.2, speed: 0.0000060, lineCount: 12, color: "#1a4a9e", alpha: 0.35, width: 0.5 },
];

const FLARES = [
  { x: 0.38, y: 0.38, r: 90, alpha: 0.55, pulse: 0, speed: 0.0008 },
  { x: 0.62, y: 0.55, r: 60, alpha: 0.35, pulse: 1.2, speed: 0.0011 },
  { x: 0.2, y: 0.6, r: 45, alpha: 0.3, pulse: 2.4, speed: 0.0009 },
  { x: 0.75, y: 0.3, r: 35, alpha: 0.25, pulse: 0.8, speed: 0.0013 },
  { x: 0.5, y: 0.72, r: 28, alpha: 0.2, pulse: 3.1, speed: 0.001 },
  { x: 0.85, y: 0.65, r: 22, alpha: 0.18, pulse: 1.7, speed: 0.0015 },
];

const PARTICLE_COUNT = 220;

function makeParticle() {
  return {
    x: Math.random(),
    y: Math.random(),
    r: Math.random() * 1.8 + 0.3,
    vx: (Math.random() - 0.5) * 0.00012,
    vy: (Math.random() - 0.5) * 0.0001,
    alpha: Math.random() * 0.7 + 0.15,
    pulse: Math.random() * Math.PI * 2,
    pulseSpeed: Math.random() * 0.012 + 0.004,
    color: Math.random() < 0.6 ? CYAN_HOT : WHITE_HOT,
  };
}

type HeroWallpaperProps = {
  className?: string;
  /** Calm static backdrop for product-focused pages; animated canvas when omitted or "animated". */
  variant?: "animated" | "calm";
};

export default function HeroWallpaper({ className = "", variant = "calm" }: HeroWallpaperProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (variant !== "animated") return;
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const context = ctx;

    const particles = Array.from({ length: PARTICLE_COUNT }, makeParticle);
    const flares = FLARES.map((f) => ({ ...f, pulse: f.pulse }));
    const bokeh = Array.from({ length: 18 }, () => ({
      x: Math.random(),
      y: Math.random(),
      r: Math.random() * 40 + 15,
      alpha: Math.random() * 0.04 + 0.01,
      speed: (Math.random() - 0.5) * 0.000008,
    }));

    function resize() {
      if (!canvas) return;
      const parent = canvas.parentElement;
      if (!parent) return;
      const dpr = Math.min(window.devicePixelRatio ?? 1, 2);
      const w = parent.clientWidth;
      const h = parent.clientHeight;
      canvas.width = w * dpr;
      canvas.height = h * dpr;
      canvas.style.width = `${w}px`;
      canvas.style.height = `${h}px`;
      context.setTransform(1, 0, 0, 1, 0, 0);
      context.scale(dpr, dpr);
    }

    function drawBackground(W: number, H: number) {
      context.fillStyle = "#020818";
      context.fillRect(0, 0, W, H);
      const gCenter = context.createRadialGradient(W * 0.42, H * 0.45, 0, W * 0.42, H * 0.45, W * 0.6);
      gCenter.addColorStop(0, "rgba(10, 42, 110, 0.70)");
      gCenter.addColorStop(0.4, "rgba(3, 18, 64, 0.50)");
      gCenter.addColorStop(1, "rgba(2, 8, 24, 0.0)");
      context.fillStyle = gCenter;
      context.fillRect(0, 0, W, H);
      const gBottom = context.createLinearGradient(0, H * 0.6, 0, H);
      gBottom.addColorStop(0, "rgba(8, 30, 90, 0.3)");
      gBottom.addColorStop(1, "rgba(2, 8, 24, 0.0)");
      context.fillStyle = gBottom;
      context.fillRect(0, 0, W, H);
    }

    function drawGrid(t: number, W: number, H: number) {
      const cellW = W / 28,
        cellH = H / 16;
      context.save();
      context.transform(1, 0.08, -0.05, 1, W * 0.02, -H * 0.04);
      context.strokeStyle = "rgba(30, 80, 180, 0.10)";
      context.lineWidth = 0.5;
      const offX = (t * 0.0012) % cellW;
      const offY = (t * 0.0008) % cellH;
      for (let x = -cellW + offX; x < W + cellW; x += cellW) {
        context.beginPath();
        context.moveTo(x, 0);
        context.lineTo(x, H);
        context.stroke();
      }
      for (let y = -cellH + offY; y < H + cellH; y += cellH) {
        context.beginPath();
        context.moveTo(0, y);
        context.lineTo(W, y);
        context.stroke();
      }
      context.restore();
    }

    function drawWaves(t: number, W: number, H: number) {
      WAVE_SETS.forEach((ws) => {
        const spacing = H * 0.012;
        for (let li = 0; li < ws.lineCount; li++) {
          const yOff = (li - ws.lineCount / 2) * spacing;
          context.beginPath();
          const STEPS = 200;
          for (let i = 0; i <= STEPS; i++) {
            const px = (i / STEPS) * W;
            const nx = i / STEPS;
            const wave =
              Math.sin(nx * Math.PI * 2 * ws.freq + t * ws.speed * 100) * ws.amplitude * H +
              Math.sin(nx * Math.PI * 2 * ws.freq * 1.7 + t * ws.speed * 70 + li * 0.3) * ws.amplitude * H * 0.35 +
              Math.sin(nx * Math.PI * 2 * ws.freq * 0.5 + t * ws.speed * 50) * ws.amplitude * H * 0.2;
            const py = ws.yBase * H + yOff + wave;
            i === 0 ? context.moveTo(px, py) : context.lineTo(px, py);
          }
          context.strokeStyle = ws.color;
          context.globalAlpha = ws.alpha * (0.6 + (0.4 * li) / ws.lineCount);
          context.lineWidth = ws.width;
          context.stroke();
        }
      });
      context.globalAlpha = 1;
    }

    function drawFlares(t: number, W: number, H: number) {
      flares.forEach((f) => {
        f.pulse += f.speed;
        const brightness = 0.7 + 0.3 * Math.sin(f.pulse);
        const r = f.r * (0.85 + 0.15 * Math.sin(f.pulse * 1.3));
        const cx = f.x * W,
          cy = f.y * H;
        const gOuter = context.createRadialGradient(cx, cy, 0, cx, cy, r * 3);
        gOuter.addColorStop(0, `rgba(100, 200, 255, ${0.08 * brightness * f.alpha})`);
        gOuter.addColorStop(0.4, `rgba(30, 100, 220, ${0.12 * brightness * f.alpha})`);
        gOuter.addColorStop(1, "rgba(0, 0, 0, 0)");
        context.fillStyle = gOuter;
        context.beginPath();
        context.arc(cx, cy, r * 3, 0, Math.PI * 2);
        context.fill();
        const gCore = context.createRadialGradient(cx, cy, 0, cx, cy, r * 0.8);
        gCore.addColorStop(0, `rgba(220, 240, 255, ${0.9 * brightness * f.alpha})`);
        gCore.addColorStop(0.3, `rgba(100, 190, 255, ${0.6 * brightness * f.alpha})`);
        gCore.addColorStop(1, "rgba(20, 80, 180, 0)");
        context.fillStyle = gCore;
        context.beginPath();
        context.arc(cx, cy, r * 0.8, 0, Math.PI * 2);
        context.fill();
        context.save();
        context.translate(cx, cy);
        context.rotate(f.pulse * 0.05);
        const rayAlpha = 0.12 * brightness * f.alpha;
        [0, Math.PI / 2, Math.PI / 4, (Math.PI * 3) / 4].forEach((angle) => {
          const len = r * 4;
          const gRay = context.createLinearGradient(
            0,
            0,
            Math.cos(angle) * len,
            Math.sin(angle) * len
          );
          gRay.addColorStop(0, `rgba(180, 225, 255, ${rayAlpha})`);
          gRay.addColorStop(1, "rgba(180, 225, 255, 0)");
          context.strokeStyle = gRay;
          context.lineWidth = 1;
          context.beginPath();
          context.moveTo(-Math.cos(angle) * len, -Math.sin(angle) * len);
          context.lineTo(Math.cos(angle) * len, Math.sin(angle) * len);
          context.stroke();
        });
        context.restore();
      });
    }

    function drawParticles(W: number, H: number) {
      particles.forEach((p) => {
        p.x += p.vx;
        p.y += p.vy;
        p.pulse += p.pulseSpeed;
        if (p.x < 0) p.x = 1;
        if (p.x > 1) p.x = 0;
        if (p.y < 0) p.y = 1;
        if (p.y > 1) p.y = 0;
        const pulse = 0.5 + 0.5 * Math.sin(p.pulse);
        const alpha = p.alpha * (0.5 + 0.5 * pulse);
        const r = p.r * (0.8 + 0.2 * pulse);
        const cx = p.x * W,
          cy = p.y * H;
        const g = context.createRadialGradient(cx, cy, 0, cx, cy, r * 3);
        g.addColorStop(0, `rgba(${p.color}, ${alpha})`);
        g.addColorStop(0.4, `rgba(${p.color}, ${alpha * 0.4})`);
        g.addColorStop(1, "rgba(0,0,0,0)");
        context.fillStyle = g;
        context.beginPath();
        context.arc(cx, cy, r * 3, 0, Math.PI * 2);
        context.fill();
        context.fillStyle = `rgba(255, 255, 255, ${alpha * 0.9})`;
        context.beginPath();
        context.arc(cx, cy, r * 0.5, 0, Math.PI * 2);
        context.fill();
      });
    }

    function drawBokeh(W: number, H: number) {
      bokeh.forEach((b) => {
        b.x += b.speed;
        b.y += b.speed * 0.5;
        if (b.x > 1.1) b.x = -0.1;
        if (b.x < -0.1) b.x = 1.1;
        const g = context.createRadialGradient(b.x * W, b.y * H, 0, b.x * W, b.y * H, b.r);
        g.addColorStop(0, `rgba(60, 130, 255, ${b.alpha * 2})`);
        g.addColorStop(0.5, `rgba(30, 80, 200, ${b.alpha})`);
        g.addColorStop(1, "rgba(0,0,0,0)");
        context.fillStyle = g;
        context.beginPath();
        context.arc(b.x * W, b.y * H, b.r, 0, Math.PI * 2);
        context.fill();
      });
    }

    let rafId: number;
    function draw(ts: number) {
      if (!canvas) return;
      const parent = canvas.parentElement;
      const W = parent ? parent.clientWidth : 0;
      const H = parent ? parent.clientHeight : 0;
      if (W === 0 || H === 0) {
        rafId = requestAnimationFrame(draw);
        return;
      }
      context.clearRect(0, 0, W, H);
      drawBackground(W, H);
      drawGrid(ts, W, H);
      drawBokeh(W, H);
      drawWaves(ts, W, H);
      drawFlares(ts, W, H);
      drawParticles(W, H);
      const vig = context.createRadialGradient(W / 2, H / 2, H * 0.2, W / 2, H / 2, H * 0.85);
      vig.addColorStop(0, "rgba(0,0,0,0)");
      vig.addColorStop(1, "rgba(1, 5, 18, 0.72)");
      context.fillStyle = vig;
      context.fillRect(0, 0, W, H);
      rafId = requestAnimationFrame(draw);
    }

    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(canvas.parentElement!);
    rafId = requestAnimationFrame(draw);
    return () => {
      cancelAnimationFrame(rafId);
      ro.disconnect();
    };
  }, [variant]);

  if (variant === "calm") {
    return (
      <div
        className={`absolute inset-0 ${className}`}
        aria-hidden
        style={{
          backgroundImage:
            "linear-gradient(165deg, #070f18 0%, #0c1828 42%, #0a1522 100%), radial-gradient(ellipse 90% 70% at 70% -10%, rgba(30, 58, 95, 0.35) 0%, transparent 55%)",
        }}
      />
    );
  }

  return (
    <canvas
      ref={canvasRef}
      className={`absolute inset-0 w-full h-full block ${className}`}
      aria-hidden
    />
  );
}
