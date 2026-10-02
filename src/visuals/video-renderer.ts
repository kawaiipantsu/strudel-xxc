import type { Signal } from "../app/types";
import {
  palettes,
  type VideoDirector,
  type sanitizeVideo,
} from "./video-model.mjs";
export type VideoConfig = ReturnType<typeof sanitizeVideo>;
type Point = { x: number; y: number; z: number; a: number };
const TAU = Math.PI * 2;

/** Original scene renderers. Reference studies and artist credits: docs/VISUALIZER.md. */
export class VideoRenderer {
  points: Point[] = [];
  constructor() {
    let seed = 8217;
    const random = () => {
      seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
      return seed / 4294967296;
    };
    for (let i = 0; i < 1800; i++)
      this.points.push({
        x: random(),
        y: random(),
        z: random(),
        a: random() * TAU,
      });
  }
  draw(
    ctx: CanvasRenderingContext2D,
    w: number,
    h: number,
    d: VideoDirector,
    config: VideoConfig,
    signal: Signal,
    detail: number,
    title: string,
    tokens: string[],
    background = false,
  ) {
    const palette =
      palettes[config.palette as keyof typeof palettes] || palettes.red;
    const color = (n: number, light = 60, alpha = 1) =>
      `hsla(${palette.hues[Math.abs(Math.floor(n)) % 3]} ${palette.saturation}% ${light}% / ${alpha})`;
    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = "source-over";
    if (config.source === "vj") ctx.clearRect(0, 0, w, h);
    else {
      ctx.fillStyle = "#05060c";
      ctx.fillRect(0, 0, w, h);
      const glow = ctx.createRadialGradient(
        w * 0.5,
        h * 0.48,
        0,
        w * 0.5,
        h * 0.48,
        Math.max(w, h) * 0.65,
      );
      glow.addColorStop(0, color(0, 12 + d.energy * 5, 0.55));
      glow.addColorStop(1, "#05060c");
      ctx.fillStyle = glow;
      ctx.fillRect(0, 0, w, h);
    }
    const size = Math.min(w, h),
      t = d.time,
      energy = d.energy;
    // Reduced motion holds geometry, while steady color/level changes remain readable.
    const phase = d.reduced || config.paused ? t : d.phase;
    const pulse = d.reduced || config.paused ? 0 : d.pulse;
    const path = (pts: number[][]) => {
      ctx.beginPath();
      pts.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
      ctx.stroke();
    };
    const dot = (x: number, y: number, r: number) => {
      ctx.beginPath();
      ctx.arc(x, y, Math.max(0.3, r), 0, TAU);
      ctx.fill();
    };
    const render = (scene: string, opacity: number) => {
      if (opacity <= 0) return;
      ctx.save();
      ctx.globalAlpha = opacity;
      ctx.globalCompositeOperation = "screen";
      ctx.lineWidth = Math.max(0.6, size / 850);
      if (scene === "nebula") {
        const count = Math.floor(1600 * detail);
        for (let i = 0; i < count; i++) {
          const p = this.points[i],
            a = p.a + t * 0.15 + p.z * 3;
          const frequency = (signal.fft?.[Math.floor(p.x * 100)] || 0) / 255;
          const r =
            size * (0.16 + p.x * 0.28 + frequency * 0.04 + energy * 0.08);
          const longitude = p.y * TAU + t * 0.09;
          const px = Math.cos(a) * r * (1 + Math.sin(longitude * 3 + t) * 0.12);
          const py = Math.sin(a) * r * Math.cos(longitude);
          const depth = Math.sin(longitude) * Math.sin(a);
          ctx.fillStyle = color(
            p.z * 3,
            55 + frequency * 25,
            0.22 + (depth + 1) * 0.34,
          );
          dot(
            w / 2 + px,
            h / 2 + py * 0.82,
            (0.5 + (depth + 1) * 0.55 + pulse * 0.35) *
              Math.max(0.6, size / 650),
          );
        }
      } else if (scene === "liquid") {
        const count = Math.round(8 + 7 * detail);
        for (let i = 0; i < count; i++) {
          const p = this.points[i],
            x = w * (0.5 + Math.sin(t * 0.13 + p.a) * 0.42);
          const y = h * (0.5 + Math.cos(t * 0.17 + p.z * 12) * 0.38);
          const radius = size * (0.14 + p.x * 0.25 + d.bass * 0.13);
          const g = ctx.createRadialGradient(x, y, 0, x, y, radius);
          g.addColorStop(0, color(i, 66, 0.3 + energy * 0.18));
          g.addColorStop(0.35, color(i + 1, 46, 0.18));
          g.addColorStop(1, color(i, 20, 0));
          ctx.fillStyle = g;
          ctx.fillRect(x - radius, y - radius, radius * 2, radius * 2);
        }
      } else if (scene === "sparks") {
        for (let i = 0; i < 600 * detail; i++) {
          const p = this.points[i],
            life = (p.x + t * (0.2 + p.z * 0.14)) % 1;
          const a = p.a + Math.sin(t * 0.2 + p.y * 10) * 0.2;
          const r = size * life * (0.2 + p.z * 0.55) * (1 + d.bass * 0.3);
          const x = w / 2 + Math.cos(a) * r,
            y = h / 2 + Math.sin(a) * r * 0.68;
          ctx.strokeStyle = color(
            i,
            60 + pulse * 15,
            (1 - life) * (0.4 + energy * 0.6),
          );
          path([
            [
              x - Math.cos(a) * (3 + energy * 22),
              y - Math.sin(a) * (3 + energy * 15),
            ],
            [x, y],
          ]);
        }
      } else if (scene === "garden") {
        const count = Math.floor(32 + 40 * detail);
        for (let i = 0; i < count; i++) {
          const p = this.points[i],
            root = (i / count) * w;
          const length = h * (0.25 + p.x * 0.55 + d.mid * 0.15);
          ctx.strokeStyle = color(i, 35 + p.y * 35, 0.38 + p.z * 0.5);
          ctx.lineWidth = (0.6 + p.z * 1.9) * Math.max(0.5, size / 600);
          ctx.beginPath();
          ctx.moveTo(root, h);
          for (let j = 1; j <= 30; j++) {
            const v = j / 30,
              sway = Math.sin(v * 3 + t * 0.4 + p.a) * v * v;
            const x = root + sway * size * (0.08 + d.bass * 0.1);
            const y = h - length * v;
            ctx.lineTo(x, y);
            if (j === 30) {
              ctx.stroke();
              ctx.fillStyle = color(i, 74, 0.8);
              dot(x, y, 1 + energy * 2);
            }
          }
        }
      } else if (scene === "spiral") {
        const count = Math.floor(600 * detail);
        for (let strand = 0; strand < 3; strand++) {
          ctx.strokeStyle = color(strand, 66, 0.65);
          ctx.beginPath();
          for (let i = 0; i < count; i++) {
            const v = i / count,
              a = v * TAU * 8 + t + strand * 2;
            const wave = signal.wave?.[Math.floor(v * 255)] || 0;
            const r = size * (0.025 + v * 0.43 + wave * 0.04 + d.bass * 0.03);
            const x = w / 2 + Math.cos(a) * r;
            const y = h / 2 + Math.sin(a) * r * 0.36 + (v - 0.5) * size * 0.55;
            i ? ctx.lineTo(x, y) : ctx.moveTo(x, y);
          }
          ctx.stroke();
        }
      } else if (scene === "ribbons") {
        const strands = Math.round(22 + 35 * detail);
        for (let i = 0; i < strands; i++) {
          ctx.strokeStyle = color(
            i / (strands / 3),
            56 + (i % 5) * 4,
            0.18 + d.mid * 0.32,
          );
          ctx.beginPath();
          for (let j = 0; j <= 90; j++) {
            const x = (j / 90) * w,
              v = j / 90;
            const y =
              h / 2 +
              Math.sin(v * 6 + t * 0.3 + i * 0.042) *
                h *
                (0.2 + d.bass * 0.12) +
              Math.cos(v * 12 - t * 0.2 + i * 0.1) * h * 0.09 +
              (i - strands / 2) * h * 0.006;
            j ? ctx.lineTo(x, y) : ctx.moveTo(x, y);
          }
          ctx.stroke();
        }
      } else if (scene === "ripple") {
        for (let i = 0; i < 12; i++) {
          const p = this.points[i],
            v = (t * 0.15 + i / 12) % 1;
          const x = w * (0.2 + p.x * 0.6),
            y = h * (0.2 + p.y * 0.6);
          ctx.strokeStyle = color(i, 58, (1 - v) * 0.8);
          ctx.fillStyle = color(i, 40, (1 - v) * 0.045);
          ctx.lineWidth = (1 + energy * 6) * Math.max(0.6, size / 800);
          ctx.beginPath();
          ctx.arc(x, y, Math.max(1, size * v * (0.45 + d.bass * 0.3)), 0, TAU);
          ctx.fill();
          ctx.stroke();
        }
      } else if (scene === "tunnel") {
        const sides = 8;
        for (let i = 0; i < 30; i++) {
          const z = (i / 30 + t * 0.06) % 1,
            r = (size * 0.025) / (0.06 + z);
          const rotation = t * 0.1 + z * (1.4 + d.mid * 2);
          ctx.strokeStyle = color(i / 10, 60, (1 - z) * 0.75);
          ctx.lineWidth = 1 + (1 - z) * energy * 1.5;
          ctx.beginPath();
          for (let j = 0; j <= sides; j++) {
            const a = (j / sides) * TAU + rotation;
            const x = w / 2 + Math.cos(a) * r * (1 + d.bass * 0.35),
              y = h / 2 + Math.sin(a) * r;
            j ? ctx.lineTo(x, y) : ctx.moveTo(x, y);
          }
          ctx.stroke();
        }
      } else if (scene === "terrain") {
        const rows = Math.round(15 + 18 * detail);
        for (let row = rows; row > 0; row--) {
          const depth = (row + ((t * 1.3) % 1)) / rows,
            perspective = 1 / (0.45 + depth * 3);
          ctx.strokeStyle = color(
            row / 9,
            52 + energy * 15,
            0.15 + (1 - depth) * 0.6,
          );
          ctx.beginPath();
          for (let col = 0; col <= 80; col++) {
            const v = col / 80,
              bin = Math.floor(v * 85),
              fft = (signal.fft?.[bin] || 0) / 255;
            const mountain =
              Math.sin(v * 11 + row * 0.3 + t * 0.2) * 0.035 + fft * 0.1;
            const x = w / 2 + (v - 0.5) * w * perspective * 1.5;
            const y =
              h * 0.42 +
              h * (1 - depth) ** 2 * 0.58 -
              mountain * h * perspective;
            col ? ctx.lineTo(x, y) : ctx.moveTo(x, y);
          }
          ctx.stroke();
        }
      }
      ctx.restore();
    };
    if (config.source !== "vj") {
      render(d.previous, 1 - d.transition);
      render(d.scene, d.transition);
    }
    ctx.save();
    ctx.globalCompositeOperation = "screen";
    ctx.globalAlpha = config.overlayOpacity;
    for (const overlay of config.overlays) {
      if (overlay === "scope") {
        ctx.strokeStyle = color(1, 82, 0.7);
        ctx.lineWidth = Math.max(1, size / 700);
        ctx.beginPath();
        for (let i = 0; i <= 256; i++) {
          const a = (i / 256) * TAU,
            wave = signal.wave?.[i % 256] || 0;
          const radius = size * (0.27 + wave * 0.08 + energy * 0.018);
          const x = w / 2 + Math.cos(a) * radius,
            y = h / 2 + Math.sin(a) * radius;
          i ? ctx.lineTo(x, y) : ctx.moveTo(x, y);
        }
        ctx.stroke();
      } else if (overlay === "spider") {
        const cx = w * (0.5 + Math.sin(t * 0.2) * 0.16),
          cy = h * (0.5 + Math.cos(t * 0.17) * 0.12);
        const radius = size * (0.24 + d.bass * 0.035);
        // Concentric silk, radial anchors, and eight articulated legs. No DOM physics loop.
        for (let ring = 1; ring <= 9; ring++) {
          ctx.strokeStyle = color(ring / 3, 65, 0.28);
          ctx.lineWidth = 0.7;
          ctx.beginPath();
          for (let spoke = 0; spoke <= 32; spoke++) {
            const a = (spoke / 32) * TAU,
              r =
                ((radius * ring) / 9) *
                (1 + Math.sin(a * 5 + t) * 0.055 * energy);
            const x = cx + Math.cos(a) * r,
              y = cy + Math.sin(a) * r;
            spoke ? ctx.lineTo(x, y) : ctx.moveTo(x, y);
          }
          ctx.stroke();
        }
        for (let leg = 0; leg < 8; leg++) {
          const a = (leg / 8) * TAU + 0.2,
            gait = Math.sin(phase * TAU + leg * Math.PI * 0.75) * 0.14;
          ctx.strokeStyle = color(leg / 3, 60, 0.3);
          path([
            [cx, cy],
            [cx + Math.cos(a) * radius, cy + Math.sin(a) * radius],
          ]);
          ctx.strokeStyle = color(leg / 3, 78, 0.95);
          ctx.lineWidth = Math.max(1, size / 500);
          path([
            [cx + Math.cos(a) * size * 0.014, cy + Math.sin(a) * size * 0.014],
            [
              cx + Math.cos(a + gait) * radius * 0.35,
              cy + Math.sin(a + gait) * radius * 0.35,
            ],
            [
              cx + Math.cos(a - 0.2) * radius * 0.53,
              cy + Math.sin(a - 0.2) * radius * 0.53,
            ],
          ]);
        }
        ctx.fillStyle = color(0, 84, 0.95);
        dot(cx, cy + size * 0.012, size * 0.015);
        dot(cx, cy - size * 0.01, size * 0.009);
      } else if (overlay === "sparks") {
        for (let i = 0; i < 160 * detail; i++) {
          const p = this.points[i],
            x = p.x * w,
            y = ((((p.y - t * 0.05 * (0.2 + p.z)) % 1) + 1) % 1) * h;
          ctx.fillStyle = color(i, 70, 0.15 + p.z * energy * 0.7);
          dot(x, y, 0.5 + p.z * 1.5 + pulse);
        }
      } else if (overlay === "code" && !background) {
        ctx.font = `${Math.max(10, Math.round(size / 45))}px "JetBrains Mono Variable", monospace`;
        for (let i = 0; i < Math.min(18, tokens.length); i++) {
          const p = this.points[i],
            x = w * (0.06 + p.x * 0.8),
            y = ((p.y + t * 0.025) % 1) * h;
          ctx.fillStyle = color(i, 75, 0.25 + d.high * 0.6);
          ctx.fillText(tokens[i], x, y);
        }
      }
    }
    ctx.restore();
    if (config.titles && !background) {
      const fontSize = Math.max(10, Math.round(size * 0.018));
      const shade = ctx.createLinearGradient(0, h * 0.72, 0, h);
      shade.addColorStop(0, "#05060c00");
      shade.addColorStop(1, "#05060cdd");
      ctx.fillStyle = shade;
      ctx.fillRect(0, h * 0.72, w, h * 0.28);
      ctx.font = `500 ${fontSize}px "JetBrains Mono Variable", monospace`;
      ctx.fillStyle = "#a0a7b9";
      if (h >= 300)
        ctx.fillText("XXC / THUGS(red)  ·  LIVE SESSION", w * 0.05, h * 0.87);
      ctx.font = `600 ${fontSize * 1.7}px "JetBrains Mono Variable", monospace`;
      ctx.fillStyle = "#f4f2fa";
      let text = title.slice(0, 90);
      while (text.length > 1 && ctx.measureText(text).width > w * 0.86)
        text = text.slice(0, -2);
      ctx.fillText(text, w * 0.05, h * 0.925);
    }
  }
}
