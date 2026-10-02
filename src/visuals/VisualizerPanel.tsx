import { useEffect, useRef, useState, type MutableRefObject } from "react";
import {
  Maximize2,
  Pause,
  Play,
  Shuffle,
  SkipForward,
  X,
  Square,
  Download,
} from "lucide-react";
import type { Signal } from "../app/types";
import { VideoCanvas, type VideoStats } from "./VideoCanvas";
import {
  scenes,
  overlays,
  palettes,
  VideoDirector,
  sceneCycleOptions,
} from "./video-model.mjs";
import type { VideoConfig } from "./video-renderer";
import "./visualizer.css";
import { VJBrowser } from "./VJBrowser";
import { visualSnapshot } from "./VJPlayback";
import { useIdleControls } from "./useIdleControls";

export type VisualizerProps = {
  signal: MutableRefObject<Signal>;
  director: MutableRefObject<VideoDirector>;
  config: VideoConfig;
  setConfig: (config: VideoConfig) => void;
  quality: string;
  reduced: boolean;
  title: string;
  tokens: string[];
};
const initialStats: VideoStats = {
  scene: "nebula",
  shot: 0,
  energy: 0,
  bass: 0,
  mid: 0,
  high: 0,
  active: false,
  fps: 0,
};

export function VisualizerPanel(
  props: VisualizerProps & { onPresent: () => void },
) {
  const { config, setConfig, director, onPresent } = props;
  const [stats, setStats] = useState(initialStats);
  const change = (next: Partial<VideoConfig>) =>
    setConfig({ ...config, ...next });
  return (
    <section className="visualizer-panel" aria-label="Music video controls">
      <div className="pane-heading">
        <span>02 / MUSIC VIDEO</span>
        <span>{stats.active ? "● LIVE" : "○ IDLE"}</span>
      </div>
      <div className="video-preview">
        <VideoCanvas {...props} onStats={setStats} />
      </div>
      <div className="video-caption">
        <span>
          {config.source === "vj"
            ? stats.clipTitle || "VJ Loops"
            : scenes.find((s) => s.id === stats.scene)?.name}
        </span>
        <span>{stats.fps} FPS</span>
      </div>
      <div
        className="video-source"
        role="group"
        aria-label="Visualization source"
      >
        <button
          aria-pressed={config.source === "generated"}
          onClick={() => change({ source: "generated" })}
        >
          Generated
        </button>
        <button
          aria-pressed={config.source === "vj"}
          onClick={() => change({ source: "vj" })}
        >
          VJ Loops
        </button>
      </div>
      {config.source === "vj" && stats.videoError && (
        <p role="status" className="video-hint">
          {stats.videoError}
          <button
            onClick={() =>
              document
                .querySelectorAll(".vj-playback")
                .forEach((n) => n.dispatchEvent(new Event("vj-resume")))
            }
          >
            Resume clip
          </button>
        </p>
      )}
      <button
        className="primary full-width"
        onClick={() => {
          change({ automatic: true, paused: false });
          onPresent();
        }}
      >
        <Play size={14} />
        Watch Music Video
      </button>
      <div className="video-actions">
        <button onClick={onPresent}>
          <Maximize2 size={13} />
          Fullscreen
        </button>
        <button
          aria-label={
            config.paused ? "Resume visual animation" : "Pause visual animation"
          }
          onClick={() => change({ paused: !config.paused })}
        >
          {config.paused ? <Play size={13} /> : <Pause size={13} />}Visuals
        </button>
        <button
          aria-label="Next visual scene"
          onClick={() => {
            if (config.automatic || config.source === "vj")
              director.current.next(config);
            else
              change({
                scene:
                  scenes[
                    (scenes.findIndex((s) => s.id === config.scene) + 1) %
                      scenes.length
                  ].id,
              });
          }}
        >
          <SkipForward size={13} />
        </button>
      </div>
      <p className="video-hint">
        {stats.active
          ? "Following the live master output."
          : "Press Play in the studio. Visuals follow the actual audio."}
      </p>
      <label className="video-check">
        <input
          type="checkbox"
          checked={config.automatic}
          onChange={(e) => change({ automatic: e.target.checked })}
        />
        Music Video · automatic scenes
      </label>
      {config.automatic && (
        <label className="video-select">
          Change scene every
          <select
            aria-label="Scene duration"
            value={config.cycles}
            onChange={(e) => change({ cycles: Number(e.target.value) })}
          >
            {sceneCycleOptions.map((n) => (
              <option key={n} value={n}>
                {n} Strudel {n === 1 ? "cycle" : "cycles"}
              </option>
            ))}
          </select>
        </label>
      )}
      <p className="video-hint">
        {config.source === "vj"
          ? "Random clips, with no immediate repeats. New sessions start with a fresh selection."
          : "Automatic scenes follow musical phrases, bass and energy, with soft transitions."}
      </p>
      {config.source === "vj" ? (
        <VJBrowser config={config} setConfig={setConfig} />
      ) : (
        <>
          <div className="pane-heading">SCENES / BACKGROUNDS</div>
          <div className="video-scenes">
            {scenes.map((s, index) => (
              <button
                key={s.id}
                className={stats.scene === s.id ? "selected" : ""}
                aria-pressed={!config.automatic && config.scene === s.id}
                onClick={() =>
                  change({ scene: s.id, automatic: false, paused: false })
                }
                title={s.detail}
              >
                <span
                  className={"scene-thumb scene-" + s.id}
                  aria-hidden="true"
                >
                  <span>{String(index + 1).padStart(2, "0")}</span>
                </span>
                <b>{s.name}</b>
              </button>
            ))}
          </div>
        </>
      )}
      <div className="pane-heading">OVERLAY LAYERS</div>
      <div className="video-layers">
        {overlays.map((o) => (
          <label className="video-check" key={o.id}>
            <input
              type="checkbox"
              checked={config.overlays.includes(o.id)}
              onChange={(e) =>
                change({
                  overlays: e.target.checked
                    ? [...config.overlays, o.id]
                    : config.overlays.filter((v: string) => v !== o.id),
                })
              }
            />
            {o.name}
          </label>
        ))}
      </div>
      <label className="video-slider">
        Overlay opacity <span>{Math.round(config.overlayOpacity * 100)}%</span>
        <input
          aria-label="Overlay opacity"
          type="range"
          min="0"
          max="1"
          step="0.05"
          value={config.overlayOpacity}
          onChange={(e) => change({ overlayOpacity: Number(e.target.value) })}
        />
      </label>
      <div className="pane-heading">LOOK / RESPONSE</div>
      <label className="video-select">
        Palette
        <select
          aria-label="Visualizer palette"
          value={config.palette}
          onChange={(e) => change({ palette: e.target.value })}
        >
          {Object.entries(palettes).map(([id, p]) => (
            <option key={id} value={id}>
              {p.name}
            </option>
          ))}
        </select>
      </label>
      <label className="video-slider">
        Audio sensitivity <span>{config.sensitivity.toFixed(2)}×</span>
        <input
          aria-label="Audio sensitivity"
          type="range"
          min="0.25"
          max="3"
          step="0.05"
          value={config.sensitivity}
          onChange={(e) => change({ sensitivity: Number(e.target.value) })}
        />
      </label>
      <label className="video-slider">
        Motion speed <span>{config.motion.toFixed(1)}×</span>
        <input
          aria-label="Visual motion speed"
          type="range"
          min="0.1"
          max="1.5"
          step="0.1"
          value={config.motion}
          onChange={(e) => change({ motion: Number(e.target.value) })}
        />
      </label>
      <label className="video-check">
        <input
          type="checkbox"
          checked={config.titles}
          onChange={(e) => change({ titles: e.target.checked })}
        />
        Show project title
      </label>
      <label className="video-check">
        <input
          type="checkbox"
          checked={config.background}
          onChange={(e) => change({ background: e.target.checked })}
        />
        Use as studio background
      </label>
      <button
        className="full-width"
        onClick={() => {
          change({ seed: 1 + Math.floor(Math.random() * 999999) });
          director.current.next(config);
        }}
      >
        <Shuffle size={13} />
        New scene sequence
      </button>
      <div className="video-bands" aria-label="Audio response levels">
        {(["bass", "mid", "high"] as const).map((band) => (
          <label key={band}>
            {band}
            <meter
              min="0"
              max="1"
              value={stats[band]}
              aria-label={band + " energy"}
            />
          </label>
        ))}
      </div>
      <p className="video-hint">
        Visual quality, reduced motion and background intensity follow studio
        settings.{" "}
        <a
          href="https://github.com/kawaiipantsu/strudel-xxc/blob/main/docs/VISUALIZER.md"
          target="_blank"
          rel="noreferrer"
        >
          Guide / artist references ↗
        </a>
      </p>
    </section>
  );
}

