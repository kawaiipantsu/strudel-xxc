import { useEffect, useRef } from "react";

// Hexagonal particle trails inspired by towc's https://codepen.io/towc/pen/mJzOWJ.
// Original bounded renderer for a transparent header: no external scripts or full-screen repaint.
export function HeaderParticles({
  reduced,
  quality,
  intensity,
}: {
  reduced: boolean;
  quality: string;
  intensity: number;
}) {
  const canvas = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const element = canvas.current;
    const context = element?.getContext("2d");
    if (!element || !context) return;
    const motion = matchMedia("(prefers-reduced-motion: reduce)");
    let width = 1,
      height = 1,
      frame = 0,
      last = 0,
      accent = "#ff354b";
    type Particle = {
      x: number;
      y: number;
      direction: number;
      progress: number;
      speed: number;
      age: number;
    };
    const particles: Particle[] = [];
    const size = 13;
    const reset = (p: Particle) => {
      p.x = width * (0.18 + Math.random() * 0.64);
      p.y = height / 2;
      p.direction = Math.floor(Math.random() * 6);
      p.progress = 0;
      p.speed = 0.018 + Math.random() * 0.022;
      p.age = 0;
    };
    const resize = () => {
      const box = element.getBoundingClientRect();
      width = box.width;
      height = box.height;
      const ratio = Math.min(
        window.devicePixelRatio || 1,
        quality === "low" ? 1 : 1.5,
      );
      element.width = Math.max(1, Math.round(width * ratio));
      element.height = Math.max(1, Math.round(height * ratio));
      context.setTransform(ratio, 0, 0, ratio, 0, 0);
      accent =
        getComputedStyle(element).getPropertyValue("--accent").trim() ||
        "#ff354b";
      particles.length = 0;
      const count = Math.min(
        quality === "low" ? 18 : 34,
        Math.max(8, Math.floor(width / 32)),
      );
      for (let i = 0; i < count; i++) {
        const p = {} as Particle;
        reset(p);
        particles.push(p);
      }
    };
    const step = () => {
      context.globalCompositeOperation = "destination-out";
      context.fillStyle = "rgba(0,0,0,.06)";
      context.fillRect(0, 0, width, height);
      context.globalCompositeOperation = "source-over";
      context.strokeStyle = accent;
      context.fillStyle = accent;
      context.lineWidth = 0.8;
      for (const p of particles) {
        const angle = (p.direction * Math.PI) / 3;
        const before = Math.sin((p.progress * Math.PI) / 2);
        p.progress = Math.min(1, p.progress + p.speed);
        const after = Math.sin((p.progress * Math.PI) / 2);
        context.globalAlpha = 0.45 + 0.35 * Math.sin(p.age * 0.15) ** 2;
        context.beginPath();
        context.moveTo(
          p.x + Math.cos(angle) * size * before,
          p.y + Math.sin(angle) * size * before,
        );
        const x = p.x + Math.cos(angle) * size * after;
        const y = p.y + Math.sin(angle) * size * after;
        context.lineTo(x, y);
        context.stroke();
        context.fillRect(x - 0.6, y - 0.6, 1.2, 1.2);
        p.age++;
        if (p.progress >= 1) {
          p.x = x;
          p.y = y;
          p.progress = 0;
          p.direction = (p.direction + (Math.random() < 0.5 ? 1 : 5)) % 6;
          if (
            p.x < 0 ||
            p.x > width ||
            p.y < -size ||
            p.y > height + size ||
            p.age > 700
          )
            reset(p);
        }
      }
      context.globalAlpha = 1;
    };
    const animate = (now: number) => {
      if (now - last >= (quality === "low" ? 65 : 33)) {
        step();
        last = now;
      }
      frame = requestAnimationFrame(animate);
    };
    const refresh = () => {
      cancelAnimationFrame(frame);
      frame = 0;
      if (document.hidden || intensity <= 0) return;
      if (reduced || motion.matches) {
        context.clearRect(0, 0, width, height);
        // One static trace retains the identity without motion.
        for (let i = 0; i < 60; i++) step();
      } else {
        last = 0;
        frame = requestAnimationFrame(animate);
      }
    };
    const observer = new ResizeObserver(() => {
      resize();
      refresh();
    });
    observer.observe(element);
    document.addEventListener("visibilitychange", refresh);
    motion.addEventListener("change", refresh);
    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
      document.removeEventListener("visibilitychange", refresh);
      motion.removeEventListener("change", refresh);
    };
  }, [reduced, quality, intensity]);
  return (
    <canvas
      ref={canvas}
      className="header-particles"
      aria-hidden="true"
      style={{
        opacity: intensity <= 0 ? 0 : Math.min(0.42, 0.16 + intensity * 0.45),
      }}
    />
  );
}
