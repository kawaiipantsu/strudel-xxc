import "./runtime.css";
import { createMidiBridge } from "./midi-bridge";
import { encodeFloatWav } from "../audio/pcm.mjs";
import * as core from "@strudel/core";
import * as mini from "@strudel/mini";
import * as tonal from "@strudel/tonal";
import * as draw from "@strudel/draw";
import * as audio from "@strudel/webaudio";
import * as cm from "@strudel/codemirror";
import { transpiler } from "@strudel/transpiler";
import { EditorView, keymap } from "@codemirror/view";
import { StateEffect, Prec } from "@codemirror/state";
import {
  undo,
  redo,
  toggleLineComment,
  indentSelection,
} from "@codemirror/commands";
import { openSearchPanel } from "@codemirror/search";
import { setDiagnostics } from "@codemirror/lint";
import { syntaxTree } from "@codemirror/language";
const ORIGIN = "https://strudel.xxc.dk";
const send = (type: string, data: any = {}) =>
  parent.postMessage({ channel: "xxc-runtime", type, ...data }, ORIGIN);
const midiBridge = createMidiBridge(send);
let shortcutMap: Record<string, string> = {
  evaluate: "Mod+Enter",
  hush: "Mod+.",
  save: "Mod+s",
  palette: "Mod+Shift+p",
};
const states = new Map<string, any>();
let fileKey = "",
  playingFileKey = "";
let hostExtensions: any;
let mirror: any,
  loading = false,
  file = "main.strudel",
  muted = false,
  volume = 0.75,
  generation = 0;
let tap: GainNode | undefined,
  analyser: AnalyserNode | undefined,
  stereo: AnalyserNode[] = [];
let capture: AudioWorkletNode | undefined,
  captureChunks: Float32Array[][] = [],
  captureState = "inactive";
let finishCapture: (() => void) | undefined;
let captureFinished: Promise<void> = Promise.resolve();
let recordTimer: ReturnType<typeof setTimeout> | undefined;
let wave = new Float32Array(1024),
  fft = new Uint8Array(512),
  lastFrame = 0,
  disabledVisuals = false;
const orbitMix = new Map<
  string,
  {
    gain: GainNode;
    pan: StereoPannerNode;
    analyser: AnalyserNode;
    source: AudioNode;
  }
>();
const mixSettings = new Map<
  string,
  { gain: number; pan: number; mute: boolean; solo: boolean }
>();
const controllerValues: Record<string, number> = { cutoff: 1200 };
const macro = (name: string, initial = 0) =>
  core.ref(() => controllerValues[name] ?? initial);
