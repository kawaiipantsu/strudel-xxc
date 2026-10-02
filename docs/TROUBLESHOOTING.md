# Troubleshooting

## No sound

1. Press Play. If Safari shows **Enable Audio** inside the editor, click it.
2. Check master volume and orbit mute/solo controls.
3. Open Audio/Problems in the bottom console. A suspended AudioContext needs a user gesture; a missing sample needs a valid name/map.
4. Try the built-in Minimal Beat. It uses self-hosted samples.
5. Test the device/browser output volume. The UI’s meters reflect the WebAudio signal, not the physical speaker level.

The runtime’s CSP permits the data/blob worklet formats used by upstream Strudel. If an older cached page reports CSP worklet errors, reload the page. The application shell is network-first, and the service worker checks for updates without serving private API data from cache.

## WebKit output channels

Some WebKit environments report a maximum output channel count of zero. The documented Vite transform preserves the valid stereo destination instead of constructing a zero-input merger or setting an invalid channel count. This behavior is covered by the WebKit engine smoke test.

## Sample does not load

Uploaded samples need an existing owning project and a valid MIME/audio stream. Source filenames are converted to safe sample names. Use Sample Lab’s Insert into Strudel action, which inserts the correct map. Reopen a saved private project if a capability URL is older than 24 hours; project reads refresh those URLs.

External audio needs HTTPS and CORS permission from its host. HTTP-only sample hosts may be blocked as mixed content. The application does not download arbitrary remote URLs on the server as a workaround.

### Inserted sample reports a mini-notation parse error at `/`

Strudel interprets double-quoted strings as mini notation. Sample URL strings must use single quotes, for example `samples({ recording: 'https://example.org/recording.wav' })`. Sample Lab, uploaded samples and pack insertion now generate single-quoted maps. Your recording does not need to be recreated.

For code inserted by an earlier build, Play offers **REPAIR SAMPLE MAP QUOTES & PLAY** inside the editor. This changes only literal strings in `samples(...)` maps, visibly and with undo support. It preserves musical mini-notation strings such as `s("recording")`. Save after repairing. Private sample capability URLs still need to be valid; do not post them in issues or public discussions.

### Piano reports a decoding failure

The initial bank verification step replaced metadata with permissions that prevented PHP from reading it. The installer now preserves the `root:www-data` owner/group on atomic writes. All 29 piano recordings have been decoded successfully in Chromium and WebKit. Reload after deployment to clear the old runtime's failed sample cache. Operators can verify with `python3 scripts/install-sample-banks.py --check` and `python3 tests/sample-banks-http.py`; `./scripts/permissions.sh` also restores the required read permissions.

### Previous score is briefly audible after Hush

Hush now clears the official output/orbit graph and old effect tails before the next playback. Reload an older open studio tab to use this fix. Normal live updates retain Strudel's timing and sound routing.

## Music video fullscreen

Use **VISUALIZER → Watch Music Video** for automatic scenes, or **Fullscreen** for the current composition. The studio enters native fullscreen before opening the presentation dialog, keeping the video above the editor. Close or Escape returns to the studio. Browsers without native fullscreen use a window-filling presentation. On mobile, the sliders button beside Save opens the right workbench. See the [Visualizer guide](VISUALIZER.md).

## Save conflict or API outage

Local drafts are written while you type. A 409 conflict means another tab saved a newer version; export the current source/ZIP before reloading or create a fork. If the API is offline, the status shows local-only state and the draft remains in this browser. Do not clear site data as a first recovery step.

If the original owning cookie was removed, a private project is not recoverable by title alone. Use a saved ZIP backup. The admin can inspect records but does not expose visitor owner tokens.

## Recording or conversion

Recordings stop at the earlier duration or PCM byte limit. Default 32 MB uploads hold about 87 seconds of stereo float32 PCM at 48 kHz. Increase Admin’s upload limit for longer takes. WAV is available as a direct local download even before server conversion.

MP3/M4A require FFmpeg. Check Admin → System or `./scripts/healthcheck.sh`. A cover must be generated before conversion for attached artwork. Common players need the PNG cover; the SVG is offered separately.

## MIDI, serial, microphone, Hydra

Use Controls → Connect MIDI first. Browsers without WebMIDI show a capability message. MIDI learn maps CC messages to ordinary Strudel signals; SysEx is deliberately blocked. Hardware input/output and clock require a real or virtual port.

Microphone permission is requested only in Sample Lab. Stop closes its tracks. WebSerial is detected, but the isolated runtime may not receive native serial permission. OSC requires a separately configured secure bridge; none is installed by default. Hydra requires WebGL and is loaded only when a score calls `initHydra()`.

## Admin access

The plaintext initial code is only in private `docs/ADMIN_CREDS.md`. Rotate it with `php scripts/rotate-admin.php`. An incorrect credential or too many attempts produces a generic error. After rotation, sign in again because existing PHP sessions are invalidated.

## Server checks

```bash
./scripts/healthcheck.sh
php scripts/cleanup.php
./scripts/permissions.sh
```

Review `storage/logs/app.log` for the reference ID from an API error. Do not copy raw private configuration or credentials into issues. The root app’s title/description is generated by `html/index.php` from public settings; the compiled `index.html` is its shell template.

## Music stops after switching tabs

In Preferences, check **Allow background music**. An unchecked setting intentionally hushes playback when the studio becomes hidden and ends any recording. Return and press Play to start again.

With the setting checked, the audio clock continues scheduling independently of visual rendering. Safari or the operating system may still suspend audio for battery savings, screen locking or another audio app. Return to the studio and use Enable Audio if prompted. Keep the browser open; sleeping or closing it cannot be overridden by the site.

## Social preview looks stale

The default card uses `/brand/social-studio.png` with a visible Open Studio call to action. The root, library and project pages include the configured site title as `og:site_name`. PNG rendering uses librsvg and the bundled JetBrains Mono font to avoid the overlapping text produced by ImageMagick's internal SVG renderer. Older `/brand/social.png` references also receive the corrected image. Discord and other platforms may retain previews for previously shared URLs until their caches refresh.

## Start without the demo files

Click **New +** in the top bar. The studio saves local or edited work first, hushes playback, and opens an empty `main.strudel` file in its own private project. The command palette also has **Project: New empty workspace**. Saved work is accessible through the **Recent projects** folder button on the activity rail.

New clears the library-link query parameters, so reloading stays in the new workspace. Editor tabs, closed-tab history, metadata and undo state are isolated from the previous project. On mobile it closes tool drawers so the blank editor is visible. Stop an active recording before starting another project.

If the checkpoint fails, the existing workspace stays open with an error message. Restore the connection or resolve the save error and try New again; it does not discard unsaved work to continue.

## Missing default sounds (RolandTR909, piano, misc)

Reload the studio after deployment and check Output for “Sample banks ready”. These banks are now included by default. An already-open runtime retains the old sound registry until reload. Administrators can run `python3 scripts/install-sample-banks.py --check` to verify installation and `python3 scripts/install-sample-banks.py` to repair missing files. Explicit external `samples()` calls can override default names; reload to restore the defaults. See [Sample banks](SAMPLE_BANKS.md).

## Missing `gm_piano` or `gm_electric_bass_finger`

These are General MIDI soundfont instruments, separate from the local sample banks. The runtime now calls the official `registerSoundfonts()` during startup. Reload an older studio tab to receive that registry; no manual loading line is needed. The first note fetches the selected soundfont from the upstream host. If loading fails after registration, check network access to `felixroos.github.io` and the console error. The local Salamander `piano` is a separate instrument.
