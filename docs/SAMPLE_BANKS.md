# Strudel sample banks

The studio registers the current official Strudel default sample maps before the editor becomes ready. Audio comes from a local mirror under `storage/sample-banks`, outside the public web root. Samples are decoded on first use; opening the studio does not download the whole collection into the browser.

The installed snapshot (2026-10-02) contains **1,063 sound names and 6,325 distinct audio files**, totaling **3,047,281,013 bytes**. The sound count includes the original XXC samples and excludes additional bank aliases and synthesized sounds. Identical audio is stored once. There are 6,511 upstream file URLs before content deduplication.

## Included collections

| Collection | Mapped names | Examples |
|---|---:|---|
| Tidal drum machines | 683 | `RolandTR909_bd`, `RolandTR808_sd`, `EmuSP12_bd` |
| Dirt-Samples | 218 | `breaks125`, `casio`, `crow`, `jazz`, `numbers` |
| VCSL | 128 | `ballwhistle`, `bassdrum1`, orchestral/percussion instruments |
| Uzu drumkit | 16 | `bd`, `sd`, `hh`, `cp`, `rim`, `misc` |
| Mridangam | 13 | `mridangam_ta`, `mridangam_gumki` |
| Uzu wavetables | 7 | `wt_digital`, `wt_digital_bad_day` |
| Salamander piano | 1 pitched instrument, 29 recordings | `piano` |
| XXC originals | 7 | `xxc_bd`, `xxc_sd`, `xxc_hh`, `xxc_oh`, `xxc_cp`, `xxc_rim`, `tone` |

Some collection names overlap, so the total is not the sum of this table. The complete Dirt collection loads first. The current official default maps then take precedence. In particular, bare `bd`, `sd`, `hh`, `cp`, `rim`, and `misc` come from Uzu, matching the current official defaults. The earlier procedural drums remain available with the `xxc_` prefix. `xxc_wt` remains the original procedural wavetable.

The upstream bank aliases are registered too: `.bank("TR909")` and `.bank("RolandTR909")` resolve the same recordings. `crackle`, `pink`, `white`, and `brown` are official SuperDough noise synths, not missing sample files.

## Usage

No `samples()` call is necessary for default sounds:

```js
setcpm(128/4)
$: s("bd*4").bank("RolandTR909")
$: s("hh*16").bank("RolandTR909").gain(".5 .3 .8 .3").swingBy(1/6, 4)
$: s("~ cp ~ cp").bank("RolandTR909").room(0.15)
$: s("rim(5,16)").bank("RolandTR909").gain(0.3).delay(0.2).delaytime(0.1875)
$: s("crackle*2").density(0.03).gain(0.1)
```

These supplied examples also work unchanged:

```js
speed("1 1.5*2 [2 1.1]").s("piano").clip(1)
```

```js
s("bd sd [~ bd] sd,hh*16, misc")
```

External sources still use the official Strudel API:

```js
samples('github:tidalcycles/dirt-samples')
s("breaks125").fit().slice([0,.25,.5,.75], "0 1 1 <2 3>")
```

An explicit external `samples()` call can replace previously registered sounds with that source's versions. It fetches directly from the external host, so HTTPS, CORS and that host's availability still apply. The default local banks do not require GitHub or Strudel's CDN to be reachable from the browser.

Open **SAMPLES** in the right workbench to search names or aliases, filter by collection, audition, favorite and insert sounds. Results are paginated to keep the editor responsive. Collection filters show upstream attribution and published license status.

## Reproduce the installation

```bash
python3 scripts/install-sample-banks.py
./scripts/build.sh
```

The first command installs or repairs from the committed maps and SHA-256 audio lock. It reuses verified files. The build runs `--check`, verifies every local byte hash without networking, and regenerates the public metadata. A new server needs approximately 3 GB for these banks plus at least 2 GiB free for application storage. FFprobe must be installed.

```bash
python3 scripts/install-sample-banks.py --check
python3 tests/sample-banks-http.py
npx playwright test tests/e2e/sample-banks.spec.ts
```

The downloader uses up to eight workers, bounded files, retries, inspected audio streams, atomic writes and an installation lock. It first uses Strudel's CDN, then a pinned upstream Git revision. A hash mismatch fails installation. Source maps and revisions are in `config/sample-banks/`; the source repository stores metadata and hashes, not the 3 GB of recordings.

For an intentional catalogue update, first review and update `sources.json`, `maps/`, `aliases.json`, `fallbacks.json` and the notices. Then run `python3 scripts/install-sample-banks.py --update-lock`. This is a maintainer operation, not part of normal builds. Existing installed files remain until explicitly removed; the application cleanup job never deletes these banks.

The generated `public/sample-banks/runtime.json` preserves pitched maps, sample ordering, names and aliases. Vite copies it and the searchable catalogue into `html/sample-banks/`. All actual audio remains in private storage, served through the read-only `/sample-banks/audio/{sha256}.{extension}` endpoint. This endpoint supports ranges, HEAD and immutable caching without a session or an arbitrary file path. PHP can read the installed banks but cannot modify them.

## Sources and notices

- [Official REPL sample registration](https://codeberg.org/uzu/strudel/src/branch/main/website/src/repl/prebake.mjs), inspected 2026-10-02.
- [Dough sample maps](https://github.com/felixroos/dough-samples) and [official sample documentation](https://strudel.cc/learn/samples/).
- [Recorded attribution and licenses](../LICENSES/samples/README.md). Audio licenses are independent of the application's AGPL license.

The browser compatibility suite measures nonzero analyser output for all four supplied examples, the separate 909 voices, alias lookup, noise synthesis, and representatives of the remaining collections. It tests both Chromium and WebKit. The installer inspects every downloaded file with FFprobe and locks its hash; browser decoding of every variant is not claimed.

## General MIDI soundfonts

The default soundfont registry contains **125 `gm_*` instrument names**, using the official `@strudel/soundfonts@1.3.0` `registerSoundfonts()` API, as the upstream REPL does. Registration is separate from importing the module. The initial implementation exposed the module but omitted this registration; that caused the reported `gm_piano` and `gm_electric_bass_finger` errors. Both now register before the editor becomes ready.

```js
$: note("c4 e4 g4 b4").s("gm_piano")
$: note("c2 ~ g2 ~").s("gm_electric_bass_finger")
```

These instruments load the chosen soundfont variant from `https://felixroos.github.io/webaudiofontdata/sound` on first playback through the official loader. No full soundfont library is downloaded at startup or mirrored on this host. They are additional to the 1,063 locally mapped sounds. Variants such as `s("gm_piano:1")` retain upstream behavior. The SAMPLES browser lists their names and provides insertion.

The default registry and loader were verified against [official REPL initialization](https://codeberg.org/uzu/strudel/src/branch/main/website/src/repl/prebake.mjs) and the pinned package source. Browser tests play the piano and finger bass individually and together and measure nonzero output in Chromium and WebKit. Remote host availability and CORS still apply to soundfont audio.
