# Deployment verification — 2026-10-02

Application: **https://strudel.xxc.dk**

Frontend build: **43d8d08021a8**

Commands: `./scripts/build.sh` followed by `./scripts/test.sh`.

## Results

| Check | Result |
|---|---|
| TypeScript check and production Vite build | Pass |
| PHP syntax checks for backend, public entry points and scripts | Pass |
| PCM, generated sample code and visual director unit tests | 10 passed |
| HTTPS backend integration checks | 52 passed |
| System sample delivery/security checks | 29 passed |
| VJ delivery, formats, permissions and Git exclusions | 18 passed |
| Browser end-to-end tests | 48 passed, 24 each in Chromium and WebKit |
| `npm audit --omit=dev` | 0 vulnerabilities reported |
| Database, Redis, storage, FFmpeg and SVG renderer health | Ready |
| Public ownership and private credential permissions | Verified |

The final browser suite completed in 4.7 minutes without retries against the deployed HTTPS origin. These results include the optimized VJ encodings and the General MIDI startup fix. Browser automation uses Playwright 1.63.0. Linux WebKit does not reproduce every Safari/iOS hardware configuration.

## Default sounds and sample insertion

The local catalogue contains 1,063 sound names and 6,325 distinct audio files. Every installed byte hash is checked against the committed audio lock. Browser tests run the supplied 909, piano, `misc` and external Dirt sample scores unchanged, measure nonzero output, and check for runtime errors. They test individual 909 voices, the TR909 alias, crackle, VCSL, mridangam and wavetables. Local-bank tests block the upstream sample hosts to verify that defaults work from this server.

All 29 piano recordings decode through the deployed endpoint in both browsers. A metadata ownership regression was corrected in the installer's atomic writer; all metadata files retain PHP group readability after verification/build.

The official soundfont startup registration exposes 125 General MIDI names. Tests play `gm_piano` and `gm_electric_bass_finger` separately and together using the real upstream soundfont loader. The suite does not claim to play every soundfont variant.

Sample Lab upload → crop → normalize → save → Insert produces a single-quoted sample map and audible playback. Legacy double-quoted maps offer an explicit, undoable repair; the original musical mini-notation strings remain intact.

## Hush and visual playback

A PCM regression switches from sustained, reverberant audio to another file with an initial rest. The first 0.6 seconds remain below 0.00001 peak amplitude, followed by audible new notes. Hush clears the old voices/effect routing before resuming. A fresh WebKit workspace also starts successfully without a pending suspend promise blocking Play.

The nine generated scenes produce distinct frames from real audio. Tests cover overlays, persisted settings, automatic changes driven by Strudel cycles, reduced motion, studio background, native/window fullscreen, PNG export, returning from fullscreen, and mobile drawers. The fullscreen dialog is checked with hit testing to ensure it appears above the editor immediately.

All 146 supplied VJ clips are inspected as H.264 with 8-bit 4:2:0 video, no more than 1920 pixels wide. The 58 browser conversions use a 1280-pixel width cap and bounded bitrate; compatible original MP4s remain unchanged. Browser tests play representative clips from all three packs, assert actual playback-time progress and muted video audio, switch clips, retain overlays, capture PNGs, and preserve selection through fullscreen. They verify automatic changes, pause on Hush, release on hidden tabs, mobile presentation and persisted settings.

The initial MOV remuxes reduced available space below the application's upload reserve. Optimized derived copies now total 196,457,380 bytes, with approximately 2.3 GiB free on the host. The application's 2 GiB reserve was retained. The complete upload, recording, cover and WAV/MP3/M4A export checks pass after optimization. Original videos and generated media remain outside Git and the public web root.

## What the browser tests measure

- Actual nonzero master analyser output and Strudel event activity.
- Core mini notation, synths, envelopes, filters, effects, stack and multiple orbits.
- Official inline slider, scope, pianoroll and spiral; original wavetable; HTTPS sample loading.
- Master gain reaching zero and restoring a nonzero signal; Hush stopping output.
- Real non-silent float PCM recording, preview, editor tab state, undo/redo, dark/light themes, saving and reloading.
- Responsive explorer drawer, Sample Lab audio decoding and selected-region edits.
- Opening a public score without executing it, sample upload/insertion, playback, cover generation, unlisted sharing and ZIP download.
- Local Hydra initialization without runtime exceptions.
- Official MIDI note output and MIDI clock through a virtual output port and the trusted permission bridge. No physical MIDI timing claim is made.
- Admin sign-in/out, settings persistence, moderation and diagnostic panels. Credential entry is excluded from traces/screenshots.

The checked MIDI compatibility transform fixes a suspended private AudioContext embedded in the published MIDI timer helpers. The WebKit transform handles a zero reported maximum output channel count. Both are documented in [Strudel integration](STRUDEL_INTEGRATION.md).

## Background playback and social cards

The added browser test verifies the persisted background-music preference, audio beyond the scheduler lookahead window while document visibility is hidden and ordinary page interval callbacks are blocked, intentional Hush when the preference is off, and no restart after Hush/return. Both Chromium and WebKit capture non-silent Float32 PCM at 1, 1.5, 2 and 2.5 seconds under that condition. This models hidden-page visibility and throttling; it does not certify native Safari/iOS background execution, screen locking or OS suspension. The desktop automation harness forces visibility, so it is not used as evidence of an actual minimized-window test.

Live HTTPS checks verify `og:site_name` on the studio, library and a public project, plus the 1200×630 PNG response. The regenerated social image was visually inspected for correct lettering and the Open Studio call to action. The new image URL avoids reusing the original raster URL in new cards. Running the graphics generator twice produces byte-identical assets.

## Backend coverage

The HTTP tests use isolated browser ownership and remove their created projects/media. They check CSRF, admin authorization, private project/media isolation, tampered media signatures, project CRUD, optimistic version conflicts, revision restoration, traversal rejection, MIME/FFprobe inspection, byte-range delivery, real SVG/PNG generation, WAV/MP3/M4A encoding, title/artist metadata and PNG attached pictures in both compressed containers.

They also check unlisted noindex behavior, public-only sitemap inclusion, share metadata, fork provenance, project ZIP round trips including samples, malicious ZIP rejection, strict main CSP, opaque sandbox CSP, credential inaccessibility and filesystem permissions.

## Visual and deployment checks

Dark, light, mobile, generated fullscreen and VJ fullscreen views were inspected during actual playback. The generated-scene screenshot in `assets/screenshots/music-video.png` contains only original application graphics; VJ video frames remain outside Git. The supplied README banner is retained at its original path. The manifest, favicon assets, server-rendered share pages, canonical HTTPS links and sitemap are served by the existing Apache/PHP deployment. No Node production listener is used.

The application installed only its own hourly cleanup cron and log rotation configuration; it did not replace the Apache vhost. Uploaded/generated assets remain under private `storage/`, outside `html/`.

## Boundaries

Physical microphone/MIDI devices, hardware output latency, browser-specific serial permissions and external OSC bridges remain environment-dependent. There is no independent time stretching, split editor, public account recovery or synthetic popularity metric. See [known limitations](KNOWN_LIMITATIONS.md) and [security](SECURITY.md).
