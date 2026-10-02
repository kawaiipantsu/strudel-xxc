# Audio engine

## Signal path

```text
Strudel source → official transpiler → official pattern scheduler
  → SuperDough voices and per-orbit effects
  → studio orbit gain / stereo pan / analyser
  → SuperDough destination gain (master volume)
      ├─ browser audio destination
      ├─ master FFT / waveform / stereo analysis
      └─ PCM capture AudioWorklet → WAV blob
```

The implementation does not substitute a small oscillator engine for Strudel. Mini notation, scheduling, synths, samples, wavetables, envelopes and effects remain upstream functionality. Studio orbit controls sit after the orbit effects and are separate from each pattern’s own gain/pan parameters.

## Startup and stopping

AudioContext creation is lazy in upstream code. Play/Evaluate resumes it after user activation and loads official worklets. Safari may require a second click directly in the editor frame. Hush stops the scheduler and suspends audio, including effects. Loading a shared score never calls evaluation or autoplay.

## Metering and visuals

A 1024-point master analyser supplies decimated waveform and frequency arrays at up to 20 updates per second. Independent stereo and orbit analysers provide RMS levels; the stereo waveform pair drives the phase plot. The spectrogram retains successive measured FFT columns. The UI displays RMS and peak dBFS and flags peaks near full scale. It does not claim to be a calibrated loudness meter or a mastering limiter. There is no always-on nonlinear limiter changing normal Strudel sound. Keep headroom in stacked scores.

Pattern event views query the actual current pattern around the scheduler’s current cycle. Their data includes note/sample, orbit, gains, effect values and durations. Inline Strudel visuals and source-token highlighting remain official implementations.

Canvas rendering is separate from audio. It caps display resolution, supports low/balanced/high/auto quality, reduces frame rate when rendering is expensive, honors reduced-motion settings and skips decorative work in hidden tabs. Browser scheduling and device limits still affect very large scores.

## Recording

`public/pcm-worklet.js` captures actual master output in stereo float blocks. The host receives an uncompressed IEEE float32 WAV, preserving the captured PCM values. Recording can pause/resume and stops at the earlier configured time or byte budget. The raw take can be downloaded before any upload.

The server inspects recording uploads and uses FFmpeg to export:

- WAV: 24-bit PCM.
- MP3: libmp3lame, 320 kbps, ID3v2.3 metadata.
- M4A: AAC, 256 kbps, fast-start container.

The title, artist, album and comment come from bounded metadata. A public project URL is included only for public/unlisted projects. A generated PNG cover is attached to MP3/M4A as album artwork. The SVG master stays separate. Conversion is explicitly requested; no server audio process runs continuously.

## Sample Lab

Sample Lab has its own trusted browser audio context for decoding, auditioning and microphone recording. PCM operations are applied to selected regions, support undo snapshots and leave channel alignment intact. Normalize uses a shared stereo peak. Resampling uses linear interpolation; playback rate changes pitch and speed together. It is not advertised as high-quality independent time stretching.

## Diagnostics and limitations

Sample rate and base latency are reported from AudioContext. Values vary by device/browser. MIDI output and clock require supported ports; permission comes from the Controls UI. MIDI/serial/OSC hardware timing must be measured on actual equipment. No headless browser test can verify an external synthesizer or microphone’s physical signal path.
