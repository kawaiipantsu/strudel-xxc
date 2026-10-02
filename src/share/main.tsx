import { useEffect, useRef, useState } from "react";
import { createRoot } from "react-dom/client";
import { createPortal } from "react-dom";
import { api } from "../app/api";
import { emptySignal, type Project, type Signal } from "../app/types";
import { HeaderParticles } from "../visuals/HeaderParticles";
import { VideoCanvas, type VideoStats } from "../visuals/VideoCanvas";
import {
  VideoDirector,
  sanitizeVideo,
  sceneCycleOptions,
} from "../visuals/video-model.mjs";
import "../visuals/visualizer.css";
import "./share-player.css";
import { useIdleControls } from "../visuals/useIdleControls";

type Session = { project: Project; code: string; hydra: boolean; key: number };
function SharePlayer({
  id,
  initialTitle,
  initialEntry,
  playerUrl,
}: {
  id: string;
  initialTitle: string;
  initialEntry: string;
  playerUrl: string;
}) {
  const [opened, setOpened] = useState(
    () => location.pathname.endsWith("/play") || location.hash === "#play",
  );
  const [activated, setActivated] = useState(false);
  const [session, setSession] = useState<Session>();
  const [pending, setPending] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [unlock, setUnlock] = useState(false);
  const [status, setStatus] = useState("READY TO PLAY");
  const [problem, setProblem] = useState("");
  const [stats, setStats] = useState<VideoStats>();
  const [full, setFull] = useState(false);
  const [fallbackFull, setFallbackFull] = useState(false);
  const [volume, setVolume] = useState(0.75);
  const [background, setBackground] = useState(true);
  const [visualPaused, setVisualPaused] = useState(false);
  const [title, setTitle] = useState(initialTitle);
  const [entry, setEntry] = useState(initialEntry);
  const controls = useIdleControls(playing && !unlock);
  const [linkStatus, setLinkStatus] = useState("");
  const frame = useRef<HTMLIFrameElement>(null);
  const surface = useRef<HTMLDivElement>(null);
  const section = useRef<HTMLElement>(null);
  const signal = useRef<Signal>(structuredClone(emptySignal));
  const director = useRef(new VideoDirector());
  const attempt = useRef(0);
  const current = useRef(session);
  current.current = session;
  const volumeRef = useRef(volume);
  volumeRef.current = volume;
  const running = useRef(false);
  const [config, setConfig] = useState(() =>
    sanitizeVideo({
      source: "vj",
      vjReact: true,
      overlays: [],
      titles: false,
      cycles: Number(new URLSearchParams(location.search).get("cycle") || 8),
    }),
  );
  const send = (type: string, data: Record<string, unknown> = {}) =>
    frame.current?.contentWindow?.postMessage(
      { channel: "xxc-host", type, ...data },
      "*",
    );

  const stop = () => {
    attempt.current++;
    current.current = undefined;
    send("stop");
    // Destroying the isolated runtime also cancels pending unlocks and user timers.
    setSession(undefined);
    running.current = false;
    setPlaying(false);
    setPending(false);
    setUnlock(false);
    signal.current = structuredClone(emptySignal);
    setStatus("STOPPED");
  };
  const play = async () => {
    stop();
    const key = ++attempt.current;
    setOpened(true);
    setActivated(true);
    setPending(true);
    setProblem("");
    setStatus("LOADING SCORE…");
    document
      .querySelectorAll<HTMLAudioElement>(".share-main audio")
      .forEach((audio) => audio.pause());
    try {
      const [project, settings] = await Promise.all([
        api<Project>("projects/" + id),
        api("settings/public"),
      ]);
      if (key !== attempt.current) return;
      // Recheck visibility at Play, including for owners viewing an old share page.
      if (!["public", "unlisted"].includes(project.visibility))
        throw new Error(
          "This score is now private. Open it in the studio if you own it.",
        );
      const file = project.files.find(
        (f) => f.kind !== "folder" && f.path === project.entry_file,
      );
      if (!file?.content.trim())
        throw new Error(
          "The entry file is empty or missing. Open the project in the studio to choose a score.",
        );
      setTitle(project.title);
      setEntry(file.path);
      setStatus("INITIALIZING STRUDEL…");
      setSession({
        project,
        code: file.content,
        hydra: settings.hydra_enabled === true,
        key,
      });
    } catch (e) {
      if (key !== attempt.current) return;
      setPending(false);
      setStatus("UNABLE TO PLAY");
      setProblem(
        e instanceof Error
          ? e.message
          : "Could not load the score. Try Play again.",
      );
    }
  };
  useEffect(() => {
    if (opened)
      section.current?.scrollIntoView({ behavior: "instant", block: "center" });
  }, [opened]);
  useEffect(() => {
    const receive = (e: MessageEvent) => {
      const loaded = current.current;
      if (
        !loaded ||
        e.source !== frame.current?.contentWindow ||
        e.origin !== "null" ||
        e.data?.channel !== "xxc-runtime"
      )
        return;
      const d = e.data;
      switch (d.type) {
        case "ready":
          send("features", { hydra: loaded.hydra, midi: false });
          send("background-music", { enabled: true });
          send("load", {
            code: loaded.code,
            file: loaded.project.entry_file,
            projectKey: id,
            generation: loaded.key,
          });
          send("volume", { value: volumeRef.current });
          setStatus("STARTING AUDIO…");
          send("evaluate", { mode: "all" });
          break;
        case "audio-unlock":
          setUnlock(d.required === true);
          if (d.required) setStatus("CLICK ENABLE AUDIO IN THE PLAYER");
          break;
        case "playing":
          running.current = d.playing === true;
          setPlaying(running.current);
          setPending(false);
          setStatus(running.current ? "PLAYING" : "STOPPED");
          if (!running.current) signal.current = structuredClone(emptySignal);
          break;
        case "frame":
          if (
            running.current &&
            Array.isArray(d.wave) &&
            d.wave.length <= 2048 &&
            Array.isArray(d.fft) &&
            d.fft.length <= 2048 &&
            Array.isArray(d.events) &&
            d.events.length <= 256
          )
            signal.current = d;
          break;
        case "error":
          setProblem(String(d.message).slice(0, 1500));
          if (!running.current) {
            setPending(false);
            setStatus("PLAYBACK ERROR");
          }
          break;
      }
    };
    const leave = () => stop();
    window.addEventListener("message", receive);
    window.addEventListener("pagehide", leave);
    return () => {
      window.removeEventListener("message", receive);
      window.removeEventListener("pagehide", leave);
    };
  }, [id]);
  useEffect(() => {
    if (!session || playing || !pending || unlock) return;
    const timer = setTimeout(() => {
      stop();
      setProblem(
        "The audio engine took too long to start. Check the connection, then press Play to retry.",
      );
    }, 45000);
    return () => clearTimeout(timer);
  }, [session, pending, playing, unlock]);
  useEffect(() => {
    const change = () =>
      setFull(document.fullscreenElement === surface.current);
    const escape = (e: KeyboardEvent) => {
      if (e.key === "Escape") setFallbackFull(false);
    };
    document.addEventListener("fullscreenchange", change);
    document.addEventListener("keydown", escape);
    return () => {
      document.removeEventListener("fullscreenchange", change);
      document.removeEventListener("keydown", escape);
    };
  }, []);
  useEffect(() => {
    document.body.classList.toggle("share-window-fullscreen", fallbackFull);
    return () => document.body.classList.remove("share-window-fullscreen");
  }, [fallbackFull]);
  const fullscreen = async () => {
    try {
      if (document.fullscreenElement) await document.exitFullscreen();
      else if (fallbackFull) setFallbackFull(false);
      else if (surface.current?.requestFullscreen)
        await surface.current.requestFullscreen();
      else setFallbackFull(true);
    } catch {
      setFallbackFull(true);
    }
  };
  const resumeClip = () => {
    surface.current
      ?.querySelector(".vj-playback")
      ?.dispatchEvent(new Event("vj-resume"));
  };
  const copyLink = async () => {
    const url = new URL(playerUrl);
    url.searchParams.set("cycle", String(config.cycles));
    try {
      await navigator.clipboard.writeText(url.href);
      setLinkStatus("Player link copied.");
    } catch {
      setLinkStatus("Copy this link: " + url.href);
    }
  };
  return (
    <>
      {createPortal(
        <div className="share-particles">
          <HeaderParticles
            variant="page"
            quality="balanced"
            reduced={!background || full || fallbackFull}
            intensity={0.7}
          />
        </div>,
        document.body,
      )}
      {createPortal(
        <>
          <button
            className="button primary"
            onClick={play}
            disabled={pending || playing}
          >
            ▶ PLAY
          </button>
          <button
            className="share-background-toggle"
            aria-pressed={background}
            onClick={() => setBackground(!background)}
          >
            {background ? "Pause" : "Animate"} background
          </button>
        </>,
        document.getElementById("share-play-action")!,
      )}
      {opened && (
        <section
          id="play"
          ref={section}
          className="share-player"
          aria-label="Project music player"
        >
          <div className="share-player-heading">
            <h2>╭─ PLAY / VJ LOOPS</h2>
            <span>{entry || "ENTRY FILE"} · 1280 × 720</span>
          </div>
          <div
            ref={surface}
            className={
              "share-player-screen" + (fallbackFull ? " window-fullscreen" : "")
            }
            role="region"
            aria-label="Music video player"
            data-controls-hidden={controls.hidden}
            {...controls.handlers}
          >
            {activated && (
              <VideoCanvas
                signal={signal}
                director={director}
                config={{ ...config, paused: !playing || visualPaused }}
                quality="balanced"
                reduced={false}
                title={title}
                tokens={[]}
                onStats={setStats}
              />
            )}
            <div className="share-player-title" aria-hidden="true">
              <small>XXC / THUGS(red) · LIVE SIGNAL</small>
              <strong>{title}</strong>
            </div>
            {!playing && (
              <div className="share-player-idle" aria-hidden="true">
                <img src="/brand/mark.svg" alt="" />
                <span>
                  {pending
                    ? "CONNECTING / CODE → SOUND → VIDEO"
                    : problem
                      ? "SCORE ERROR / SEE DETAILS BELOW"
                      : "PRESS PLAY TO LISTEN"}
                </span>
              </div>
            )}
            {session && (
              <iframe
                key={session.key}
                ref={frame}
                className={
                  "share-audio-runtime" + (unlock ? " needs-unlock" : "")
                }
                src="/sandbox/?player=1"
                title="Enable project audio"
                sandbox="allow-scripts"
                allow="autoplay"
                tabIndex={unlock ? 0 : -1}
                aria-hidden={!unlock}
              />
            )}
            <div className="share-player-transport">
              <button
                onClick={playing ? stop : play}
                disabled={pending}
                aria-label={playing ? "Stop music" : "Play music"}
              >
                {playing ? "■ STOP" : "▶ PLAY"}
              </button>
              {pending && <button onClick={stop}>Cancel</button>}
              <label className="share-player-volume">
                Volume
                <input
                  aria-label="Player volume"
                  type="range"
                  min="0"
                  max="1"
                  step="0.01"
                  value={volume}
                  onChange={(e) => {
                    const v = Number(e.target.value);
                    setVolume(v);
                    send("volume", { value: v });
                  }}
                />
              </label>
              <button
                onClick={() => {
                  director.current.next(config);
                }}
                aria-label="Next VJ loop"
              >
                NEXT LOOP →
              </button>
              <label className="share-player-timing">
                Change every
                <select
                  aria-label="Scene duration"
                  value={config.cycles}
                  onChange={(e) =>
                    setConfig({ ...config, cycles: Number(e.target.value) })
                  }
                >
                  {sceneCycleOptions.map((n) => (
                    <option key={n} value={n}>
                      {n} {n === 1 ? "cycle" : "cycles"}
                    </option>
                  ))}
                </select>
              </label>
              <button
                aria-pressed={visualPaused}
                onClick={() => setVisualPaused(!visualPaused)}
              >
                {visualPaused ? "Resume visuals" : "Pause visuals"}
              </button>
              <button
                onClick={fullscreen}
                aria-label={
                  full || fallbackFull ? "Exit fullscreen" : "Fullscreen"
                }
              >
                {full || fallbackFull ? "↙ EXIT" : "⛶ FULLSCREEN"}
              </button>
            </div>
          </div>
          <div className="share-player-link">
            <button onClick={copyLink}>Copy player link</button>
            <span role="status">{linkStatus}</span>
          </div>
          <div className="share-player-status">
            <span role="status">{status}</span>
            <span>{stats?.clipTitle || "VJ loops / three packs"}</span>
          </div>
          {stats?.videoError && (
            <p className="share-player-error">
              {stats.videoError}{" "}
              <button onClick={resumeClip}>Resume clip</button>
            </p>
          )}
          {problem && (
            <p className="share-player-error" role="alert">
              {problem} <a href={"/?project=" + id}>Open in Sandbox ↗</a>
            </p>
          )}
          <p className="hint">
            Live Strudel audio · muted VJ clips follow the music ·
            reduced-motion preferences are respected.
          </p>
        </section>
      )}
    </>
  );
}
const root = document.getElementById("share-player-root");
if (root?.dataset.projectId && document.getElementById("share-play-action")) {
  document.body.classList.add("share-page");
  createRoot(root).render(
    <SharePlayer
      id={root.dataset.projectId}
      initialTitle={root.dataset.title || ""}
      initialEntry={root.dataset.entry || ""}
      playerUrl={root.dataset.playerUrl!}
    />,
  );
}
