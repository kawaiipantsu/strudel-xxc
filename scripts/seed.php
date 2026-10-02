<?php
require __DIR__ . "/../backend/bootstrap.php";
require ROOT . "/backend/media.php";
require ROOT . "/backend/covers.php";
$examples = [
    [
        "Minimal Beat",
        "A clean four-on-the-floor pulse with roomy snares and a quiet hat.",
        "minimal,drums",
        120,
        'setcps(120/60/4)\nstack(\n  s("bd*4").gain(.6),\n  s("~ sd ~ sd").room(.15).gain(.35),\n  s("hh*8").gain(".18 .1 .15 .1")\n)._punchcard()',
    ],
    [
        "Acid Terminal",
        "A moving low-pass filter, short sawtooth notes, and a tight kick.",
        "acid,synth",
        132,
        'setcps(132/60/4)\n$: s("bd*4, hh*8").gain(.35).orbit(0)\n$: n("0 0 7 3 0 10 7 3").scale("C2:minor")\n  .s("sawtooth").lpf(slider(850,150,3000))\n  .lpq(8).lpenv(3).decay(.12).sustain(0)\n  .gain(.2).orbit(1)._scope()',
    ],
    [
        "Ambient Grid",
        "Slow minor chords with space between notes. Let the reverb breathe.",
        "ambient,chords",
        72,
        'setcps(72/60/4)\nnote("<c3,eb3,g3 bb2,d3,f3 ab2,c3,eb3 g2,bb2,d3>")\n  .s("triangle").attack(.8).release(2).slow(2)\n  .room(.8).gain(.15)._pianoroll()',
    ],
    [
        "Breakcore Test",
        "An original procedural drum pattern. No sampled break or copyrighted recording.",
        "drums,fast",
        174,
        'setcps(174/60/4)\nstack(\n s("bd [bd ~] ~ bd").gain(.55),\n s("~ sd [~ sd] sd*2").sometimes(x=>x.fast(2)).gain(.3),\n s("hh*16").gain(".12 .06")\n)._punchcard()',
    ],
    [
        "Generative Arp",
        "A random sequence through minor scale degrees with offset echoes.",
        "generative,melody",
        108,
        'setcps(108/60/4)\nn(irand(8).segment(8)).scale("D4:minor")\n .s("triangle").decay(.15).sustain(0)\n .delay(.4).room(.3).gain(.25)._pianoroll()',
    ],
    [
        "Sample Chopper",
        "Slice the bundled original tone, sequence its segments, and vary playback speed.",
        "samples,slicing",
        110,
        'setcps(110/60/4)\n$: s("bd*4, hh*8").gain(.3)\n$: s("tone").slice(8,"0 3 2 7 4 1 6 5")\n .speed("1 1.5 .75 2").gain(.3).room(.2)._scope()',
    ],
    [
        "Visual Spiral",
        "Eight notes, a minor scale, and a slowly turning timing diagram.",
        "visuals,spiral",
        96,
        'setcps(96/60/4)\nn("0 2 4 6 7 5 3 1").scale("C4:minor")\n .s("sine").gain(.22).room(.35)\n ._spiral({ steady: .96 })',
    ],
    [
        "Hydra Demo",
        "An explicit opt-in Hydra oscillator field accompanying a small melodic loop.",
        "hydra,visuals",
        100,
        'await initHydra()\nosc(8,.08,1.2).color(1,.12,.2).rotate(.05).out()\nsetcps(100/60/4)\n$: n("0 3 7 5").scale("C4:minor")\n .s("triangle").gain(.2).room(.5)',
    ],
    [
        "MIDI Demo",
        "Connect a controller in Controls. A learned cutoff macro drives a normal Strudel filter.",
        "midi,controls",
        120,
        '// Open Controls → Connect MIDI.\n// Add a cutoff control and choose MIDI learn.\n// MIDI unavailable? The default value still makes sound.\nsetcps(.5)\nnote("c3 eb3 g3 bb3").s("sawtooth")\n .lpf(macro("cutoff",1200)).gain(.15)\n .decay(.2).sustain(0)._scope()',
    ],
];
foreach ($examples as [$title, $description, $tags, $bpm, $code]) {
    if (
        query("SELECT id FROM projects WHERE builtin=1 AND title=?", [
            $title,
        ])->fetchColumn()
    ) {
        continue;
    }
    $id = uid();
    $slug = strtolower(str_replace(" ", "-", $title));
    $code = str_replace('\\n', "\n", $code) . "\n";
    query(
        "INSERT INTO projects(id,owner_hash,title,description,author,slug,visibility,entry_file,metadata,tags,builtin) VALUES(?,?,?,?,?,?,'public','main.strudel',?,?,1)",
        [
            $id,
            hash("sha256", "builtin-example-owner"),
            $title,
            $description,
            "XXC / THUGS(red)",
            $slug,
            json_encode([
                "bpm" => $bpm,
                "license" => "CC0-1.0",
                "original" => true,
            ]),
            json_encode(explode(",", $tags)),
        ],
    );
    query("INSERT INTO project_files(project_id,path,content) VALUES(?,?,?)", [
        $id,
        "main.strudel",
        $code,
    ]);
    $p = query("SELECT * FROM projects WHERE id=?", [$id])->fetch();
    make_cover(
        $p,
        ["terminal", "spectral", "piano-roll", "thugs-red"][
            array_rand([0, 1, 2, 3])
        ],
    );
}
echo "Original example library is current.\n";
