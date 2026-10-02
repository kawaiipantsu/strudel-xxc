import { useEffect, useRef, type MutableRefObject } from "react";
import { midiNote } from "./notes";
import type { Signal } from "../app/types";
export function SignalCanvas({
  signal,
  mode = "scope",
  background = false,
  intensity = 0.3,
  quality = "auto",
  reduced = false,
}: {
  signal: MutableRefObject<Signal>;
  mode?: string;
  background?: boolean;
  intensity?: number;
  quality?: string;
  reduced?: boolean;
}) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const canvas = ref.current!;
    const ctx = canvas.getContext("2d")!;
    const history = document.createElement("canvas");
    const historyContext = history.getContext("2d")!;
    let raf = 0,
      last = 0,
      slow = 0;
    const observer = new ResizeObserver(() => {
      const r = canvas.getBoundingClientRect();
      const dpr = Math.min(devicePixelRatio, quality === "low" ? 1 : 1.5);
      canvas.width = r.width * dpr;
      canvas.height = r.height * dpr;
      history.width = canvas.width;
      history.height = canvas.height;
    });
    observer.observe(canvas);
    const draw = (now: number) => {
      raf = requestAnimationFrame(draw);
      if (document.hidden || intensity === 0) return;
      const interval = reduced
        ? 250
        : quality === "low" || slow > 8
          ? 66
          : quality === "high"
            ? 16
            : 33;
      if (now - last < interval) return;
      const t = performance.now();
      last = now;
      const { width: w, height: h } = canvas,
        s = signal.current;
      if (!w || !h) return;
      const light = document.documentElement.dataset.theme === "light";
      const red = light ? "#c82538" : "#ff3b47",
        dim = light ? "#9ba2ac" : "#263342";
      ctx.clearRect(0, 0, w, h);
      ctx.globalAlpha = background ? intensity : 1;
      ctx.lineWidth = 1;
      ctx.strokeStyle = dim;
      for (let x = 0; x < w; x += w / 12) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, h);
        ctx.stroke();
      }
      for (let y = 0; y < h; y += h / 6) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(w, y);
        ctx.stroke();
      }
      ctx.strokeStyle = red;
      ctx.fillStyle = red;
      ctx.lineWidth = background ? 1.2 : 1.7;
      if (
        mode === "scope" ||
        mode === "waveform" ||
        mode === "phase" ||
        background
      ) {
        ctx.beginPath();
        for (let i = 0; i < 256; i++) {
          const x =
            mode === "phase"
              ? w / 2 + (s.stereoWave?.[0]?.[i] || 0) * w * 0.45
              : (i / 255) * w;
          const y =
            mode === "phase"
              ? h / 2 - (s.stereoWave?.[1]?.[i] || 0) * h * 0.45
              : h / 2 + (s.wave[i] || 0) * h * 0.7;
          i ? ctx.lineTo(x, y) : ctx.moveTo(x, y);
        }
        ctx.stroke();
        if (background) {
          for (let j = 1; j < 7; j++) {
            ctx.globalAlpha = intensity * 0.15;
            ctx.beginPath();
            for (let i = 0; i < 128; i++) {
              const x = (i / 127) * w,
                y =
                  h * 0.25 +
                  j * h * 0.065 +
                  Math.sin(i * 0.07 + j + (reduced ? 0 : s.phase)) *
                    (s.fft[i] || 0) *
                    0.3;
              i ? ctx.lineTo(x, y) : ctx.moveTo(x, y);
            }
            ctx.stroke();
          }
        }
      } else if (mode === "spectrogram") {
        historyContext.drawImage(history, -2, 0);
        const bins = s.fft.length || 128;
        for (let i = 0; i < bins; i++) {
          const energy = (s.fft[i] || 0) / 255;
          historyContext.fillStyle = `hsl(${350 - energy * 70} 80% ${4 + energy * 64}%)`;
          historyContext.fillRect(
            w - 2,
            h - ((i + 1) * h) / bins,
            2,
            Math.ceil(h / bins),
          );
        }
        ctx.drawImage(history, 0, 0);
      } else if (mode === "spectrum") {
        const n = 100;
        for (let i = 0; i < n; i++) {
          const v = (s.fft[i] || 0) / 255;
          ctx.fillStyle = i < 25 ? red : i < 60 ? "#a286ce" : "#5cabb8";
          ctx.globalAlpha = v * 0.8 + 0.2;
          ctx.fillRect((i * w) / n, h - h * v, w / n - 2, h * v);
        }
      } else if (
        ["pianoroll", "punchcard", "timeline", "orbits"].includes(mode)
      ) {
        const pitches = s.events
          .map((e) => midiNote(e.value.note))
          .filter((n): n is number => n !== null);
        const minNote = Math.min(48, ...pitches) - 1;
        const maxNote = Math.max(72, ...pitches) + 1;
        const drums = [
          ...new Set(s.events.map((e) => String(e.value.s || "event"))),
        ];
        for (const e of s.events) {
          const val = e.value;
          const note = midiNote(val.note);
          const x = ((e.begin - s.phase + 1) * w) / 2;
          let row: number, rows: number;
          if (mode === "pianoroll" && note !== null) {
            row = maxNote - note;
            rows = maxNote - minNote + 1;
          } else if (mode === "orbits" || mode === "timeline") {
            row = Number(val.orbit || 0) % 6;
            rows = 6;
          } else {
            row = drums.indexOf(String(val.s || "event"));
            rows = Math.max(4, drums.length);
          }
          const y = (row * h) / rows;
          const active = e.begin <= s.phase && e.end > s.phase;
          ctx.globalAlpha = active ? 1 : 0.35;
          ctx.fillStyle = Number(val.orbit || 0) % 2 ? "#6cb8c1" : red;
          if (mode === "punchcard") {
            ctx.beginPath();
            ctx.arc(x, y + h / rows / 2, active ? 5 : 3, 0, Math.PI * 2);
            ctx.fill();
          } else
            ctx.fillRect(
              x,
              y,
              Math.max(3, ((e.end - e.begin) * w) / 2),
              Math.max(3, h / rows - 2),
            );
        }
        ctx.globalAlpha = 0.7;
        ctx.fillStyle = light ? "#111" : "#fff";
        ctx.fillRect(w / 2, 0, 1, h);
      } else if (mode === "geometry") {
        const sides = 12,
          radius = Math.min(w, h) * 0.3;
        for (let ring = 0; ring < 3; ring++) {
          ctx.beginPath();
          for (let i = 0; i <= sides; i++) {
            const index = i % sides;
            const angle =
              (index / sides) * Math.PI * 2 + (reduced ? 0 : s.phase * 0.15);
            const r =
              radius * (0.4 + ring * 0.3) +
              ((s.fft[index * 8] || 0) / 255) * radius * 0.5;
            const x = w / 2 + Math.cos(angle) * r,
              y = h / 2 + Math.sin(angle) * r;
            i ? ctx.lineTo(x, y) : ctx.moveTo(x, y);
          }
          ctx.globalAlpha = 1 - ring * 0.2;
          ctx.stroke();
        }
      } else if (
        mode === "spiral" ||
        mode === "particles" ||
        mode === "geometry"
      ) {
        const cx = w / 2,
          cy = h / 2;
        ctx.beginPath();
        for (let i = 0; i < 500; i++) {
          const a = i * 0.045 + (reduced ? 0 : s.phase * 0.3),
            r = (i / 500) * Math.min(w, h) * 0.43 + (s.wave[i % 256] || 0) * 25;
          const x = cx + Math.cos(a) * r,
            y = cy + Math.sin(a) * r;
          i ? ctx.lineTo(x, y) : ctx.moveTo(x, y);
        }
        ctx.stroke();
        for (const e of s.events.filter(
          (e) => e.begin <= s.phase && e.end > s.phase,
        )) {
          const a = e.begin * 6.28,
            r = Math.min(w, h) * 0.32;
          ctx.fillRect(
            cx + Math.cos(a) * r - 3,
            cy + Math.sin(a) * r - 3,
            6,
            6,
          );
        }
      }
      ctx.globalAlpha = 1;
      if (performance.now() - t > 12) slow++;
      else slow = Math.max(0, slow - 1);
    };
    raf = requestAnimationFrame(draw);
    return () => {
      cancelAnimationFrame(raf);
      observer.disconnect();
    };
  }, [mode, background, intensity, quality, reduced]);
  return (
    <canvas
      ref={ref}
      className={background ? "reactive-background" : "signal-canvas"}
      aria-label={
        background
          ? "Audio-reactive background"
          : mode + " driven by live audio and pattern events"
      }
      role="img"
    />
  );
}
