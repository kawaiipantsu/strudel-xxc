export const scenes = [
  {
    id: "nebula",
    name: "Particle Nebula",
    detail: "A breathing cloud of light, shaped by the spectrum.",
  },
  {
    id: "liquid",
    name: "Liquid Lights",
    detail: "Soft pools of color swell with bass and dissolve into each other.",
  },
  {
    id: "sparks",
    name: "Fizzy Sparks",
    detail: "Percussive energy sends trails out through a luminous field.",
  },
  {
    id: "garden",
    name: "Mechanical Garden",
    detail: "Articulated stems bend and grow with the music.",
  },
  {
    id: "spiral",
    name: "Signal Spiral",
    detail: "A rotating helix stretches around the live waveform.",
  },
  {
    id: "ribbons",
    name: "Chromatic Ribbons",
    detail: "Layers of fine light weave around the mid frequencies.",
  },
  {
    id: "ripple",
    name: "Color Ripples",
    detail: "Expanding color rings follow transients and musical phase.",
  },
  {
    id: "tunnel",
    name: "Vector Tunnel",
    detail: "Fly through a geometric corridor driven by bass.",
  },
  {
    id: "terrain",
    name: "Spectral Landscape",
    detail: "Frequency contours form a moving wireframe horizon.",
  },
];
export const overlays = [
  { id: "spider", name: "Rainbow Spider" },
  { id: "sparks", name: "Spark Dust" },
  { id: "scope", name: "Waveform Halo" },
  { id: "code", name: "Code Fragments" },
];
export const palettes = {
  red: { name: "THUGS(red)", hues: [354, 8, 326], saturation: 88 },
  aurora: { name: "Aurora", hues: [168, 207, 270], saturation: 80 },
  neon: { name: "Electric", hues: [290, 192, 328], saturation: 90 },
  solar: { name: "Solar", hues: [24, 45, 350], saturation: 88 },
  mono: { name: "Silver", hues: [210, 220, 200], saturation: 8 },
};
export const defaultVideo = {
  source: "generated",
  vjPack: "",
  vjClip: "",
  vjRate: 1,
  vjReact: false,
  vjFit: "cover",
  scene: "nebula",
  automatic: true,
  overlays: ["scope"],
  palette: "red",
  sensitivity: 1.2,
  overlayOpacity: 0.55,
  motion: 0.7,
  cycles: 8,
  background: false,
  titles: true,
  paused: false,
  seed: 1,
};
export const clamp = (n, lo = 0, hi = 1) =>
  Math.min(hi, Math.max(lo, Number.isFinite(n) ? n : lo));
export function sanitizeVideo(input = {}) {
  return {
    source: input.source === "vj" ? "vj" : "generated",
    vjPack: typeof input.vjPack === "string" ? input.vjPack.slice(0, 100) : "",
    vjClip: /^[a-f0-9]{64}$/.test(input.vjClip || "") ? input.vjClip : "",
    vjRate: clamp(Number(input.vjRate ?? 1), 0.25, 2),
    vjReact: input.vjReact === true,
    vjFit: input.vjFit === "contain" ? "contain" : "cover",
    scene: scenes.some((s) => s.id === input.scene)
      ? input.scene
      : defaultVideo.scene,
    automatic: typeof input.automatic === "boolean" ? input.automatic : true,
    overlays: Array.isArray(input.overlays)
      ? [
          ...new Set(
            input.overlays.filter((s) => overlays.some((o) => o.id === s)),
          ),
        ]
      : ["scope"],
    palette: Object.hasOwn(palettes, input.palette || "")
      ? input.palette
      : "red",
    sensitivity: clamp(Number(input.sensitivity ?? 1.2), 0.25, 3),
    overlayOpacity: clamp(Number(input.overlayOpacity ?? 0.55)),
    motion: clamp(Number(input.motion ?? 0.7), 0.1, 1.5),
    cycles: [4, 8, 16, 32].includes(input.cycles) ? input.cycles : 8,
    background: input.background === true,
    titles: input.titles !== false,
    paused: input.paused === true,
    seed: clamp(Number(input.seed ?? 1), 1, 1000000),
  };
}