const fail = (e: any) => {
  const message = String(e?.message || e).slice(0, 1500);
  const loc = e?.loc;
  send("error", { message, line: loc?.line, column: loc?.column });
  if (mirror) {
    const line = mirror.editor.state.doc.line(
      Math.min(Math.max(1, loc?.line || 1), mirror.editor.state.doc.lines),
    );
    mirror.editor.dispatch(
      setDiagnostics(mirror.editor.state, [
        { from: line.from, to: line.to, severity: "error", message },
      ]),
    );
  }
};
document.addEventListener("strudel.log", (event: Event) => {
  const message = String((event as CustomEvent).detail?.message || "").slice(
    0,
    1500,
  );
  if (/error:|could not load|not found|failed to/i.test(message))
    send("error", { message });
  else if (message) send("log", { message });
});
window.addEventListener("error", (e) => fail(e.error || e.message));
window.addEventListener("unhandledrejection", (e) => {
  e.preventDefault();
  fail(e.reason);
});
function wireAudio() {
  const ac = audio.getAudioContext();
  const out = audio.getSuperdoughAudioController().output.destinationGain;
  if (out !== tap) {
    tap?.disconnect();
    tap = out;
    tap!.gain.value = muted ? 0 : volume;
    analyser = ac.createAnalyser();
    analyser!.fftSize = 1024;
    tap!.connect(analyser!);
    const splitter = ac.createChannelSplitter(2);
    tap!.connect(splitter);
    stereo = [ac.createAnalyser(), ac.createAnalyser()];
    stereo.forEach((a, i) => {
      a.fftSize = 256;
      splitter.connect(a, i);
    });
  }
  tap!.gain.setTargetAtTime(muted ? 0 : volume, ac.currentTime, 0.02);
  const nodes = audio.getSuperdoughAudioController().nodes;
  Object.entries(nodes).forEach(([id, o]: [string, any]) => {
    let m = orbitMix.get(id);
    if (m?.source !== o.output) {
      const gain = ac.createGain(),
        pan = ac.createStereoPanner(),
        a = ac.createAnalyser();
      a.fftSize = 256;
      o.output.disconnect();
      o.output.connect(gain);
      gain.connect(pan);
      pan.connect(a);
      audio.getSuperdoughAudioController().output.connectToDestination(pan);
      m = { gain, pan, analyser: a, source: o.output };
      orbitMix.set(id, m);
    }
    const s = mixSettings.get(id) || {
      gain: 1,
      pan: 0,
      mute: false,
      solo: false,
    };
    const solo = [...mixSettings.values()].some((x) => x.solo);
    m!.gain.gain.setTargetAtTime(
      s.mute || (solo && !s.solo) ? 0 : s.gain,
      ac.currentTime,
      0.02,
    );
    m!.pan.pan.setTargetAtTime(s.pan, ac.currentTime, 0.02);
  });
}
let audioInitialized = false;
let observedContext: AudioContext | undefined;
async function enable() {
  const ac = audio.getAudioContext();
  if (observedContext !== ac) {
    observedContext = ac;
    ac.addEventListener("statechange", () => {
      send("audio", {
        state: ac.state,
        sampleRate: ac.sampleRate,
        latency: ac.baseLatency || 0,
      });
      if ((ac.state as string) === "interrupted" || ac.state === "closed")
        send("error", {
          message:
            "Audio output interrupted. Check your output device, then enable audio again or reload the studio.",
        });
    });
  }
  // Resume synchronously when entered from an editor gesture. Safari does not transfer gestures over postMessage.
  const resumed = ac.resume();
  const timer = setTimeout(() => {
    if (ac.state === "running") return;
    let button = document.getElementById(
      "enable-audio",
    ) as HTMLButtonElement | null;
    if (!button) {
      button = document.createElement("button");
      button.id = "enable-audio";
      button.textContent = "▶ ENABLE AUDIO / CONTINUE PLAYBACK";
      document.body.append(button);
      button.onclick = () => {
        ac.resume()
          .then(() => button?.remove())
          .catch(fail);
      };
      send("log", {
        message:
          "This browser needs a click inside the editor. Choose ENABLE AUDIO.",
      });
    }
  }, 350);
  await resumed;
  clearTimeout(timer);
  document.getElementById("enable-audio")?.remove();
  if (!audioInitialized) {
    await audio.initAudio();
    audioInitialized = true;
  }
  wireAudio();
  send("audio", {
    state: ac.state,
    sampleRate: ac.sampleRate,
    latency: ac.baseLatency || 0,
  });
}

