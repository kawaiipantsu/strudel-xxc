# Official engine compatibility scores

Evaluate each file explicitly in the studio. These scores use normal Strudel syntax.
The automated browser suite evaluates the core and visualization scores; hardware integrations require real devices.

- `core.strudel`: mini notation, samples, filters, envelopes, effects, synths, multiple patterns, stack and orbits.
- `visuals.strudel`: official slider, scope, pianoroll and spiral widgets.
- `wavetable.strudel`: original CC0 four-frame wavetable through official SuperDough.
- `external.strudel`: HTTPS sample URL. Replace the URL with any CORS-enabled licensed audio source to test another host.
- `local.strudel`: upload a sample in Sample Lab, then use its Insert into Strudel action.
- `hydra.strudel`: lazy-loaded Hydra. Requires a browser WebGL context.
- `midi.strudel`: permission bridge and official MIDI. Connect a hardware or virtual MIDI port in Controls first.
