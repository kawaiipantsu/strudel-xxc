import {
  useState,
  useEffect,
  type MutableRefObject,
  type ReactNode,
} from "react";
import { SignalCanvas } from "../visuals/SignalCanvas";
import { SampleBanks } from "../samples/SampleBanks";
import { sampleMapCode, sampleSnippet } from "../samples/sample-code.mjs";
import type { Signal, Media } from "./types";
import { api } from "./api";
import { docs } from "./docs";
import {
  Search,
  SlidersHorizontal,
  AudioLines,
  ArrowUpRight,
  Plus,
  Plug,
} from "lucide-react";
export type Control = {
  id: string;
  name: string;
  kind: string;
  min: number;
  max: number;
  value: number;
};
export function Toolbox({
  tab,
  setTab,
  signal,
  tick,
  send,
  insert,
  word,
  quality,
  intensity,
  setIntensity,
  mode,
  setMode,
  onSampleLab,
  onLog,
  controls,
  setControls,
  features,
  visualizer,
}: {
  visualizer: ReactNode;
  features: { midi: boolean; hydra: boolean };
  tab: string;
  setTab: (s: string) => void;
  signal: MutableRefObject<Signal>;
  tick: number;
  send: (type: string, data?: any) => void;
  insert: (s: string) => void;
  word: string;
  quality: string;
  intensity: number;
  setIntensity: (n: number) => void;
  mode: string;
  setMode: (s: string) => void;
  onSampleLab: () => void;
  onLog: (s: string) => void;
  controls: Control[];
  setControls: (c: Control[]) => void;
}) {
  const [q, setQ] = useState(""),
    [samples, setSamples] = useState<Media[]>([]),
    [packs, setPacks] = useState<any[]>([]),
    [mix, setMix] = useState<Record<string, any>>({}),
    [midi, setMidi] = useState<any>(),
    [devices, setDevices] = useState<any[]>([]),
    [learn, setLearn] = useState<string | null>(null),
    [deviceStatus, setDeviceStatus] = useState("No device connected"),
    [macroname, setMacroname] = useState("cutoff"),
    [controlKind, setControlKind] = useState("slider");
  const s = signal.current;
  void tick;
  useEffect(() => {
    if (tab === "SAMPLES") {
      api<Media[]>("samples")
        .then(setSamples)
        .catch((e) => onLog(e.message));
      api("sample-packs")
        .then(setPacks)
        .catch((e) => onLog(e.message));
    }
  }, [tab]);
  useEffect(() => {
    if (!midi) return;
    const handlers: any[] = [];
    for (const input of midi.inputs.values()) {
      const fn = (event: any) => {
        const [status, cc, value] = event.data;
        if ((status & 240) === 176) {
          if (learn) {
            localStorage.setItem("xxc-midi-" + cc, learn);
            setLearn(null);
            setDeviceStatus("Mapped CC " + cc);
          }
          const id = learn || localStorage.getItem("xxc-midi-" + cc);
          const c = controls.find((c) => c.id === id);
          if (c) changeControl(c, c.min + (value / 127) * (c.max - c.min));
        }
        send("midi-input", {
          data: Array.from(event.data),
          device: input.name,
        });
      };
      input.onmidimessage = fn;
      handlers.push(input);
    }
    return () => handlers.forEach((i) => (i.onmidimessage = null));
  }, [midi, learn, controls]);
  const changeControl = (c: Control, value: number) => {
    setControls(controls.map((x) => (x.id === c.id ? { ...x, value } : x)));
    send("macro", { name: c.name, value });
  };
  async function connectMIDI() {
    try {
      if (!features.midi) {
        setDeviceStatus("MIDI disabled by the administrator");
        return;
      }
      if (!("requestMIDIAccess" in navigator)) {
        setDeviceStatus("MIDI unavailable in this browser");
        return;
      }
      const access = await (navigator as any).requestMIDIAccess({
        sysex: false,
      });
      setMidi(access);
      const list = [...access.inputs.values(), ...access.outputs.values()];
      setDevices(list);
      setDeviceStatus(
        list.length
          ? list.length + " MIDI port(s) available"
          : "MIDI enabled; no devices connected",
      );
      send("midi-ports", {
        inputs: [...access.inputs.values()].map((p: any) => ({
          id: p.id,
          name: p.name,
          manufacturer: p.manufacturer,
        })),
        outputs: [...access.outputs.values()].map((p: any) => ({
          id: p.id,
          name: p.name,
          manufacturer: p.manufacturer,
        })),
      });
      (window as any).__xxcMidi = access;
      onLog(
        "MIDI permission granted; system-exclusive messages remain blocked.",
      );
    } catch (e) {
      setDeviceStatus("MIDI permission denied or unavailable.");
    }
  }
  const updateMix = (id: string, key: string, value: any) => {
    const val = {
      gain: 1,
      pan: 0,
      mute: false,
      solo: false,
      ...mix[id],
      [key]: value,
    };
    setMix({ ...mix, [id]: val });
    send("mixer", { id, value: val });
  };
  const shown = Object.entries(docs).filter(([k, v]) =>
    q || word
      ? (k + " " + v.text).toLowerCase().includes((q || word).toLowerCase())
      : ["s", "note", "lpf", "room", "slider"].includes(k),
  );
  return (
    <aside className="toolbox">
      <div className="tool-tabs" role="tablist" aria-label="Workbench">
        {[
          "VISUALS",
          "VISUALIZER",
          "MIXER",
          "CONTROLS",
          "INSPECTOR",
          "DOCS",
          "SAMPLES",
        ].map((t) => (
          <button
            key={t}
            role="tab"
            aria-selected={tab === t}
            onClick={() => setTab(t)}
          >
            {t}
          </button>
        ))}
      </div>
      <div className="tool-content">
        {tab === "VISUALIZER" && visualizer}
        {tab === "VISUALS" && (
          <>
            <div className="pane-heading">
              <span>01 / SIGNAL MONITOR</span>
              <AudioLines size={14} />
            </div>
            <div className="visual-card">
              <div className="visual-caption">
                <span>{mode.toUpperCase()}</span>
                <span className="green">
                  {s.rms > 0.001 ? "● LIVE" : "○ IDLE"}
                </span>
              </div>
              <SignalCanvas signal={signal} mode={mode} quality={quality} />
              <div className="visual-scale">
                <span>
                  {["spectrum", "spectrogram"].includes(mode)
                    ? "0 Hz"
                    : mode === "phase"
                      ? "L"
                      : "−1.0"}
                </span>
                <span>
                  {mode === "spectrum"
                    ? "FREQUENCY →"
                    : mode === "spectrogram"
                      ? "TIME → / FREQUENCY ↑"
                      : mode === "phase"
                        ? "STEREO PHASE"
                        : "TIME →"}
                </span>
                <span>
                  {["spectrum", "spectrogram"].includes(mode)
                    ? "NYQUIST"
                    : mode === "phase"
                      ? "R"
                      : "+1.0"}
                </span>
              </div>
            </div>
            <div className="preset-grid">
              {[
                "scope",
                "spectrum",
                "spectrogram",
                "pianoroll",
                "punchcard",
                "spiral",
                "phase",
                "orbits",
                "geometry",
              ].map((m) => (
                <button
                  className={mode === m ? "selected" : ""}
                  key={m}
                  onClick={() => setMode(m)}
                >
                  {m}
                </button>
              ))}
            </div>
            <div className="pane-heading">
              <span>02 / PATTERN EVENTS</span>
              <span>{s.events.length}</span>
            </div>
            <div className="visual-card short">
              <SignalCanvas signal={signal} mode="pianoroll" quality="low" />
            </div>
            <div className="signal-stats">
              <div>
                <b>{s.cps.toFixed(3)}</b>
                <span>CPS</span>
              </div>
              <div>
                <b>{Math.floor(s.phase).toString().padStart(3, "0")}</b>
                <span>CYCLE</span>
              </div>
              <div>
                <b>{s.rms ? (20 * Math.log10(s.rms)).toFixed(1) : "−∞"}</b>
                <span>RMS dB</span>
              </div>
            </div>
            <div className="pane-heading">03 / ATMOSPHERE</div>
            <label className="range-label">
              Background intensity <span>{Math.round(intensity * 100)}%</span>
              <input
                type="range"
                min="0"
                max=".8"
                step=".01"
                value={intensity}
                onChange={(e) => setIntensity(+e.target.value)}
              />
            </label>
            <div className="hint">
              ╰─ Visuals follow the live audio bus and real Strudel events.
            </div>
            <button
              disabled={!features.hydra}
              className="full-width"
              onClick={() =>
                insert(
                  "\nawait initHydra()\nosc(8, .1, 1.2).color(1, .1, .2).out()\n",
                )
              }
            >
              {features.hydra
                ? "Insert Hydra visual script"
                : "Hydra disabled by administrator"}{" "}
              <ArrowUpRight size={13} />
            </button>
          </>
        )}
        {tab === "MIXER" && (
          <>
            <div className="pane-heading">MASTER / STEREO</div>
            <div className="meter-pair">
              {["L", "R"].map((c, i) => (
                <div key={c}>
                  <span>{c}</span>
                  <meter
                    min="0"
                    max="1"
                    high={0.8}
                    optimum={0.2}
                    value={Math.min(1, (s.stereo[i] || 0) * 3)}
                  />
                  <small>
                    {s.stereo[i]
                      ? (20 * Math.log10(s.stereo[i])).toFixed(1)
                      : "−∞"}{" "}
                    dB
                  </small>
                </div>
              ))}
            </div>
            <p className={s.peak > 0.98 ? "red" : "muted"}>
              {s.peak > 0.98
                ? "⚠ Peak near clipping. Lower the gain."
                : "PEAK " +
                  (s.peak ? (20 * Math.log10(s.peak)).toFixed(1) : "−∞") +
                  " dBFS"}
            </p>
            <div className="pane-heading">ORBITS / POST EFFECTS</div>
            {s.orbits.length ? (
              s.orbits.map((o) => (
                <div className="orbit-strip" key={o.id}>
                  <div className="toolbar">
                    <b>ORBIT {o.id}</b>
                    <button
                      className={mix[o.id]?.mute ? "selected" : ""}
                      onClick={() => updateMix(o.id, "mute", !mix[o.id]?.mute)}
                    >
                      M
                    </button>
                    <button
                      className={mix[o.id]?.solo ? "selected" : ""}
                      onClick={() => updateMix(o.id, "solo", !mix[o.id]?.solo)}
                    >
                      S
                    </button>
                  </div>
                  <meter min="0" max="1" value={Math.min(1, o.level * 3)} />
                  <label>
                    Level
                    <input
                      type="range"
                      min="0"
                      max="1.5"
                      step=".01"
                      value={mix[o.id]?.gain ?? 1}
                      onChange={(e) => updateMix(o.id, "gain", +e.target.value)}
                    />
                  </label>
                  <label>
                    Pan
                    <input
                      type="range"
                      min="-1"
                      max="1"
                      step=".05"
                      value={mix[o.id]?.pan ?? 0}
                      onChange={(e) => updateMix(o.id, "pan", +e.target.value)}
                    />
                  </label>
                </div>
              ))
            ) : (
              <p className="muted">
                Play a score to discover its audio orbits.
              </p>
            )}
            <p className="hint">
              Meters read actual bus outputs. Mixer gain and pan sit after
              Strudel’s orbit effects.
            </p>
          </>
        )}
        {tab === "CONTROLS" && (
          <>
            <div className="pane-heading">LIVE PARAMETER CONTROLS</div>
            {controls.map((c) => (
              <div className="control-strip" key={c.id}>
                <div className="toolbar">
                  <b>{c.name}</b>
                  <code>{c.value.toFixed(2)}</code>
                  <button
                    className="text-button"
                    aria-label={"Remove " + c.name}
                    onClick={() =>
                      setControls(controls.filter((x) => x.id !== c.id))
                    }
                  >
                    ×
                  </button>
                </div>
                {["toggle", "button"].includes(c.kind) ? (
                  <button
                    onPointerDown={() =>
                      changeControl(c, c.value === c.max ? c.min : c.max)
                    }
                    onPointerUp={() =>
                      c.kind === "button" && changeControl(c, c.min)
                    }
                  >
                    {c.value === c.max ? "ON" : "OFF"}
                  </button>
                ) : c.kind === "select" ? (
                  <select
                    value={c.value}
                    onChange={(e) => changeControl(c, +e.target.value)}
                  >
                    {[c.min, (c.min + c.max) / 2, c.max].map((v) => (
                      <option key={v}>{v}</option>
                    ))}
                  </select>
                ) : (
                  <input
                    aria-label={c.name}
                    type={c.kind === "number" ? "number" : "range"}
                    min={c.min}
                    max={c.max}
                    step={(c.max - c.min) / 1000}
                    value={c.value}
                    onChange={(e) => changeControl(c, +e.target.value)}
                  />
                )}
                <div className="toolbar">
                  <button
                    onClick={() =>
                      insert(
                        `.lpf(macro(${JSON.stringify(c.name)}, ${c.value}))`,
                      )
                    }
                  >
                    Insert binding
                  </button>
                  <button
                    disabled={!midi}
                    onClick={() => {
                      setLearn(c.id);
                      setDeviceStatus(
                        "Move a MIDI CC control to learn " + c.name,
                      );
                    }}
                  >
                    MIDI learn
                  </button>
                </div>
                <div className="two-fields">
                  <label>
                    Min
                    <input
                      type="number"
                      value={c.min}
                      onChange={(e) =>
                        setControls(
                          controls.map((x) =>
                            x.id === c.id ? { ...x, min: +e.target.value } : x,
                          ),
                        )
                      }
                    />
                  </label>
                  <label>
                    Max
                    <input
                      type="number"
                      value={c.max}
                      onChange={(e) =>
                        setControls(
                          controls.map((x) =>
                            x.id === c.id ? { ...x, max: +e.target.value } : x,
                          ),
                        )
                      }
                    />
                  </label>
                </div>
              </div>
            ))}
            <div className="toolbar wrap">
              <input
                aria-label="New control name"
                value={macroname}
                onChange={(e) =>
                  setMacroname(e.target.value.replace(/[^a-zA-Z0-9_]/g, ""))
                }
              />
              <select
                aria-label="Control type"
                value={controlKind}
                onChange={(e) => setControlKind(e.target.value)}
              >
                {["slider", "number", "toggle", "button", "select"].map((c) => (
                  <option key={c}>{c}</option>
                ))}
              </select>
              <button
                onClick={() =>
                  setControls([
                    ...controls,
                    {
                      id: crypto.randomUUID(),
                      name: macroname || "control",
                      kind: controlKind,
                      min: 0,
                      max: controlKind === "slider" ? 4000 : 1,
                      value: controlKind === "slider" ? 1200 : 0,
                    },
                  ])
                }
              >
                <Plus size={14} />
                Add control
              </button>
            </div>
            <div
              className="xy-pad"
              role="slider"
              aria-label="XY control: horizontal cutoff, vertical resonance"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key.startsWith("Arrow")) {
                  e.preventDefault();
                  send("macro", {
                    name: "x",
                    value: e.key === "ArrowRight" ? 1 : 0,
                  });
                  send("macro", {
                    name: "y",
                    value: e.key === "ArrowUp" ? 1 : 0,
                  });
                }
              }}
              onPointerDown={(e) => {
                e.currentTarget.setPointerCapture(e.pointerId);
              }}
              onPointerMove={(e) => {
                if (!e.buttons) return;
                const r = e.currentTarget.getBoundingClientRect();
                send("macro", {
                  name: "x",
                  value: (e.clientX - r.left) / r.width,
                });
                send("macro", {
                  name: "y",
                  value: 1 - (e.clientY - r.top) / r.height,
                });
                e.currentTarget.style.setProperty(
                  "--x",
                  e.clientX - r.left + "px",
                );
                e.currentTarget.style.setProperty(
                  "--y",
                  e.clientY - r.top + "px",
                );
              }}
            >
              <span>XY / macro("x") · macro("y")</span>
              <i />
            </div>
            <button
              onClick={() =>
                insert(
                  '.lpf(macro("x", .5).range(100, 4000)).lpq(macro("y", .2).range(0, 10))',
                )
              }
            >
              Insert XY binding
            </button>
            <div className="pane-heading">DEVICES / EXPLICIT PERMISSION</div>
            <button onClick={connectMIDI}>
              <Plug size={14} />
              Connect MIDI
            </button>
            <p className="muted">{deviceStatus}</p>
            {devices.map((d) => (
              <div className="list-row" key={d.id}>
                {d.name} / {d.type}
              </div>
            ))}
            <p className="hint">
              {"serial" in navigator
                ? "WebSerial API detected; requires a supported secure device context."
                : "WebSerial unavailable in this browser"}
            </p>
            <p className="hint">
              {"getGamepads" in navigator
                ? "Gamepad API detected. Use gamepad() in a score."
                : "Gamepad unavailable in this browser"}
            </p>
            <p className="hint">
              OSC requires a separate secure WebSocket bridge. No bridge is
              configured.
            </p>
          </>
        )}
        {tab === "INSPECTOR" && (
          <>
            <div className="pane-heading">ACTIVE EVENT / PATTERN STATE</div>
            <p>
              Cycle {s.phase.toFixed(3)} · {s.cps.toFixed(3)} CPS
            </p>
            {s.events
              .filter((e) => e.begin <= s.phase && e.end > s.phase)
              .slice(0, 8)
              .map((e, i) => (
                <div className="event-card" key={i}>
                  <code>
                    t={e.begin.toFixed(3)} / Δ={(e.end - e.begin).toFixed(3)}
                  </code>
                  <dl>
                    {Object.entries(e.value).map(([k, v]) => (
                      <div key={k}>
                        <dt>{k}</dt>
                        <dd>{String(v)}</dd>
                      </div>
                    ))}
                  </dl>
                </div>
              ))}
            {!s.events.length && (
              <p className="muted">Play a score to inspect scheduled events.</p>
            )}
          </>
        )}
        {tab === "DOCS" && (
          <>
            <label className="search">
              <Search size={14} />
              <input
                aria-label="Search documentation"
                placeholder={word || "Function or concept…"}
                value={q}
                onChange={(e) => setQ(e.target.value)}
              />
            </label>
            <p className="hint">
              Cursor: <code>{word || "—"}</code> · Ctrl + hover in the editor
              opens upstream function docs.
            </p>
            {shown.map(([k, v]) => (
              <article className="doc-card" key={k}>
                <h3>
                  {k}
                  <span>(…)</span>
                </h3>
                <p>{v.text}</p>
                <pre>{v.example}</pre>
                <button onClick={() => insert(v.example)}>
                  Insert example
                </button>
              </article>
            ))}
            <a
              className="external-link"
              href={
                "https://strudel.cc/learn/" +
                (docs[word]?.section || "getting-started") +
                "/"
              }
              target="_blank"
              rel="noreferrer"
            >
              Official Strudel documentation ↗
            </a>
          </>
        )}
        {tab === "SAMPLES" && (
          <>
            <div className="toolbar">
              <label className="search">
                <Search size={14} />
                <input
                  aria-label="Search samples"
                  placeholder="Sample name…"
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                />
              </label>
            </div>
            <button className="full-width primary" onClick={onSampleLab}>
              <SlidersHorizontal size={15} />
              Open Sample Lab
            </button>
            <SampleBanks query={q} insert={insert} onLog={onLog} />
            <div className="pane-heading">CURATED SAMPLE PACKS</div>
            {packs.map((p) => (
              <div className="sample-card" key={p.id}>
                <b>{p.name}</b>
                <small>{p.license}</small>
                <p>{p.description}</p>
                <button
                  onClick={() =>
                    insert("\nsamples(" + sampleMapCode(p.map) + ")\n")
                  }
                >
                  Insert pack map
                </button>
              </div>
            ))}
            <div className="pane-heading">YOUR SAMPLE LIBRARY</div>
            {samples
              .filter((m) =>
                m.original_name.toLowerCase().includes(q.toLowerCase()),
              )
              .map((m) => (
                <div className="sample-card" key={m.id}>
                  <b>{m.original_name}</b>
                  <small>
                    {m.duration.toFixed(2)} s · {(m.size / 1024).toFixed(0)} KB
                  </small>
                  <audio controls preload="none" src={m.url} />
                  <button
                    onClick={() =>
                      insert(
                        sampleSnippet(
                          m.metadata.sample_name || "my_sample",
                          m.url,
                        ),
                      )
                    }
                  >
                    Insert sample
                  </button>
                </div>
              ))}
          </>
        )}
      </div>
    </aside>
  );
}
