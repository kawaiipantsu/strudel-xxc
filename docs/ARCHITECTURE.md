# Architecture

## Request path

The public origin is `https://strudel.xxc.dk`. The existing upstream proxy handles TLS; Apache listens on port 8080 and serves `html/`. PHP-FPM processes the API and public project pages. Canonical links and secure cookies use the public HTTPS origin, never PHP’s local connection scheme.

React/TypeScript is built by Vite. Node is build/test tooling only. PHP uses PDO directly, with no runtime framework or Composer dependency. MariaDB holds project state and media metadata. Redis holds short-lived rate counters and export locks. Media files live in `storage/` outside the document root.

## Browser trust boundary

The top-level studio manages projects, device permission prompts, Sample Lab and UI state. The CodeMirror editor and official Strudel runtime live in `/sandbox/`, an iframe with `sandbox="allow-scripts"`. Its response also sets CSP `sandbox allow-scripts`, so visiting the runtime URL directly does not grant origin access. There is no `allow-same-origin`, top navigation, popups or form submission permission.

Runtime messages contain source text, cursor position, bounded analyser/event data and recording blobs. Parent handlers check frame identity, null origin, channel, type and size. Runtime handlers accept only the canonical parent origin and window. Playback code gets no API or admin credentials. Sample playback receives only scoped media URLs. MIDI output is forwarded only to explicitly connected ports and rejects SysEx and oversized messages.

This isolation separates privileges. It cannot make arbitrary JavaScript incapable of hanging its renderer, using CPU or contacting a permitted external host. Inspect unfamiliar code before playing it.

## Editor and audio

`@strudel/codemirror` supplies `StrudelMirror`, widgets, highlighting and the official REPL. `@strudel/transpiler` supplies the language transformation. There is no replacement music parser. Logical block selection uses CodeMirror’s JavaScript syntax tree, then sends the selected source through the same official transpiler. Pattern locations remain offset to their source lines.

Official SuperDough handles synthesis, samples, envelopes, effects, buses and scheduling. Studio gain/pan nodes are added after each orbit; analyzers and capture attach to the actual master output. They do not replace the engine. AudioWorklet capture sends blocks of stereo float PCM. Canvas rendering consumes reduced analyser samples and actual queried pattern events.

## Data model

- `projects`: UUID, opaque owner hash, unique slug, visibility, metadata, tags, entry file, version, provenance and cover/preview references.
- `project_files`: relative paths, text and folder entries, unique per project.
- `project_revisions`: meaningful snapshots with reason/time; latest 100 retained.
- `media`: UUID, private storage name, original display name, kind, MIME, size, duration, license metadata and approval state. Samples, recordings, exports and covers share the same lifecycle.
- `sample_packs`, `sample_pack_items`: curated packs with licensing notes and an enabled flag.
- `settings`, `admins`, `activity_log`: configuration, hashed administrator access and non-secret activity.

Tags and author display names are intentionally project metadata. There is no public account system. Public library entries are a visibility query over projects rather than a duplicate project table.

## Persistence and conflicts

Edits enter a local browser draft after 350 ms and a server save after 6 seconds of quiet. Explicit saves checkpoint the previous state. The save version is checked under a row lock; stale writers receive HTTP 409 and retain their local draft. New edits arriving while a save is in flight remain dirty and are saved afterward. Forks receive a new UUID and provenance, and copy project samples.

## Rendering and deployment

Vite emits hashed chunks and self-hosted fonts to `html/assets/`. PHP entry points and security rules are preserved. The service worker uses a build-specific cache and network-first static requests; it excludes API, media, admin and shared-project data. Source code and installation scripts remain outside Apache’s document root, except the deliberately generated public source archive.
