import "./runtime.css";
import { createMidiBridge } from "./midi-bridge";
import { encodeFloatWav } from "../audio/pcm.mjs";
import { createSchedulerClock } from "../audio/scheduler-clock";
import { sampleQuoteRepairs } from "../samples/sample-code.mjs";
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
const schedulerClock = createSchedulerClock(() => audio.getAudioContext());
let allowBackgroundMusic = true;
function configureAudioSession() {
  const session = (
    navigator as Navigator & {
      audioSession?: { type: string };
    }
  ).audioSession;
  if (!session) return;
  try {
    session.type = allowBackgroundMusic ? "playback" : "auto";
  } catch {
    send("log", {
      message: "The browser could not set its background audio policy.",
    });
  }
}
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
let hushed = true;
let stopPending: Promise<void> | undefined;
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
    tap!.gain.value = muted || hushed ? 0 : volume;
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
  tap!.gain.setTargetAtTime(muted || hushed ? 0 : volume, ac.currentTime, 0.02);
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
  if (document.hidden && !allowBackgroundMusic)
    throw new Error(
      "Return to the studio to play, or enable Allow background music.",
    );
  configureAudioSession();
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
        send("log", {
          message:
            "Browser or output device interrupted audio. Return to the studio and click Play / Enable Audio to continue.",
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
  await schedulerClock.initialize();
  if (document.hidden && !allowBackgroundMusic) {
    await ac.suspend();
    throw new Error(
      "Playback cancelled because Allow background music is off.",
    );
  }
  wireAudio();
  send("audio", {
    state: ac.state,
    sampleRate: ac.sampleRate,
    latency: ac.baseLatency || 0,
  });
}

async function evaluate(mode = "all") {
  if (document.hidden && !allowBackgroundMusic) return;
  if (stopPending) await stopPending;
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
  const repairs = sampleQuoteRepairs(code);
  if (repairs.length) {
    let button = document.getElementById(
      "repair-sample-urls",
    ) as HTMLButtonElement | null;
    if (!button) {
      button = document.createElement("button");
      button.id = "repair-sample-urls";
      document.body.append(button);
    }
    button.textContent = "REPAIR SAMPLE MAP QUOTES & PLAY";
    button.onclick = () => {
      // Recompute against the current document so edits made while the prompt is visible are safe.
      const changes = sampleQuoteRepairs(view.state.doc.toString());
      if (changes.length)
        view.dispatch({ changes, userEvent: "input.sample-repair" });
      button?.remove();
      send("log", {
        message:
          "Sample map strings changed to single quotes. The change is visible in the editor and can be undone.",
      });
      evaluate(mode).catch(fail);
    };
    send("error", {
      message:
        "Sample maps need single-quoted strings. Double quotes invoke mini notation. Use REPAIR SAMPLE MAP QUOTES & PLAY in the editor, or reinsert the sample.",
    });
    return;
  }
  document.getElementById("repair-sample-urls")?.remove();
  await mirror.repl.evaluate(code, true, mode === "all");
  hushed = false;
  wireAudio();
}
function stop(): Promise<void> {
  if (stopPending) return stopPending;
  const work = async () => {
    hushed = true;
    const ac = audio.getAudioContext();
    tap?.gain.cancelScheduledValues(ac.currentTime);
    tap?.gain.setValueAtTime(0, ac.currentTime);
    mirror?.stop();
    const recordingStopped =
      captureState !== "inactive" ? record("stop") : Promise.resolve();
    // Suspending alone freezes old scheduled voices and delay tails. Reset the official
    // output/orbit graph so those nodes can never rejoin the next score on resume.
    if (audioInitialized) audio.resetGlobalEffects();
    for (const orbit of orbitMix.values()) {
      orbit.gain.disconnect();
      orbit.pan.disconnect();
      orbit.analyser.disconnect();
    }
    orbitMix.clear();
    tap = undefined;
    analyser = undefined;
    stereo = [];
    wave.fill(0);
    fft.fill(0);
    await recordingStopped;
    // WebKit can leave suspend() pending on a context that has never been unlocked.
    // An already suspended context needs no additional state transition.
    if (ac.state === "running") await ac.suspend();
    send("playing", { playing: false });
  };
  stopPending = work().finally(() => {
    stopPending = undefined;
  });
  return stopPending;
}
document.addEventListener("visibilitychange", () => {
  if (document.hidden) {
    if (
      !allowBackgroundMusic &&
      (mirror?.repl.state.started || captureState !== "inactive")
    ) {
      send("log", {
        message:
          "Hushed because Allow background music is off. Press Play when you return.",
      });
      stop().catch(fail);
    }
  } else if (
    allowBackgroundMusic &&
    mirror?.repl.state.started &&
    observedContext?.state !== "running"
  ) {
    // Resume the existing context only; never reevaluate shared or edited source.
    enable().catch(fail);
  }
});
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
    sampleRate: ac.sampleRate,
    fftBinHz: (ac.sampleRate / (analyser?.fftSize || 1024)) * 4,
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
  const soundfonts = await import("@strudel/soundfonts");
  await core.evalScope(
    core,
    mini,
    tonal,
    audio,
    draw,
    cm,
    import("@strudel/xen"),
    import("@strudel/gamepad"),
    soundfonts,
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
  // The official REPL registers the GM instrument names at startup; their audio loads on demand.
  soundfonts.registerSoundfonts();
  send("log", {
    message: "General MIDI soundfonts registered; audio loads on first use.",
  });
  await audio.samples(
    {
      xxc_bd: "/samples/bd.wav",
      xxc_sd: "/samples/sd.wav",
      xxc_hh: "/samples/hh.wav",
      xxc_oh: "/samples/oh.wav",
      xxc_cp: "/samples/cp.wav",
      xxc_rim: "/samples/rim.wav",
      tone: "/samples/tone.wav",
    },
    ORIGIN,
  );
  try {
    const response = await fetch(ORIGIN + "/sample-banks/runtime.json", {
      cache: "no-cache",
    });
    if (!response.ok)
      throw new Error("Sample catalogue HTTP " + response.status);
    const catalogue = await response.json();
    // Keep official pitched maps, variant order, wt_ handling and bank aliases.
    // Only the audio URLs change to the installed, verified local mirror.
    for (const collection of catalogue.collections)
      await audio.samples(collection.map, "", {
        prebake: true,
        tag:
          collection.id === "machines" ||
          collection.id === "uzu" ||
          collection.id === "mridangam"
            ? "drum-machines"
            : undefined,
      });
    await audio.aliasBank(catalogue.aliases);
    send("log", {
      message: `Sample banks ready: ${catalogue.stats.sounds} sounds / ${catalogue.stats.files} local audio files.`,
    });
  } catch (error) {
    // Keep the editor usable during a failed/offline installation, but make missing banks explicit.
    fail(
      new Error(
        "Default sample banks unavailable. Reload when online or reinstall the sample banks. " +
          String(error),
      ),
    );
  }
  mirror = new cm.StrudelMirror({
    root: document.getElementById("editor"),
    initialCode: "// Loading project…",
    prebake: () => Promise.resolve(),
    transpiler,
    defaultOutput: audio.webaudioOutput,
    getTime: () => audio.getAudioContext().currentTime,
    setInterval: (callback: () => void, milliseconds: number) =>
      schedulerClock.setInterval(() => {
        callback();
        // Orbit routing must keep working when visual animation is suspended.
        wireAudio();
      }, milliseconds),
    clearInterval: schedulerClock.clearInterval,
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
        case "background-music":
          allowBackgroundMusic = d.enabled === true;
          if (audioInitialized) configureAudioSession();
          if (
            !allowBackgroundMusic &&
            document.hidden &&
            (mirror.repl.state.started || captureState !== "inactive")
          )
            await stop();
          break;
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
          document.getElementById("repair-sample-urls")?.remove();
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
