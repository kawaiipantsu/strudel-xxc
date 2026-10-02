# Deployment verification — 2026-10-02

Application: **https://strudel.xxc.dk**

Frontend build: **ec1e863abf71**

Test command: `./scripts/test.sh`

## Results

| Check | Result |
|---|---|
| TypeScript check and production Vite build | Pass |
| PHP syntax checks for backend, public entry points and scripts | Pass |
| PCM editing/encoding unit tests | 4 passed |
| HTTPS backend integration checks | 51 passed |
| Browser end-to-end tests | 14 passed, 7 each in Chromium and WebKit |
| `npm audit --omit=dev` | 0 vulnerabilities reported |
| Database, Redis, storage, FFmpeg and SVG renderer health | Ready |
| Public ownership and private credential permissions | Verified |

The browser suite completed in 40.2 seconds without retries. Tests use the Playwright 1.63.0 browser versions and the deployed HTTPS origin. Initial development also used the host's system Chromium. Linux WebKit does not reproduce every Safari/iOS hardware configuration.

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

## Backend coverage

The HTTP tests use isolated browser ownership and remove their created projects/media. They check CSRF, admin authorization, private project/media isolation, tampered media signatures, project CRUD, optimistic version conflicts, revision restoration, traversal rejection, MIME/FFprobe inspection, byte-range delivery, real SVG/PNG generation, WAV/MP3/M4A encoding, title/artist metadata and PNG attached pictures in both compressed containers.

They also check unlisted noindex behavior, public-only sitemap inclusion, share metadata, fork provenance, project ZIP round trips including samples, malicious ZIP rejection, strict main CSP, opaque sandbox CSP, credential inaccessibility and filesystem permissions.

## Visual and deployment checks

Dark and light screenshots in `assets/screenshots/` were captured during actual playback. The supplied README banner is retained at its original path. The manifest, favicon assets, server-rendered share pages, canonical HTTPS links and sitemap are served by the existing Apache/PHP deployment. No Node production listener is used.

The application installed only its own hourly cleanup cron and log rotation configuration; it did not replace the Apache vhost. Uploaded/generated assets remain under private `storage/`, outside `html/`.

## Boundaries

Physical microphone/MIDI devices, hardware output latency, browser-specific serial permissions and external OSC bridges remain environment-dependent. There is no independent time stretching, split editor, public account recovery or synthetic popularity metric. See [known limitations](KNOWN_LIMITATIONS.md) and [security](SECURITY.md).
