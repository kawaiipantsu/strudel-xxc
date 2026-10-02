import { useEffect, useRef, type MutableRefObject } from "react";
import type { VideoDirector } from "./video-model.mjs";
import type { VideoConfig } from "./video-renderer";
import { useVJCatalogue, type VJClip } from "./vj-model";
import { sharedVJClip } from "./vj-random.mjs";
export type ClipInfo = { id?: string; title?: string; error?: string };

/** Two muted video layers: load the incoming clip, then crossfade and release the old decoder. */
export function VJPlayback({
  director,
  config,
  reduced,
  info,
}: {
  director: MutableRefObject<VideoDirector>;
  config: VideoConfig;
  reduced: boolean;
  info: MutableRefObject<ClipInfo>;
}) {
  const root = useRef<HTMLDivElement>(null);
  const { data, error } = useVJCatalogue();
  const current = useRef({ config, reduced });
  current.current = { config, reduced };
  useEffect(() => {
    if (error) info.current = { error };
  }, [error, info]);
  useEffect(() => {
    if (!data || !root.current) return;
    const node = root.current,
      videos = Array.from(node.querySelectorAll("video"));
    let active = -1,
      desired = "",
      visible = true,
      destroyed = false;
    let selection = "",
      shot = director.current.vjShot,
      oldUntil = 0,
      timer = 0;
    let clips: VJClip[] = [];
    const motion = matchMedia("(prefers-reduced-motion: reduce)");
    const mayPlay = () =>
      visible &&
      !document.hidden &&
      !current.current.reduced &&
      !motion.matches &&
      !current.current.config.paused &&
      director.current.active;
    const play = (video: HTMLVideoElement) => {
      if (!video.paused || video.readyState < 2 || !mayPlay()) return;
      video.muted = true;
      video.volume = 0;
      video.play().catch(() => {
        if (!destroyed && mayPlay())
          info.current = {
            ...info.current,
            error: "Video playback needs a click. Use Resume clip.",
          };
      });
    };
    const choose = (clip?: VJClip, resume = false) => {
      if (!clip || clip.id === desired || destroyed) return;
      desired = clip.id;
      const resumeAt =
        resume && director.current.vjCurrent === clip.id
          ? director.current.vjTime
          : 0;
      const index = active === 0 ? 1 : 0,
        video = videos[index],
        other = videos[1 - index];
      video.pause();
      // WebKit can reset muted when a media source is released with load().
      video.defaultMuted = true;
      video.muted = true;
      video.volume = 0;
      video.style.opacity = "0";
      video.dataset.clip = clip.id;
      video.poster = clip.poster;
      video.onloadeddata = () => {
        if (destroyed || desired !== clip.id) return;
        active = index;
        oldUntil = performance.now() + 800;
        if (resumeAt > 0 && Number.isFinite(video.duration))
          video.currentTime = resumeAt % video.duration;
        video.style.opacity = "1";
        other.style.opacity = "0";
        info.current = { id: clip.id, title: clip.title };
        director.current.vjCurrent = clip.id;
        node.dataset.clip = clip.id;
        play(video);
      };
      video.onerror = () => {
        if (destroyed || desired !== clip.id) return;
        info.current = {
          id: clip.id,
          title: clip.title,
          error: "Could not load this VJ clip. Choose another clip or reload.",
        };
      };
      video.src = clip.url;
      video.load();
    };
    const update = () => {
      const c = current.current.config;
      const key = c.vjPack + ":" + c.vjClip + ":" + c.seed;
      if (key !== selection) {
        clips = data.clips.filter(
          (clip) => !c.vjPack || clip.pack === c.vjPack,
        );
        const resume = key === director.current.vjSelection;
        choose(
          sharedVJClip(
            director.current,
            clips,
            key,
            director.current.vjShot,
            c.vjClip,
          ),
          resume,
        );
        director.current.vjSelection = key;
        selection = key;
        shot = director.current.vjShot;
        if (!clips.length)
          info.current = { error: "No VJ loops are installed in this pack." };
      }
      if (shot !== director.current.vjShot) {
        shot = director.current.vjShot;
        choose(sharedVJClip(director.current, clips, key, shot));
      }
      videos.forEach((video, index) => {
        video.defaultMuted = true;
        video.muted = true;
        video.volume = 0;
        video.style.objectFit = c.vjFit;
        video.style.transitionDuration =
          current.current.reduced || motion.matches ? "0s" : ".75s";
        if (active === index) {
          if (video.dataset.clip === desired && video.readyState >= 2)
            director.current.vjTime = video.currentTime;
          const target = Math.max(
            0.25,
            Math.min(
              2,
              c.vjRate * (c.vjReact ? 0.75 + director.current.energy * 0.5 : 1),
            ),
          );
          if (Math.abs(video.playbackRate - target) > 0.03)
            video.playbackRate = target;
          if (mayPlay()) play(video);
          else video.pause();
        } else if (
          performance.now() > oldUntil &&
          video.getAttribute("src") &&
          active >= 0
        ) {
          // Do not cancel an incoming clip while it is still loading.
          if (video.dataset.clip === desired) return;
          video.pause();
          video.removeAttribute("src");
          video.load();
        }
      });
    };
    const start = () => {
      clearInterval(timer);
      if (document.hidden || !visible) {
        videos.forEach((v) => v.pause());
        return;
      }
      update();
      timer = window.setInterval(update, 125);
    };
    const observer = new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting;
      start();
    });
    observer.observe(node);
    document.addEventListener("visibilitychange", start);
    const retry = () => {
      info.current = { ...info.current, error: undefined };
      videos.forEach(play);
    };
    node.addEventListener("vj-resume", retry);
    start();
    return () => {
      destroyed = true;
      clearInterval(timer);
      observer.disconnect();
      document.removeEventListener("visibilitychange", start);
      node.removeEventListener("vj-resume", retry);
      videos.forEach((v) => {
        v.onloadeddata = null;
        v.onerror = null;
        v.pause();
        v.removeAttribute("src");
        v.load();
      });
    };
  }, [data, director, info]);
  return (
    <div ref={root} className="vj-playback" aria-hidden="true">
      <video muted playsInline loop preload="auto" crossOrigin="anonymous" />
      <video muted playsInline loop preload="auto" crossOrigin="anonymous" />
    </div>
  );
}

/** Composite the actual video frame and Canvas overlays for a faithful PNG snapshot. */
export function visualSnapshot(surface: HTMLElement) {
  const canvas = surface.querySelector("canvas")!;
  const output = document.createElement("canvas");
  output.width = canvas.width;
  output.height = canvas.height;
  const ctx = output.getContext("2d")!;
  ctx.fillStyle = "#05060c";
  ctx.fillRect(0, 0, output.width, output.height);
  for (const video of surface.querySelectorAll("video")) {
    if (video.readyState < 2 || !video.videoWidth) continue;
    const opacity = Number(getComputedStyle(video).opacity);
    if (!opacity) continue;
    const fit = getComputedStyle(video).objectFit;
    const scale = (fit === "contain" ? Math.min : Math.max)(
      output.width / video.videoWidth,
      output.height / video.videoHeight,
    );
    const w = video.videoWidth * scale,
      h = video.videoHeight * scale;
    ctx.globalAlpha = opacity;
    ctx.drawImage(video, (output.width - w) / 2, (output.height - h) / 2, w, h);
  }
  ctx.globalAlpha = 1;
  ctx.drawImage(canvas, 0, 0);
  return output;
}
