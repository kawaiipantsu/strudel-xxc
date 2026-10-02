# Practical boundaries

- Allow background music keeps Strudel playing across tab switches using audio-clock scheduling and the available browser playback policy. Safari/mobile power management, screen locking and OS suspension can still interrupt it; no website can guarantee playback after its process is suspended.

- MIDI input/output/clock and microphone behavior depend on browser permissions and actual devices. Browser automation verifies the software path; it cannot certify a physical audio interface or instrument.
- WebSerial is detected and the official module is included, but opaque-origin browser restrictions may prevent native access. No serial bridge is installed.
- OSC needs a separate bridge. The official package defaults to a localhost WebSocket, which is not a production HTTPS bridge. The studio shows this state explicitly.
- The 125 default General MIDI instruments are registered through the official soundfont package. Their audio loads from the upstream host on first use; no complete soundfont bank is bundled.
- Independent time stretching is not provided. Sample Lab supports PCM edits, resampling and coupled pitch/rate preview.
- There is one primary editor view; tabs keep their state. Split-editor and minimap features are not included.
- Library sorting supports newest and updated. There is no synthetic trending score or fabricated engagement counter.
- Anonymous ownership is browser-bound; there is no email/password public account system, profile upload or cross-device identity recovery. ZIP export/import is the portable backup path.
- Server encoding is synchronous and bounded. Long raw PCM captures are constrained by the configured upload budget; recording stops before that budget is exceeded.
- The background and toolbox are practical Canvas views. They do not all run at maximum resolution simultaneously, and metering is not a certified loudness measurement.
- Music Video mode generates a live fullscreen presentation. PNG frame snapshots and audio recordings are available; encoded video-file export is not included.
- The offline shell is best-effort. Uncached sample hosts, publishing, the server library and server encoding need a network connection.
- Unknown runtime exceptions do not always include a reliable original source line. Syntax errors use the upstream location when supplied; the console always preserves the useful error message.
