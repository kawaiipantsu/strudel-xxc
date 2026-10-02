import { useState, useRef, useEffect } from "react";
import {
  Mic,
  Play,
  Square,
  Upload,
  Scissors,
  Undo2,
  Download,
  Save,
  ArrowRight,
} from "lucide-react";
import { api, download } from "../app/api";
import { encodeWav, editPCM, trimSilence, resamplePCM } from "../audio/pcm.mjs";
import type { Media } from "../app/types";
import { sampleSnippet } from "./sample-code.mjs";
export function SampleLab({
  ensureProject,
  onInsert,
  onLog,
}: {
  ensureProject: () => Promise<string>;
  onInsert: (code: string) => void;
  onLog: (text: string) => void;
}) {
  const [channels, setChannels] = useState<Float32Array[]>([]),
    [rate, setRate] = useState(44100),
    [name, setName] = useState("my_sample"),
    [range, setRange] = useState<[number, number]>([0, 1]),
    [zoom, setZoom] = useState(1),
    [gain, setGain] = useState(1),
    [speed, setSpeed] = useState(1),
    [loop, setLoop] = useState(false),
    [history, setHistory] = useState<Float32Array[][]>([]),
    [recording, setRecording] = useState(false),
    [busy, setBusy] = useState(false),
    [saved, setSaved] = useState<Media>(),
    [status, setStatus] = useState(
      "Drop an audio file here, or record a microphone.",
    ),
    [license, setLicense] = useState("Original recording / own work");
  const canvas = useRef<HTMLCanvasElement>(null),
    input = useRef<HTMLInputElement>(null),
    ctx = useRef<AudioContext | null>(null),
    source = useRef<AudioBufferSourceNode | null>(null),
    recorder = useRef<MediaRecorder | null>(null),
    stream = useRef<MediaStream | null>(null);
  const n = channels[0]?.length || 0,
    duration = n / rate;
  useEffect(
    () => () => {
      source.current?.stop();
      stream.current?.getTracks().forEach((t) => t.stop());
      ctx.current?.close();
    },
    [],
  );
  async function load(blob: Blob, filename = "recording") {
    try {
      ctx.current ??= new AudioContext();
      const b = await ctx.current.decodeAudioData(await blob.arrayBuffer());
      setChannels(
        Array.from({ length: b.numberOfChannels }, (_, i) =>
          b.getChannelData(i).slice(),
        ),
      );
      setRate(b.sampleRate);
      setName(
        filename
          .replace(/\.[^.]+$/, "")
          .replace(/[^a-zA-Z0-9_]/g, "_")
          .toLowerCase(),
      );
      setRange([0, 1]);
      setHistory([]);
      setSaved(undefined);
      setStatus(
        `${b.duration.toFixed(2)} s · ${b.sampleRate} Hz · ${b.numberOfChannels} channel(s)`,
      );
    } catch {
      setStatus(
        "This file could not be decoded as audio. Try WAV, MP3, FLAC, OGG or M4A.",
      );
    }
  }
  useEffect(() => {
    const c = canvas.current;
    if (!c) return;
    const draw = () => {
      const r = c.getBoundingClientRect();
      c.width = r.width * devicePixelRatio;
      c.height = r.height * devicePixelRatio;
      const x = c.getContext("2d")!,
        w = c.width,
        h = c.height;
      x.clearRect(0, 0, w, h);
      x.strokeStyle = "#ff3b47";
      x.fillStyle = "#ff3b4722";
      x.fillRect(range[0] * w, 0, (range[1] - range[0]) * w, h);
      x.lineWidth = 1.3;
      x.beginPath();
      const data = channels[0];
      if (data) {
        for (let px = 0; px < w; px++) {
          let max = 0;
          const begin = Math.floor((px / w) * data.length);
          const end = Math.floor(((px + 1) / w) * data.length);
          for (let i = begin; i <= end && i < data.length; i++)
            max = Math.max(max, Math.abs(data[i]));
          x.moveTo(px, h / 2 - max * h * 0.46);
          x.lineTo(px, h / 2 + max * h * 0.46);
        }
      }
      x.stroke();
      x.strokeStyle = "#788598";
      x.beginPath();
      x.moveTo(0, h / 2);
      x.lineTo(w, h / 2);
      x.stroke();
    };
    draw();
    const o = new ResizeObserver(draw);
    o.observe(c);
    return () => o.disconnect();
  }, [channels, range, zoom]);
  function edit(operation: string) {
    setHistory((h) => [...h.slice(-7), channels]);
    const next =
      operation === "trim-silence"
        ? trimSilence(channels)
        : editPCM(channels, operation, range[0], range[1], gain);
    setChannels(next);
    setRange([0, 1]);
    setSaved(undefined);
  }
  function play() {
    source.current?.stop();
    ctx.current ??= new AudioContext();
    ctx.current.resume();
    const b = ctx.current.createBuffer(channels.length, n, rate);
    channels.forEach((c, i) =>
      b.copyToChannel(c as Float32Array<ArrayBuffer>, i),
    );
    const s = ctx.current.createBufferSource();
    s.buffer = b;
    s.playbackRate.value = speed;
    s.loop = loop;
    s.loopStart = range[0] * duration;
    s.loopEnd = range[1] * duration;
    s.connect(ctx.current.destination);
    s.start(
      0,
      range[0] * duration,
      loop ? undefined : (range[1] - range[0]) * duration,
    );
    source.current = s;
  }
  async function mic() {
    try {
      if (recording) {
        recorder.current?.stop();
        setRecording(false);
        return;
      }
      if (!navigator.mediaDevices?.getUserMedia)
        throw new Error("Microphone unavailable in this browser");
      stream.current = await navigator.mediaDevices.getUserMedia({
        audio: true,
      });
      const r = new MediaRecorder(stream.current);
      recorder.current = r;
      const chunks: Blob[] = [];
      r.ondataavailable = (e) => chunks.push(e.data);
      r.onstop = () => {
        load(new Blob(chunks, { type: r.mimeType }));
        stream.current?.getTracks().forEach((t) => t.stop());
      };
      r.start();
      setRecording(true);
      setTimeout(() => {
        if (r.state === "recording") {
          r.stop();
          setRecording(false);
        }
      }, 300000);
    } catch (e) {
      setStatus(String(e));
    }
  }
  async function save() {
    setBusy(true);
    try {
      const id = await ensureProject();
      const form = new FormData();
      form.append(
        "file",
        new Blob([encodeWav(channels, rate)], { type: "audio/wav" }),
        name + ".wav",
      );
      form.append("project_id", id);
      form.append("license", license);
      const m = await api<Media>("samples", "POST", form);
      setSaved(m);
      setStatus("Sample saved in your project library.");
      onLog("Sample saved: " + m.original_name);
    } catch (e) {
      setStatus(String(e));
    } finally {
      setBusy(false);
    }
  }
  return (
    <section
      className="sample-lab"
      onDragOver={(e) => e.preventDefault()}
      onDrop={(e) => {
        e.preventDefault();
        const f = e.dataTransfer.files[0];
        if (f) load(f, f.name);
      }}
    >
      <div className="section-intro">
        <span className="eyebrow">[ SAMPLE LAB / PCM EDITOR ]</span>
        <h2>Shape your own signal.</h2>
        <p>
          Record, select, cut, transform. Save a sound and play it straight from
          Strudel.
        </p>
      </div>
      <div className="toolbar wrap">
        <button onClick={() => input.current?.click()}>
          <Upload size={15} />
          Open audio
        </button>
        <button className={recording ? "danger" : ""} onClick={mic}>
          <Mic size={15} />
          {recording ? "Stop microphone" : "Record microphone"}
        </button>
        <input
          hidden
          ref={input}
          type="file"
          accept="audio/*,.wav,.flac,.m4a"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) load(f, f.name);
          }}
        />
        <span className="muted">{status}</span>
      </div>
      <div className="wave-scroll">
        <canvas
          ref={canvas}
          className="lab-wave"
          style={{ width: zoom * 100 + "%" }}
          aria-label="Sample waveform. Drag to select a region."
          onPointerDown={(e) => {
            const el = e.currentTarget;
            el.setPointerCapture(e.pointerId);
            const rect = el.getBoundingClientRect();
            const start = (e.clientX - rect.left) / rect.width;
            setRange([start, start]);
            const move = (ev: PointerEvent) => {
              const end = Math.max(
                0,
                Math.min(1, (ev.clientX - rect.left) / rect.width),
              );
              setRange([Math.min(start, end), Math.max(start, end)]);
            };
            const up = () => {
              el.removeEventListener("pointermove", move);
              el.removeEventListener("pointerup", up);
            };
            el.addEventListener("pointermove", move);
            el.addEventListener("pointerup", up);
          }}
        />
      </div>
      <div className="toolbar wrap">
        <label>
          Start (s)
          <input
            type="number"
            min="0"
            max={duration}
            step=".01"
            value={(range[0] * duration).toFixed(2)}
            onChange={(e) =>
              setRange([
                Math.min(range[1], +e.target.value / Math.max(0.001, duration)),
                range[1],
              ])
            }
          />
        </label>
        <label>
          End (s)
          <input
            type="number"
            min="0"
            max={duration}
            step=".01"
            value={(range[1] * duration).toFixed(2)}
            onChange={(e) =>
              setRange([
                range[0],
                Math.max(
                  range[0],
                  Math.min(1, +e.target.value / Math.max(0.001, duration)),
                ),
              ])
            }
          />
        </label>
        <label>
          Zoom
          <input
            type="range"
            min="1"
            max="8"
            value={zoom}
            onChange={(e) => setZoom(+e.target.value)}
          />
        </label>
      </div>
      <fieldset disabled={!n || busy}>
        <div className="toolbar wrap">
          <button onClick={play}>
            <Play size={15} />
            Audition
          </button>
          <button onClick={() => source.current?.stop()}>
            <Square size={15} />
            Stop
          </button>
          <label>
            <input
              type="checkbox"
              checked={loop}
              onChange={(e) => setLoop(e.target.checked)}
            />
            Loop selection
          </label>
          <label>
            Playback rate
            <input
              type="number"
              min=".25"
              max="4"
              step=".05"
              value={speed}
              onChange={(e) => setSpeed(+e.target.value)}
            />
          </label>
          <button
            disabled={!history.length}
            onClick={() => {
              setChannels(history.at(-1)!);
              setHistory((h) => h.slice(0, -1));
              setRange([0, 1]);
            }}
          >
            <Undo2 size={15} />
            Undo
          </button>
        </div>
        <div className="toolbar wrap">
          {[
            "crop",
            "cut",
            "duplicate",
            "reverse",
            "normalize",
            "fade-in",
            "fade-out",
            "trim-silence",
          ].map((op) => (
            <button key={op} onClick={() => edit(op)}>
              {op === "crop" && <Scissors size={14} />}{" "}
              {op.replaceAll("-", " ")}
            </button>
          ))}
          <label>
            Gain
            <input
              type="number"
              min="0"
              max="4"
              step=".1"
              value={gain}
              onChange={(e) => setGain(+e.target.value)}
            />
          </label>
          <button onClick={() => edit("gain")}>Apply gain</button>
          <button
            onClick={() => {
              setHistory((h) => [...h.slice(-7), channels]);
              setChannels(resamplePCM(channels, rate, 48000));
              setRate(48000);
            }}
          >
            Resample 48 kHz
          </button>
        </div>
        <div className="form-grid">
          <label>
            Sample name
            <input
              value={name}
              onChange={(e) =>
                setName(e.target.value.replace(/[^a-zA-Z0-9_]/g, "_"))
              }
            />
          </label>
          <label>
            Rights / source
            <input
              value={license}
              onChange={(e) => setLicense(e.target.value)}
            />
          </label>
        </div>
        <div className="toolbar">
          <button
            onClick={() =>
              download(
                new Blob([encodeWav(channels, rate)], { type: "audio/wav" }),
                name + ".wav",
              )
            }
          >
            <Download size={15} />
            Export WAV
          </button>
          <button className="primary" onClick={save}>
            <Save size={15} />
            {busy ? "Saving…" : "Save to project"}
          </button>
          {saved && (
            <button onClick={() => onInsert(sampleSnippet(name, saved.url))}>
              Insert into Strudel
              <ArrowRight size={15} />
            </button>
          )}
        </div>
      </fieldset>
    </section>
  );
}
