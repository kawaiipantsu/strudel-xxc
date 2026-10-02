# Strudel integration

Verified against the current published npm releases and upstream documentation on 2026-10-02.

## Primary references

- [Using Strudel in your project](https://strudel.cc/technical-manual/project-start/)
- [Official package architecture](https://strudel.cc/technical-manual/packages/)
- [Visual feedback](https://strudel.cc/learn/visual-feedback/)
- [Input devices](https://strudel.cc/learn/input-devices/)
- [Official source repository](https://codeberg.org/uzu/strudel)

The npm source files and published distributions were inspected before integration, particularly `core/repl.mjs`, `codemirror/codemirror.mjs`, `superdough/superdoughoutput.mjs`, and the audio/draw/widget APIs. We use published stable packages rather than an unreleased repository head. See `package-lock.json` and `LICENSES/dependencies.json` for complete resolution information.

## Exact direct packages

| Package | Pinned version |
|---|---|
| `@strudel/core` | 1.2.6 |
| `@strudel/mini` | 1.2.6 |
| `@strudel/transpiler` | 1.2.6 |
| `@strudel/codemirror` | 1.3.0 |
| `@strudel/webaudio` | 1.3.0 |
| `superdough` | 1.3.0 |
| `@strudel/draw` | 1.2.6 |
| `@strudel/tonal` | 1.2.6 |
| `@strudel/xen` | 1.2.6 |
| `@strudel/midi` | 1.3.0 |
| `@strudel/soundfonts` | 1.3.0 |
| `@strudel/hydra` | 1.2.6 |
| `@strudel/gamepad` | 1.2.6 |
| `@strudel/serial` | 1.2.6 |
| `@strudel/osc` | 1.3.2 |
| `hydra-synth` | 1.4.0 |

Direct frontend dependencies use exact versions; all transitive versions are locked. A `ws` override to 8.21.0 resolves security advisories in the optional OSC dependency tree without downgrading the Strudel package. There is no Node production OSC service.

## Integration approach

Our own sandbox page hosts `StrudelMirror`. `evalScope` exposes official core, mini, tonal, WebAudio, draw, editor widget, soundfont, gamepad, serial and OSC modules. The official `transpiler` evaluates ordinary scores. Strudel’s `webaudioOutput` and scheduler drive SuperDough. The stock Strudel site is not embedded.

Inline sliders use Strudel’s own widget state. The editor retains mini-notation locations and active-event highlights. Inline `_pianoroll`, `_punchcard`, `_spiral` and `_scope` are upstream implementations. Extra toolbox visuals use actual audio analyser data and real pattern query events.

`macro(name, initial)` is a small optional studio signal bridge built from official `ref()`. Its values come from UI controls/MIDI learn; it is not a replacement language. Normal Strudel scores do not need it.

## Compatibility changes, dated 2026-10-02

1. **Output-channel fallback:** Vite applies a narrow, visible transform to `superdough/dist/index.mjs`. Some WebKit environments report `AudioDestinationNode.maxChannelCount` as zero while keeping a valid stereo destination. The transform uses a stereo fallback and avoids assigning `destination.channelCount` when the reported maximum is zero. This fixes the upstream constructor’s zero-channel merger / invalid count errors. The original package remains unedited in npm; the exact transform is in `vite.config.ts` and included in corresponding application source.
2. **Safari audio gesture:** host-to-frame messages do not reliably transfer user activation. The runtime shows an explicit Enable Audio button inside the frame when needed. No sound starts before a gesture.
3. **Worklet CSP:** data/blob module formats used by published upstream worklets are allowed only in the sandbox. Main/admin CSP remains strict.
4. **Hydra:** the actual synth is lazy-loaded from the pinned local package. A sandbox-local `global` compatibility alias and `Hydra` binding support its browser bundle. No unpinned CDN script is required.
5. **MIDI scheduling:** the published `@strudel/midi` 1.3.0 bundle inlines a second AudioContext in its timer helpers. Chromium leaves that context suspended when it is created from a scheduler callback, so note/clock messages never fire. A checked Vite transform replaces that private getter with the official shared `getAudioContext` already imported by the package. Only the timer context reference changes; the official MIDI implementation remains in use. Bridge timestamps are translated between frame/host performance time origins.
6. **MIDI permission:** the trusted host requests non-SysEx permission; a small Web MIDI facade gives the official Strudel module access to explicitly connected ports. All outgoing messages are checked by the host.

7. **Background playback clock:** the existing Strudel `setInterval` / `clearInterval` options receive AudioWorklet wakeups instead of page timers. Pattern queries, lookahead, tempo and scheduling remain in upstream Cyclist. The clock is connected only while the scheduler runs; it produces zero-valued output and leaves the SuperDough signal path unchanged. The optional browser Audio Session API declares playback intent. Details and browser limits are in [Audio engine](AUDIO_ENGINE.md#background-music).

## Samples and optional integrations

The current official default sample catalogue and full Dirt-Samples collection are installed locally, with versioned maps and an audio hash lock. Official `samples()` and `aliasBank()` register them before the editor becomes ready. Bare drum names use the current Uzu default kit; original procedural drums remain under `xxc_` names. See [Sample banks](SAMPLE_BANKS.md) for storage, attribution, exact counts and compatibility examples. The official `registerSoundfonts()` registers all 125 General MIDI names at startup. Their chosen audio variants load on demand from the upstream host; no complete soundfont bank is bundled. `samples()`, custom maps, wavetables and `loadSoundfont()` retain the official APIs. External resources need HTTPS and host CORS permission.

`xxc_wt` is an original four-frame, 2048-sample wavetable handled by official SuperDough. Hydra needs WebGL. MIDI and microphone require real user permissions and hardware/browser support. WebSerial availability is shown honestly; opaque-origin restrictions can prevent native access. Official OSC code is present but its default local bridge is not a public HTTPS service. No bridge is installed, and mixed-content browser restrictions still apply.

## Licensing and source

Strudel and SuperDough are AGPL-3.0-or-later. The combined application is published under the same license. Full notices are in `LICENSES/`, and the complete application/build source is linked in the studio and repository. The source archive contains tracked source only, never local credentials or user media. Upstream package source locations and exact versions are included in the dependency inventory.

Operators publishing a modified deployment must preserve notices, document changes and offer their corresponding source as required by AGPL. User compositions and sample rights are separate from the application license. See [third-party licenses](THIRD_PARTY_LICENSES.md).

## Verification

The browser suite measures nonzero audio and event activity rather than checking only that a Play button changed color. Compatibility scores are in `tests/compatibility/`. Core, visual, waveform, sample, Hydra and browser capability cases can be evaluated individually. Tests never auto-run public library code on page load.