async function evaluate(mode = "all") {
  await enable();
  playingFileKey = fileKey;
  const view = mirror.editor;
  let code = view.state.doc.toString();
  if (mode !== "all") {
    const selection = view.state.selection.main;
    let from = selection.from,
      to = selection.to;
    if (from === to) {
      let node = syntaxTree(view.state).resolveInner(from, 1);
      while (node.parent && node.parent.name !== "Script") node = node.parent;
      if (mode === "line") {
        const line = view.state.doc.lineAt(from);
        from = line.from;
        to = line.to;
      } else {
        from = node.from;
        to = node.to;
      }
    }
    code = code.slice(0, from).replace(/[^\n]/g, " ") + code.slice(from, to);
  }
  mirror.editor.dispatch(setDiagnostics(mirror.editor.state, []));
  await mirror.repl.evaluate(code, true, mode === "all");
  wireAudio();
}
async function stop() {
  mirror?.stop();
  if (captureState !== "inactive") await record("stop");
  await audio.getAudioContext().suspend();
  send("playing", { playing: false });
}
async function record(action: string, limit = 600, maxBytes = 33554432) {
  if (action === "start") {
    if (captureState !== "inactive") return;
    await enable();
    const ac = audio.getAudioContext();
    await ac.audioWorklet.addModule(ORIGIN + "/pcm-worklet.js");
    captureChunks = [];
    captureFinished = new Promise<void>((resolve) => {
      finishCapture = resolve;
    });
    capture = new AudioWorkletNode(ac, "xxc-capture", {
      numberOfOutputs: 1,
      outputChannelCount: [2],
    });
    tap!.connect(capture);
    const silent = ac.createGain();
    silent.gain.value = 0;
    capture.connect(silent);
    silent.connect(ac.destination);
    capture.port.onmessage = (e) => {
      if (e.data.channels) captureChunks.push(e.data.channels);
      if (e.data.done) {
        const n = captureChunks.reduce((n, c) => n + c[0].length, 0);
        const channels = [new Float32Array(n), new Float32Array(n)];
        let offset = 0;
        for (const block of captureChunks) {
          channels.forEach((c, i) => c.set(block[i], offset));
          offset += block[0].length;
        }
        send("recorded", {
          blob: new Blob([encodeFloatWav(channels, ac.sampleRate)], {
            type: "audio/wav",
          }),
        });
        captureChunks = [];
        capture?.disconnect();
        silent.disconnect();
        capture = undefined;
        finishCapture?.();
        finishCapture = undefined;
      }
    };
    captureState = "recording";
    recordTimer = setTimeout(
      () => {
        send("log", {
          message:
            "Recording stopped at the configured duration or upload size limit.",
        });
        record("stop");
      },
      Math.min(
        1800,
        limit,
        Math.max(1, Math.floor((maxBytes - 1024) / (ac.sampleRate * 8))),
      ) * 1000,
    );
  } else if (action === "stop" && capture) {
    clearTimeout(recordTimer);
    capture.port.postMessage("stop");
    tap?.disconnect(capture);
    captureState = "inactive";
    await Promise.race([
      captureFinished,
      new Promise((resolve) => setTimeout(resolve, 2000)),
    ]);
  } else if (action === "pause" && capture) {
    capture.port.postMessage("pause");
    captureState = "paused";
  } else if (action === "resume" && capture) {
    capture.port.postMessage("resume");
    captureState = "recording";
  }
  send("recording", { state: captureState });
}

