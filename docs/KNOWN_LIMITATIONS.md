# Practical boundaries

- MIDI input/output/clock and microphone behavior depend on browser permissions and actual devices. Browser automation verifies the software path; it cannot certify a physical audio interface or instrument.
- WebSerial is detected and the official module is included, but opaque-origin browser restrictions may prevent native access. No serial bridge is installed.
- OSC needs a separate bridge. The official package defaults to a localhost WebSocket, which is not a production HTTPS bridge. The studio shows this state explicitly.
- Soundfont loading is supported by the official package; no third-party bank is bundled or silently downloaded.
- Independent time stretching is not provided. Sample Lab supports PCM edits, resampling and coupled pitch/rate preview.
- There is one primary editor view; tabs keep their state. Split-editor and minimap features are not included.
- Library sorting supports newest and updated. There is no synthetic trending score or fabricated engagement counter.
- Anonymous ownership is browser-bound; there is no email/password public account system, profile upload or cross-device identity recovery. ZIP export/import is the portable backup path.
- Server encoding is synchronous and bounded. Long raw PCM captures are constrained by the configured upload budget; recording stops before that budget is exceeded.
- The background and toolbox are practical Canvas views. They do not all run at maximum resolution simultaneously, and metering is not a certified loudness measurement.
- The offline shell is best-effort. Uncached sample hosts, publishing, the server library and server encoding need a network connection.
- Unknown runtime exceptions do not always include a reliable original source line. Syntax errors use the upstream location when supplied; the console always preserves the useful error message.