export function VisualizerPresentation(
  props: VisualizerProps & {
    onClose: () => void;
    onHush: () => void;
    playing: boolean;
  },
) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [stats, setStats] = useState(initialStats);
  const [message, setMessage] = useState("");
  const { onClose, onHush, playing, config, setConfig, director } = props;
  const controls = useIdleControls(playing);
  useEffect(() => {
    const node = dialog.current!;
    node.showModal();
    const native = !!document.fullscreenElement;
    const changed = () => {
      if (native && !document.fullscreenElement) onClose();
    };
    document.addEventListener("fullscreenchange", changed);
    return () => {
      document.removeEventListener("fullscreenchange", changed);
      node.close();
    };
  }, []);
  async function snapshot() {
    const surface = dialog.current?.querySelector<HTMLElement>(
      ".music-video-surface",
    );
    if (!surface) return;
    const canvas = visualSnapshot(surface);
    canvas.toBlob((blob) => {
      if (!blob) {
        setMessage("This browser could not create a PNG.");
        return;
      }
      const url = URL.createObjectURL(blob),
        a = document.createElement("a");
      a.href = url;
      a.download =
        "xxc-visualizer-" +
        new Date().toISOString().replace(/[:.]/g, "-") +
        ".png";
      a.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
      setMessage("Visual frame saved as PNG.");
    });
  }
  return (
    <dialog
      ref={dialog}
      className={"video-presentation " + (controls.hidden ? "clean" : "")}
      {...controls.handlers}
      aria-label="Fullscreen music visualizer"
      onCancel={(e) => {
        e.preventDefault();
        onClose();
      }}
    >
      <VideoCanvas {...props} onStats={setStats} />
      <div className="presentation-chrome">
        <div>
          <b>XXC / THUGS(red)</b>
          <span>
            {config.source === "vj"
              ? stats.clipTitle || "VJ Loops"
              : scenes.find((s) => s.id === stats.scene)?.name}{" "}
            · SCENE {String(stats.shot + 1).padStart(2, "0")}
          </span>
        </div>
        <div className="presentation-controls">
          {config.source === "vj" && stats.videoError && (
            <button
              onClick={() =>
                dialog.current
                  ?.querySelectorAll(".vj-playback")
                  .forEach((n) => n.dispatchEvent(new Event("vj-resume")))
              }
            >
              Resume clip
            </button>
          )}
          <button
            onClick={() =>
              setConfig({ ...config, automatic: !config.automatic })
            }
            aria-pressed={config.automatic}
          >
            Music Video {config.automatic ? "ON" : "OFF"}
          </button>
          <button
            aria-label="Next fullscreen scene"
            onClick={() => {
              if (config.automatic || config.source === "vj")
                director.current.next(config);
              else
                setConfig({
                  ...config,
                  scene:
                    scenes[
                      (scenes.findIndex((s) => s.id === config.scene) + 1) %
                        scenes.length
                    ].id,
                });
            }}
          >
            <SkipForward size={16} />
          </button>
          <button aria-label="Save visual frame" onClick={snapshot}>
            <Download size={16} />
          </button>
          <button onClick={controls.hide}>Hide controls</button>
          <button onClick={onHush} disabled={!playing}>
            <Square size={13} />
            Hush
          </button>
          <button aria-label="Close fullscreen visualizer" onClick={onClose}>
            <X size={19} />
          </button>
        </div>
      </div>
      <div className="presentation-status" role="status">
        {message ||
          (config.source === "vj" && stats.videoError) ||
          (stats.active
            ? "LIVE MASTER OUTPUT · " + stats.fps + " FPS"
            : "AWAITING AUDIO · Return to the studio and press Play")}
      </div>
    </dialog>
  );
}
