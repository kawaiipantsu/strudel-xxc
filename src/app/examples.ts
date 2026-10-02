import type { Project } from "./types";
export const starter: Project = {
  title: "Redshift / 001",
  description:
    "A quiet terminal groove. Four voices, one shared clock. Change a pattern and evaluate to make it yours.",
  author: "",
  visibility: "private",
  entry_file: "main.strudel",
  tags: ["minimal", "live-code"],
  metadata: { bpm: 120 },
  files: [
    {
      path: "main.strudel",
      content: `// REDSHIFT / 001
// XXC × THUGS(red) · code / sound / signal
// Press PLAY, then change a pattern. Ctrl+Enter updates a block.

setcps(120/60/4)

// 01 ── PULSE
$: s("bd*4, [~ sd]*2, hh*8")
  .gain(.45)
  .orbit(0)

// 02 ── LOW FREQUENCIES
$: note("<c2 c2 ab1 bb1>")
  .s("sawtooth")
  .lpf(slider(640, 100, 2400))
  .decay(.18).sustain(0)
  .gain(.26).orbit(1)

// 03 ── SIGNAL
$: n("0 ~ 4 7 ~ 3 2 ~")
  .scale("C4:minor").s("triangle")
  .delay(.3).room(.35)
  .gain(.2).orbit(2)
  ._pianoroll()
`,
    },
    {
      path: "drums.strudel",
      content:
        '// A sparse pulse with shifting hats\nsetcps(.5)\nstack(\n  s("bd*4"),\n  s("~ sd ~ sd").room(.15),\n  s("hh*8").gain(".3 .15 .2 .15")\n).gain(.5)._punchcard()\n',
    },
    {
      path: "ambient.strudel",
      content:
        '// Four slow chords\nsetcps(.3)\nnote("<c3,eb3,g3 bb2,d3,f3 ab2,c3,eb3 g2,bb2,d3>")\n  .s("triangle").attack(.6).release(2)\n  .slow(2).room(.8).gain(.18)._scope()\n',
    },
    {
      path: "visuals.strudel",
      content:
        '// Pattern geometry\nsetcps(.4)\nn("0 2 4 6 7 5 3 1").scale("C4:minor")\n  .s("sine").gain(.2).room(.4)\n  ._spiral({ steady: .96 })\n',
    },
    { path: "samples", kind: "folder", content: "" },
    {
      path: "project.json",
      content:
        '{\n  "title": "Redshift / 001",\n  "bpm": 120,\n  "license": "CC0-1.0"\n}\n',
    },
  ],
};
export const makeStarter = (): Project => structuredClone(starter);
export const makeEmptyProject = (): Project => ({
  draft_id: crypto.randomUUID(),
  title: "Untitled project",
  description: "",
  author: "",
  visibility: "private",
  entry_file: "main.strudel",
  files: [{ path: "main.strudel", kind: "file", content: "" }],
  tags: [],
  metadata: {},
  editable: true,
});
