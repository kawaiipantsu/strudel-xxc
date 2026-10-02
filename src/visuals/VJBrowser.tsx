import { useState } from "react";
import type { VideoConfig } from "./video-renderer";
import { useVJCatalogue } from "./vj-model";
export function VJBrowser({
  config,
  setConfig,
}: {
  config: VideoConfig;
  setConfig: (c: VideoConfig) => void;
}) {
  const { data, error } = useVJCatalogue();
  const [query, setQuery] = useState(""),
    [limit, setLimit] = useState(12);
  const change = (next: Partial<VideoConfig>) =>
    setConfig({ ...config, ...next });
  const clips = (data?.clips || []).filter(
    (c) =>
      (!config.vjPack || c.pack === config.vjPack) &&
      c.title.toLowerCase().includes(query.toLowerCase()),
  );
  return (
    <section className="vj-browser" aria-label="VJ loop library">
      <div className="pane-heading">VJ LOOPS / VIDEO PACKS</div>
      {error && <p role="status">{error}</p>}
      {!data && !error && <p role="status">Loading video packs…</p>}
      {data && (
        <>
          <p className="video-hint">
            {data.clips.length} clips · {data.packs.length} packs · original
            clip audio muted
          </p>
          <label className="video-select">
            Pack
            <select
              aria-label="VJ pack"
              value={config.vjPack}
              onChange={(e) => {
                change({ vjPack: e.target.value, vjClip: "" });
                setLimit(12);
              }}
            >
              <option value="">All packs</option>
              {data.packs.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} · {p.count}
                </option>
              ))}
            </select>
          </label>
          <input
            type="search"
            aria-label="Search VJ clips"
            placeholder="Find a loop…"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setLimit(12);
            }}
          />
          <div className="vj-clips">
            {clips.slice(0, limit).map((c) => (
              <button
                key={c.id}
                aria-label={"Play VJ clip " + c.title}
                aria-pressed={config.vjClip === c.id}
                className={config.vjClip === c.id ? "selected" : ""}
                onClick={() =>
                  change({
                    source: "vj",
                    vjClip: c.id,
                    automatic: false,
                    paused: false,
                  })
                }
              >
                <img
                  src={c.poster}
                  alt=""
                  loading="lazy"
                  decoding="async"
                  width="160"
                  height="90"
                />
                <b>{c.title}</b>
                <small>
                  {c.duration.toFixed(1)}s · {c.pack}
                </small>
              </button>
            ))}
          </div>
          {!clips.length && <p className="video-hint">No matching clips.</p>}
          {clips.length > limit && (
            <button className="full-width" onClick={() => setLimit(limit + 12)}>
              Show 12 more clips
            </button>
          )}
          <label className="video-slider">
            Playback speed <span>{config.vjRate.toFixed(2)}×</span>
            <input
              type="range"
              aria-label="VJ playback speed"
              min=".25"
              max="2"
              step=".05"
              value={config.vjRate}
              onChange={(e) => change({ vjRate: Number(e.target.value) })}
            />
          </label>
          <label className="video-check">
            <input
              type="checkbox"
              checked={config.vjReact}
              onChange={(e) => change({ vjReact: e.target.checked })}
            />
            Follow audio energy with playback speed
          </label>
          <label className="video-select">
            Framing
            <select
              aria-label="VJ framing"
              value={config.vjFit}
              onChange={(e) =>
                change({
                  vjFit: e.target.value === "contain" ? "contain" : "cover",
                })
              }
            >
              <option value="cover">Fill screen</option>
              <option value="contain">Show full clip</option>
            </select>
          </label>
          <p className="video-hint">
            Choose a clip to loop it, or enable Music Video for changes on
            musical phrases. Overlays work on top of the videos. Clips pause
            with Hush, hidden views and reduced motion.
          </p>
          {data.packs
            .filter((p) => !config.vjPack || p.id === config.vjPack)
            .map((p) => (
              <p className="video-hint" key={p.id}>
                {p.name} · {p.credit}
              </p>
            ))}
        </>
      )}
    </section>
  );
}
