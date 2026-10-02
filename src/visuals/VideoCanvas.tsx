import { useEffect, useRef, type MutableRefObject } from "react";
import type { Signal } from "../app/types";
import { VideoDirector } from "./video-model.mjs";
import { VideoRenderer, type VideoConfig } from "./video-renderer";
import { VJPlayback, type ClipInfo } from "./VJPlayback";

export type VideoStats = {
  clip?: string;
  clipTitle?: string;
  videoError?: string;
  scene: string;
  shot: number;
  energy: number;
  bass: number;
  mid: number;
  high: number;
  active: boolean;
  fps: number;
};
export function VideoCanvas({
  signal,
  director,
  config,
  quality,
  reduced,
  title,
  tokens,
  background = false,
  onStats,
}: {
  signal: MutableRefObject<Signal>;
  director: MutableRefObject<VideoDirector>;
  config: VideoConfig;
  quality: string;
  reduced: boolean;
  title: string;
  tokens: string[];
  background?: boolean;
  onStats?: (stats: VideoStats) => void;
}) {
  const ref = useRef<HTMLCanvasElement>(null);
  const clipInfo = useRef<ClipInfo>({});
  const props = useRef({ config, reduced, title, tokens, onStats });
  props.current = { config, reduced, title, tokens, onStats };
  useEffect(() => {
    const canvas = ref.current!,
      ctx = canvas.getContext("2d", { alpha: true });
    if (!ctx) return;
    const renderer = new VideoRenderer();
    const motion = matchMedia("(prefers-reduced-motion: reduce)");
    let raf = 0,
      last = 0,
      report = 0,
      frames = 0,
      slow = 0,
      visible = true;
    let frozen: Signal | undefined;
    const resize = () => {
      const { width, height } = canvas.getBoundingClientRect();
      const pixels = background
        ? 600000
        : quality === "high"
          ? 2073600
          : quality === "low"
            ? 360000
            : 1000000;
      const ratio = Math.min(
        devicePixelRatio || 1,
        1.5,
        Math.sqrt(pixels / Math.max(1, width * height)),
      );
      canvas.width = Math.max(1, Math.round(width * ratio));
      canvas.height = Math.max(1, Math.round(height * ratio));
    };
    const draw = (now: number) => {
      if (document.hidden || !visible) {
        raf = 0;
        return;
      }
      const p = props.current;
      const reducedMotion = p.reduced || motion.matches;
      const interval =
        reducedMotion || p.config.paused
          ? 250
          : background
            ? 66
            : quality === "low" || slow > 10
              ? 66
              : quality === "high"
                ? 16
                : 33;
      if (now - last >= interval && canvas.width > 1 && canvas.height > 1) {
        last = now;
        const started = performance.now();
        if (p.config.paused) frozen ||= structuredClone(signal.current);
        else frozen = undefined;
        const input = frozen || signal.current;
        const state = director.current.update(
          input,
          p.config,
          now,
          reducedMotion,
        );
        renderer.draw(
          ctx,
          canvas.width,
          canvas.height,
          state,
          p.config,
          input,
          background || quality === "low" || slow > 10
            ? 0.45
            : quality === "high"
              ? 1
              : 0.75,
          p.title,
          p.tokens,
          background,
        );
        const cost = performance.now() - started;
        slow = cost > 20 ? Math.min(30, slow + 1) : Math.max(0, slow - 0.1);
        frames++;
        if (now - report > 500) {
          const fps = Math.round((frames * 1000) / Math.max(1, now - report));
          canvas.dataset.scene = state.scene;
          canvas.dataset.source = p.config.source;
          canvas.dataset.shot = String(
            p.config.source === "vj" ? state.vjShot : state.shot,
          );
          canvas.dataset.energy = state.energy.toFixed(4);
          canvas.dataset.motion = reducedMotion
            ? "reduced"
            : p.config.paused
              ? "paused"
              : "live";
          p.onStats?.({
            clip: clipInfo.current.id,
            clipTitle: clipInfo.current.title,
            videoError: clipInfo.current.error,
            scene: state.scene,
            shot: p.config.source === "vj" ? state.vjShot : state.shot,
            energy: state.energy,
            bass: state.bass,
            mid: state.mid,
            high: state.high,
            active: state.active,
            fps,
          });
          frames = 0;
          report = now;
        }
      }
      raf = requestAnimationFrame(draw);
    };
    const resume = () => {
      if (!document.hidden && visible && !raf)
        raf = requestAnimationFrame(draw);
    };
    const visibility = () => {
      if (document.hidden) {
        cancelAnimationFrame(raf);
        raf = 0;
      } else {
        director.current.lastNow = 0;
        resume();
      }
    };
    const observer = new ResizeObserver(resize);
    observer.observe(canvas);
    const intersection = new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting;
      if (!visible) {
        cancelAnimationFrame(raf);
        raf = 0;
      } else resume();
    });
    intersection.observe(canvas);
    document.addEventListener("visibilitychange", visibility);
    resize();
    resume();
    return () => {
      cancelAnimationFrame(raf);
      observer.disconnect();
      intersection.disconnect();
      document.removeEventListener("visibilitychange", visibility);
    };
  }, [signal, director, quality, background]);
  return (
    <div className="music-video-surface">
      {config.source === "vj" && (
        <VJPlayback
          director={director}
          config={config}
          reduced={reduced}
          info={clipInfo}
        />
      )}
      <canvas
        ref={ref}
        className="music-video-canvas"
        aria-label={
          background ? "Music video background" : "Live music visualization"
        }
        role="img"
      />
    </div>
  );
}
