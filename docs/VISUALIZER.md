# Live music video / Visualizer

Open **VISUALIZER**, immediately beside **VISUALS** in the right workbench. Visuals contains scopes and technical audio views; Visualizer composes a live performance image from the master output.

## Watch your music

1. Play a score and enable audio if your browser asks.
2. Open Visualizer and choose a scene, palette and overlay layers.
3. Select **Watch Music Video** for a fullscreen presentation with automatic scene changes.
4. Use **Next scene** to move on, **Hush** to stop audio, or **Close** / Escape to return to the editor.

The browser Fullscreen API is used when available. If it is unavailable or refused, the presentation still fills the browser window. The presentation is an accessible modal with reachable controls. Hiding the controls leaves them available on hover or keyboard focus. **Save visual frame** downloads a PNG of the current composition, including the optional project title. This feature is a live generative presentation; it does not encode a video file.

## VJ loop videos

Choose **VJ Loops** beside Generated to use the three supplied video packs: 146 clips, pack filtering, thumbnails, looping, crossfades, speed/framing controls and the same overlay layers. Watch Music Video changes clips on musical phrases. [VJ loop guide](VJ_LOOPS.md).

## Scenes and layers

| Scene | Musical response |
|---|---|
| Particle Nebula | Individual frequency bins deform a cloud of projected particles; bass expands it. |
| Liquid Lights | Bass changes the size of overlapping color pools; energy changes brightness. |
| Fizzy Sparks | Percussive transients and energy shape radial trails. |
| Mechanical Garden | Bass and mids bend articulated stems and change their reach. |
| Signal Spiral | The actual waveform deforms three rotating helix strands. |
| Chromatic Ribbons | Mids change density/brightness; bass changes the weave's amplitude. |
| Color Ripples | Musical movement and bass drive expanding rings. |
| Vector Tunnel | Bass changes the corridor's scale; mids twist its geometry. |
| Spectral Landscape | Live FFT bins raise and lower a moving wireframe landscape. |

Layer **Rainbow Spider**, **Spark Dust**, **Waveform Halo** and **Code Fragments** over any scene. The spider has a radial web and eight articulated legs driven by musical phase. Code Fragments uses identifiers from the current project's actual source. These are independent overlays with adjustable opacity.

Five palettes are available: THUGS(red), Aurora, Electric, Solar and Silver. Audio sensitivity controls the visual response, not audio gain. Motion speed affects animation only. Settings persist in this browser. The global visual-quality and reduced-motion settings apply here too.

**Use as studio background** places the composition behind the IDE. Its opacity follows the existing background-intensity slider. The editor panels retain their normal readable surfaces. The background stops rendering while the fullscreen presentation is open.

## Automatic Music Video mode

The director changes scenes every 4, 8, 16 or 32 **Strudel cycles**. This uses the engine's real phase, so tempo changes remain aligned. It favors quieter scenes for low energy and stronger geometry for bass-heavy passages. It avoids immediately repeating a scene and crossfades for 1.8 seconds. **New scene sequence** changes the deterministic selection seed. Scene timing pauses through silence, paused visuals and reduced motion.

The frequency bands use the reported sample rate/bin spacing. RMS and FFT measurements are smoothed; bass transients use a threshold and a minimum interval. The displayed bass/mid/high meters describe normalized analyser values, not calibrated loudness measurements. No microphone permission or second audio engine is needed.

## Performance and accessibility

Canvas renderers share the existing master signal feed and director. They do not run another FFT or load third-party scripts. Rendering is bounded by particle counts, capped resolution and 15/30/60 FPS quality targets. Auto quality lowers detail when drawing repeatedly exceeds its time budget. Background rendering has a lower cap; fullscreen removes the preview/background workload. Hidden documents and offscreen canvases stop their animation callbacks.

Reduced motion holds geometry and scene changes while updating steady signal information at a reduced rate. No full-screen beat flashes or strobe effect are used. Layer controls have labels; live state and frequency levels have textual/semantic equivalents. Native dialogs retain keyboard focus and an explicit exit.

## Reference studies and credits

The following supplied studies were inspected for visual direction. The application uses original, bounded Canvas implementations with direct Strudel signal inputs; it does not embed the pens or copy their runtime dependencies.

- [Fizzy Sparks — waisbren89](https://codepen.io/waisbren89/pen/gwvVpP)
- [Mechanical Grass — Tim Holman](https://codepen.io/tholman/pen/DvYNNV)
- [Spiral — Hakim El Hattab](https://codepen.io/hakimel/pen/QdWpRv)
- [Ribbons 2 — tsuhre](https://codepen.io/tsuhre/pen/BYbjyg)
- [Color Changin' — Alex Zaworski](https://codepen.io/alexzaworski/pen/mEZvrG)
- [Rainbow Spider — run-time](https://codepen.io/run-time/pen/abYeqZ)
- [Liquid Lights — tmrDevelops](https://codepen.io/tmrDevelops/pen/rVNxVQ)
- Header: [Neon hexagon-forming particles — towc](https://codepen.io/towc/pen/mJzOWJ)

Additional research covered [Tiago Canzian / ARKx's audio-reactive particle tutorial](https://tympanus.net/codrops/2023/12/19/creating-audio-reactive-visuals-with-dynamic-particles-in-three-js/) and [Torin Blankensmith's audio-reactive shader tutorial](https://tympanus.net/codrops/2023/02/07/audio-reactive-shaders-with-three-js-and-shader-park/). These informed the frequency-band and procedural-particle direction. No music, recordings, artwork, Three.js, Shader Park, GSAP or p5 dependency from these demonstrations is bundled.

Original implementation: `src/visuals/video-model.mjs`, `video-renderer.ts`, `VideoCanvas.tsx`, `VisualizerPanel.tsx` and `HeaderParticles.tsx`, under the application AGPL license. The technical Visuals tab and official Strudel inline visualizations remain available.