function tick(now: number) {
  requestAnimationFrame(tick);
  if (document.hidden || disabledVisuals || now - lastFrame < 50) return;
  lastFrame = now;
  if (!mirror) return;
  const ac = audio.getAudioContext();
  const playing = mirror.repl.state.started && ac.state === "running";
  if (playing) wireAudio();
  analyser?.getFloatTimeDomainData(wave);
  analyser?.getByteFrequencyData(fft);
  let rms = 0,
    peak = 0;
  for (const v of wave) {
    rms += v * v;
    peak = Math.max(peak, Math.abs(v));
  }
  rms = Math.sqrt(rms / wave.length);
  const phase = Number(mirror.repl.scheduler.now() || 0);
  const pattern = mirror.repl.state.pattern;
  let events: any[] = [];
  if (playing && pattern) {
    try {
      events = pattern
        .queryArc(phase - 1, phase + 1)
        .slice(0, 128)
        .map((h: any) => ({
          begin: Number(h.whole?.begin ?? h.part.begin),
          end: Number(h.whole?.end ?? h.part.end),
          value: h.value,
          locations: h.context?.locations,
        }))
        .map((h: any) => ({
          ...h,
          value: Object.fromEntries(
            Object.entries(
              typeof h.value === "object" ? h.value : { s: h.value },
            ).filter(([, v]) =>
              ["string", "number", "boolean"].includes(typeof v),
            ),
          ),
        }));
    } catch {}
  }
  const levels = (a: AnalyserNode) => {
    const b = new Float32Array(a.fftSize);
    a.getFloatTimeDomainData(b);
    return Math.sqrt(b.reduce((s, v) => s + v * v, 0) / b.length);
  };
  send("frame", {
    wave: Array.from(wave.filter((_, i) => i % 4 === 0)),
    fft: Array.from(fft.filter((_, i) => i % 4 === 0)),
    rms: playing ? rms : 0,
    peak: playing ? peak : 0,
    phase,
    cps: mirror.repl.scheduler.cps,
    events,
    stereo: stereo.map(levels),
    stereoWave: stereo.map((a) => {
      const b = new Float32Array(a.fftSize);
      a.getFloatTimeDomainData(b);
      return Array.from(b);
    }),
    orbits: [...orbitMix].map(([id, m]) => ({
      id,
      level: playing ? levels(m.analyser) : 0,
    })),
  });
}
function command(cmd: string, arg?: any) {
  const v = mirror.editor;
  switch (cmd) {
    case "undo":
      undo(v);
      break;
    case "redo":
      redo(v);
      break;
    case "comment":
      toggleLineComment(v);
      break;
    case "find":
      openSearchPanel(v);
      break;
    case "format":
      import("prettier/standalone")
        .then(async (p) => {
          const plugins = await Promise.all([
            import("prettier/plugins/babel"),
            import("prettier/plugins/estree"),
          ]);
          const code = await p.format(mirror.code, {
            parser: "babel",
            plugins,
            semi: false,
            singleQuote: true,
          });
          mirror.setCode(code);
        })
        .catch(fail);
      break;
    case "indent":
      indentSelection(v);
      break;
    case "insert":
      v.dispatch(v.state.replaceSelection(String(arg)));
      break;
    case "append":
      mirror.appendCode(String(arg));
      break;
    case "focus": {
      const l = v.state.doc.line(
        Math.min(Math.max(1, Number(arg)), v.state.doc.lines),
      );
      v.dispatch({ selection: { anchor: l.from }, scrollIntoView: true });
      break;
    }
    case "duplicate": {
      const sel = v.state.selection.main;
      const l = sel.empty ? v.state.doc.lineAt(sel.head) : sel;
      const text = v.state.doc.sliceString(l.from, l.to);
      v.dispatch({ changes: { from: l.to, insert: "\n" + text } });
      break;
    }
  }
  v.focus();
}
let features = { hydra: true, midi: true };
async function main() {
  await core.evalScope(
    core,
    mini,
    tonal,
    audio,
    draw,
    cm,
    import("@strudel/xen"),
    import("@strudel/gamepad"),
    import("@strudel/soundfonts"),
    import("@strudel/serial"),
    import("@strudel/osc"),
    { macro },
  );
  const hydra = await import("@strudel/hydra");
  await core.evalScope({
    ...hydra,
    initHydra: async (options: any = {}) => {
      if (!features.hydra)
        throw new Error("Hydra disabled by the administrator");
      (globalThis as any).global = globalThis;
      (globalThis as any).Hydra = (await import("hydra-synth")).default;
      return hydra.initHydra({
        ...options,
        src: "/assets/hydra-loader.js",
        detectAudio: false,
      });
    },
  });
  audio.registerWaveTable("xxc_wt", [ORIGIN + "/samples/xxc_wavetable.wav"], {
    frameLen: 2048,
  });
  await audio.registerSynthSounds();
  await audio.registerZZFXSounds();
  await audio.samples(
    {
      bd: "/samples/bd.wav",
      sd: "/samples/sd.wav",
      hh: "/samples/hh.wav",
      oh: "/samples/oh.wav",
      cp: "/samples/cp.wav",
      rim: "/samples/rim.wav",
      tone: "/samples/tone.wav",
    },
    ORIGIN,
  );
  mirror = new cm.StrudelMirror({
    root: document.getElementById("editor"),
    initialCode: "// Loading project…",
    prebake: () => Promise.resolve(),
    transpiler,
    defaultOutput: audio.webaudioOutput,
    getTime: () => audio.getAudioContext().currentTime,
    beforeStart: enable,
    onEvalError: fail,
    onToggle: (playing: boolean) => send("playing", { playing }),
    afterEval: () => send("evaluated"),
    drawContext: draw.getDrawContext(),
    drawTime: [-2, 2],
    autodraw: false,
  });
  const highlight = mirror.highlight.bind(mirror);
  mirror.highlight = (haps: any, time: number) => {
    if (fileKey === playingFileKey) highlight(haps, time);
  };
  mirror.updateSettings({
    ...cm.defaultSettings,
    fontFamily: "JetBrains Mono Variable, monospace",
    fontSize: 14,
    theme: "vscodeDark",
    isAutoCompletionEnabled: true,
    isTooltipEnabled: true,
    isActiveLineHighlighted: true,
    isBracketMatchingEnabled: true,
    isMultiCursorEnabled: true,
    isTabIndentationEnabled: true,
  });
  hostExtensions = [
    EditorView.updateListener.of((v) => {
      if (v.docChanged && !loading)
        send("code", { file, code: v.state.doc.toString(), generation });
      if (v.selectionSet) {
        const pos = v.state.selection.main.head,
          line = v.state.doc.lineAt(pos),
          word = v.state.wordAt(pos);
        send("cursor", {
          line: line.number,
          column: pos - line.from + 1,
          word: word ? v.state.sliceDoc(word.from, word.to) : "",
        });
      }
    }),
    Prec.highest(
      keymap.of([
        {
          key: "Mod-Enter",
          run: () => {
            evaluate("block").catch(fail);
            return true;
          },
        },
        {
          key: "Shift-Enter",
          run: () => {
            evaluate("line").catch(fail);
            return true;
          },
        },
        {
          key: "Mod-.",
          run: () => {
            stop();
            return true;
          },
        },
        {
          key: "Mod-s",
          run: () => {
            send("shortcut", { command: "save" });
            return true;
          },
        },
        {
          key: "Mod-p",
          run: () => {
            send("shortcut", { command: "quickopen" });
            return true;
          },
        },
        {
          key: "Mod-Shift-p",
          run: () => {
            send("shortcut", { command: "palette" });
            return true;
          },
        },
        {
          key: "F1",
          run: () => {
            send("shortcut", { command: "palette" });
            return true;
          },
        },
      ]),
    ),
  ];
  mirror.editor.dispatch({
    effects: StateEffect.appendConfig.of(hostExtensions),
  });
  mirror.editor.dom.addEventListener("contextmenu", (e: MouseEvent) => {
    e.preventDefault();
    const s = mirror.editor.state.selection.main;
    send("context", {
      x: e.clientX,
      y: e.clientY,
      selection: mirror.editor.state.sliceDoc(s.from, s.to),
    });
  });
  window.addEventListener(
    "keydown",
    (e) => {
      for (const [name, binding] of Object.entries(shortcutMap)) {
        const parts = binding.toLowerCase().split("+");
        const key = parts.at(-1);
        if (
          e.key.toLowerCase() === key &&
          (!parts.includes("mod") || e.ctrlKey || e.metaKey) &&
          parts.includes("shift") === e.shiftKey &&
          (!parts.includes("alt") || e.altKey)
        ) {
          e.preventDefault();
          e.stopImmediatePropagation();
          if (name === "evaluate") evaluate("block").catch(fail);
          else if (name === "hush") stop();
          else send("shortcut", { command: name });
          return;
        }
      }
    },
    true,
  );
  window.addEventListener("message", async (e) => {
    if (
      e.source !== parent ||
      e.origin !== ORIGIN ||
      e.data?.channel !== "xxc-host"
    )
      return;
    const d = e.data;
    try {
      switch (d.type) {
        case "features":
          features = { hydra: !!d.hydra, midi: !!d.midi };
          break;
        case "midi-ports":
          if (!features.midi)
            throw new Error("MIDI disabled by the administrator");
          await midiBridge.ports(d);
          break;
        case "midi-input":
          midiBridge.input(d);
          break;
        case "shortcuts":
          shortcutMap = d.values;
          break;
        case "project-key": {
          const prefix = String(d.from) + ":",
            next = String(d.to) + ":";
          for (const [key, state] of states)
            if (key.startsWith(prefix))
              states.set(next + key.slice(prefix.length), state);
          if (fileKey.startsWith(prefix))
            fileKey = next + fileKey.slice(prefix.length);
          if (playingFileKey.startsWith(prefix))
            playingFileKey = next + playingFileKey.slice(prefix.length);
          break;
        }
        case "load": {
          loading = true;
          const key = String(d.projectKey || "draft") + ":" + d.file;
          const code = String(d.code).slice(0, 1000000);
          if (fileKey) states.set(fileKey, mirror.editor.state);
          let state = states.get(key);
          if (!state || state.doc.toString() !== code) {
            const tempRoot = document.createElement("div");
            const temporary = cm.initEditor({
              root: tempRoot,
              initialCode: code,
              onChange: (v: any) => {
                if (v.docChanged) {
                  mirror.code = v.state.doc.toString();
                  mirror.repl.setCode(mirror.code);
                }
              },
              onEvaluate: () => evaluate("block"),
              onStop: stop,
            });
            state = temporary.state.update({
              effects: StateEffect.appendConfig.of(hostExtensions),
            }).state;
            temporary.destroy();
          }
          mirror.editor.setState(state);
          mirror.code = code;
          mirror.repl.setCode(code);
          file = d.file;
          fileKey = key;
          generation = d.generation;
          loading = false;
          mirror.setTheme(
            document.body.dataset.theme === "light"
              ? "vscodeLight"
              : "vscodeDark",
          );
          break;
        }
        case "evaluate":
          await evaluate(d.mode);
          break;
        case "stop":
          await stop();
          break;
        case "volume":
          volume = Math.max(0, Math.min(1, Number(d.value)));
          wireAudio();
          break;
        case "theme":
          document.body.dataset.theme = d.value;
          mirror.setTheme(d.value === "light" ? "vscodeLight" : "vscodeDark");
          break;
        case "font":
          mirror.setFontSize(Math.max(10, Math.min(28, Number(d.value))));
          break;
        case "command":
          command(d.command, d.arg);
          break;
        case "record":
          await record(d.action, d.limit, d.maxBytes);
          break;
        case "macro":
          controllerValues[String(d.name).slice(0, 50)] = Number(d.value);
          break;
        case "mixer":
          mixSettings.set(String(d.id), d.value);
          wireAudio();
          break;
        case "visuals":
          disabledVisuals = d.off;
          break;
        case "samples":
          await audio.samples(d.map);
          break;
        case "capabilities":
          send("capabilities", {
            gamepad: "getGamepads" in navigator,
            audioWorklet: !!audio.getAudioContext().audioWorklet,
          });
          break;
        case "midi-enable":
          try {
            await core.evalScope(import("@strudel/midi"));
            await (globalThis as any).enableWebMidi();
            send("log", { message: "MIDI enabled" });
          } catch {
            send("log", {
              message:
                "MIDI requires the trusted device bridge; open Controls → Connect MIDI.",
            });
          }
          break;
      }
    } catch (e) {
      fail(e);
    }
  });
  send("ready");
  requestAnimationFrame(tick);
}
main().catch(fail);
