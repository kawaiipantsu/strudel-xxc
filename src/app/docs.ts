export const docs: Record<
  string,
  { text: string; example: string; section: string }
> = {
  s: {
    text: "Select a synthesizer or sample by name. Mini notation can sequence sounds, indices and gains.",
    example: 's("bd*4, hh*8").gain(.4)',
    section: "samples",
  },
  note: {
    text: "Sequence pitches using note names or MIDI numbers. Angle brackets alternate values between cycles.",
    example: 'note("<c3 eb3 g3 bb3>").s("triangle")',
    section: "first-notes",
  },
  n: {
    text: "Set sample indices or scale degrees. Combine with scale() to turn numbers into pitches.",
    example: 'n("0 2 4 7").scale("C4:minor").s("sine")',
    section: "tonal",
  },
  lpf: {
    text: "Low-pass filter cutoff in hertz. Lower values remove high frequencies. Pattern the value or use a slider.",
    example: ".lpf(slider(800, 100, 4000))",
    section: "effects",
  },
  room: {
    text: "Amount sent to the orbit reverb. Use roomsize() to change the room size; orbits isolate effect buses.",
    example: ".room(.5).roomsize(4)",
    section: "effects",
  },
  delay: {
    text: "Amount sent to delay. delaytime() controls the interval and delayfeedback() controls repeats.",
    example: ".delay(.4).delaytime(.25).delayfeedback(.35)",
    section: "effects",
  },
  gain: {
    text: "Set the event amplitude. Keep headroom when stacking voices. The master meter shows actual output.",
    example: '.gain(".6 .3 .4 .3")',
    section: "effects",
  },
  fast: {
    text: "Speed up a pattern by a factor. A factor of two fits two copies into the original time.",
    example: ".fast(2)",
    section: "time-modifiers",
  },
  slow: {
    text: "Stretch a pattern across more cycles without changing the global tempo.",
    example: ".slow(2)",
    section: "time-modifiers",
  },
  rev: {
    text: "Reverse the order of events in a cycle.",
    example: ".rev()",
    section: "time-modifiers",
  },
  stack: {
    text: "Play patterns at the same time. Each pattern keeps its own controls.",
    example: 'stack(s("bd*4"), s("hh*8").gain(.2))',
    section: "creating-patterns",
  },
  slider: {
    text: "Official Strudel inline widget. Drag the slider to update the value while the pattern runs.",
    example: ".lpf(slider(600, 100, 3000))",
    section: "input-devices",
  },
  orbit: {
    text: "Route events to a separate SuperDough orbit, with independent global effects. The mixer taps these real buses.",
    example: ".orbit(1)",
    section: "effects",
  },
  setcps: {
    text: "Set cycles per second. For four beats per cycle, BPM = CPS × 240.",
    example: "setcps(120/60/4)",
    section: "cycles",
  },
  _pianoroll: {
    text: "Draw an inline piano roll from the current pattern. Underscore visuals appear below their source.",
    example: "._pianoroll()",
    section: "visual-feedback",
  },
  _scope: {
    text: "Show an inline oscilloscope from actual audio.",
    example: "._scope()",
    section: "visual-feedback",
  },
  _spiral: {
    text: "Draw a spiral showing event timing. Use steady to keep the pattern mostly still.",
    example: "._spiral({ steady: .96 })",
    section: "visual-feedback",
  },
  samples: {
    text: "Register a sample map. Use named audio URLs or a strudel.json map. External servers must allow CORS.",
    example: "samples({ my_sound: 'https://example.org/sound.wav' })",
    section: "samples",
  },
  macro: {
    text: "Studio control bridge. Read a named control as a normal Strudel signal; control values are set in the Controls pane.",
    example: '.lpf(macro("cutoff", 1200))',
    section: "input-devices",
  },
  initHydra: {
    text: "Initialize the lazy-loaded Hydra visual synthesizer inside the isolated runtime. Evaluate explicitly.",
    example: 'await initHydra()\nosc(8,.1,1.2).out()\n$: s("bd*4").gain(.4)',
    section: "hydra",
  },
};