export function frequencyBands(signal) {
  const fft = Array.isArray(signal.fft) ? signal.fft : [];
  const hz =
    signal.fftBinHz ||
    (signal.sampleRate || 48000) / (2 * Math.max(1, fft.length));
  const band = (low, high) => {
    const start = Math.max(0, Math.floor(low / hz)),
      end = Math.min(fft.length, Math.max(start + 1, Math.ceil(high / hz)));
    let sum = 0;
    for (let i = start; i < end; i++) sum += clamp(fft[i] / 255);
    return sum / Math.max(1, end - start);
  };
  return { bass: band(20, 300), mid: band(300, 2500), high: band(2500, 12000) };
}

/** A director shared by preview, studio background and fullscreen. Uses actual signal/cycles. */
export class VideoDirector {
  constructor() {
    this.time = 0;
    this.energy = 0;
    this.bass = 0;
    this.mid = 0;
    this.high = 0;
    this.pulse = 0;
    this.beats = 0;
    this.lastBeat = -10;
    this.lastNow = 0;
    this.phase = 0;
    this.lastPhase = 0;
    this.cycleProgress = 0;
    this.active = false;
    this.scene = "nebula";
    this.previous = "nebula";
    this.transition = 1;
    this.shot = 0;
    this.vjShot = 0;
    this.vjCurrent = "";
    this.vjTime = 0;
    this.vjSelection = "";
    this.lastSelection = "";
    this.seed = 1;
    this.reduced = false;
  }
  choose(config) {
    const pool =
      this.energy < 0.25
        ? ["liquid", "ribbons", "nebula", "garden", "spiral"]
        : this.bass > 0.55
          ? ["tunnel", "sparks", "terrain", "spiral", "nebula"]
          : scenes.map((s) => s.id);
    const available = pool.filter((s) => s !== this.scene);
    this.seed = (Math.imul(this.seed, 1664525) + 1013904223) >>> 0;
    return available[this.seed % available.length];
  }
  next(config) {
    if (config.source === "vj") {
      this.vjShot++;
      this.cycleProgress = 0;
      return;
    }
    this.change(this.choose(config));
  }
  change(scene) {
    if (scene === this.scene) return;
    this.previous = this.scene;
    this.scene = scene;
    this.transition = 0;
    this.cycleProgress = 0;
    this.shot++;
  }
  update(signal, config, now, reduced = false) {
    const delta = this.lastNow ? clamp((now - this.lastNow) / 1000, 0, 0.1) : 0;
    this.lastNow = now;
    this.reduced = reduced;
    const selection = config.scene + ":" + config.automatic + ":" + config.seed;
    if (selection !== this.lastSelection) {
      if (config.seed !== this.configSeed) {
        this.seed = config.seed;
        this.configSeed = config.seed;
      }
      this.change(config.scene);
      this.lastSelection = selection;
    }
    const raw = Math.sqrt(clamp(signal.rms, 0, 1)) * config.sensitivity * 1.8;
    const bands = frequencyBands(signal);
    const smoothing = 1 - Math.exp(-delta * 10);
    const active = clamp(signal.rms) > 0.00005 && clamp(signal.peak) > 0.0001;
    const previousBass = this.bass;
    for (const name of ["bass", "mid", "high"])
      this[name] += ((active ? bands[name] : 0) - this[name]) * smoothing;
    this.energy += (clamp(active ? raw : 0) - this.energy) * smoothing;
    this.active = active;
    this.pulse *= Math.exp(-delta * 6);
    if (
      active &&
      now / 1000 - this.lastBeat > 0.24 &&
      bands.bass > previousBass * 1.2 + 0.035
    ) {
      this.pulse = 1;
      this.lastBeat = now / 1000;
      this.beats++;
    }
    const phase = Math.max(0, Number.isFinite(signal.phase) ? signal.phase : 0);
    const elapsedCycles = clamp(phase - this.lastPhase, 0, 1);
    this.lastPhase = phase;
    this.phase = phase;
    if (!config.paused && !reduced) {
      if (active) {
        this.time += delta * config.motion * (0.25 + this.energy * 0.9);
        this.cycleProgress += elapsedCycles;
      }
      if (active && config.automatic && this.cycleProgress >= config.cycles)
        this.next(config);
      this.transition = Math.min(1, this.transition + delta / 1.8);
    } else this.transition = 1;
    return this;
  }
}
