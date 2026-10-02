# Contributing

Thanks for helping make a better instrument. Start with a small reproducible problem, a score that demonstrates it, or an example of the workflow you want.

## Development

```bash
npm ci --ignore-scripts
npm run build
npm test
```

The production server remains Apache/PHP. The isolated runtime validates the canonical parent origin, so browser integration work is tested on the configured HTTPS origin. `npm run dev` provides Vite’s development server for frontend work, but API/session/security behavior must be verified through the deployed origin.

Run `./scripts/test.sh` before proposing changes to the shared runtime or backend. Test browser audio by measuring the actual signal. Tests must never execute a public score merely because a page opened.

## Code and design

- Keep official Strudel syntax and APIs compatible.
- Keep source evaluation in the opaque runtime. Never pass cookies, CSRF tokens or admin state through its bridge.
- Preserve project drafts and save-conflict behavior.
- Keep media outside the web root and use prepared SQL.
- Give every visible action a working result or an explicit capability message.
- Test dark/light contrast and narrow screens. Audio stability matters more than decorative frame rate.
- Keep functions and UI copy direct. Update the integration notes when upstream behavior changes.

## Samples and scores

Only contribute sounds you have permission to redistribute. Include creator/source/license information. Original synthesized samples and clearly licensed field recordings are welcome. Do not upload commercial sample packs or copyrighted tracks without appropriate permission.

For a score, include BPM/CPS, dependencies, instructions and its chosen license. Avoid invasive network requests or hidden execution unrelated to music. Be clear about optional MIDI, microphone, Hydra and OSC requirements.

## Licensing

Application contributions are distributed under AGPL-3.0-or-later. Keep upstream notices. Original example scores and starter samples use CC0-1.0; a user’s own composition is not automatically relicensed just because it is posted in a discussion.
