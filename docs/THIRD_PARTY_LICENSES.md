# Third-party licenses

Generated from the pinned package lock. Full available license/notice files are in [LICENSES/npm](../LICENSES/npm). Build-only tooling is included for completeness.

## Application and Strudel

This combined application is licensed AGPL-3.0-or-later. Strudel, SuperDough and their corresponding source notices are retained. See [Strudel integration](STRUDEL_INTEGRATION.md) for the upstream links, source availability and the documented WebKit compatibility transform.

## Media, fonts and artwork

- Original starter samples and example scores: CC0-1.0. Created specifically for this project, using deterministic synthesis in scripts/generate-samples.py. No third-party recordings are bundled.
- JetBrains Mono: SIL Open Font License 1.1. The self-hosted variable WOFF2 font comes from @fontsource-variable/jetbrains-mono; the cover-generation TTF is JetBrains Mono v2.304 from the official JetBrains repository. Full OFL text is in LICENSES/JetBrains-Mono-OFL.txt.
- Lucide SVG icons: ISC license, retained below.
- Original programmatic identity graphics: distributed with the AGPL application. Brand names and marks remain those of their respective owners.
- README banner: supplied by the project owner at assets/strudel_xxc_dk_readme_banner.png. It is not presented as a third-party asset or relicensed sample pack.
- Hydra: hydra-synth is AGPL-3.0; loaded on demand.
- Soundfont loading is available through the official package. No soundfont bank or questionable remote sample collection is bundled. Users remain responsible for the licenses of external samples and uploaded recordings.
- Browser media encoders are platform components. FFmpeg and its codecs are host tooling; no FFmpeg binary is redistributed by this repository.

## Pinned dependency inventory

| Package | Version | License |
|---|---|---|
| [@babel/runtime](https://www.npmjs.com/package/@babel/runtime/v/7.29.7) | 7.29.7 | MIT |
| [@codemirror/autocomplete](https://www.npmjs.com/package/@codemirror/autocomplete/v/6.20.3) | 6.20.3 | MIT |
| [@codemirror/commands](https://www.npmjs.com/package/@codemirror/commands/v/6.11.1) | 6.11.1 | MIT |
| [@codemirror/lang-javascript](https://www.npmjs.com/package/@codemirror/lang-javascript/v/6.2.5) | 6.2.5 | MIT |
| [@codemirror/language](https://www.npmjs.com/package/@codemirror/language/v/6.12.4) | 6.12.4 | MIT |
| [@codemirror/lint](https://www.npmjs.com/package/@codemirror/lint/v/6.9.7) | 6.9.7 | MIT |
| [@codemirror/search](https://www.npmjs.com/package/@codemirror/search/v/6.7.2) | 6.7.2 | MIT |
| [@codemirror/state](https://www.npmjs.com/package/@codemirror/state/v/6.7.6) | 6.7.6 | MIT |
| [@codemirror/view](https://www.npmjs.com/package/@codemirror/view/v/6.43.13) | 6.43.13 | MIT |
| [@fontsource-variable/jetbrains-mono](https://www.npmjs.com/package/@fontsource-variable/jetbrains-mono/v/5.3.0) | 5.3.0 | OFL-1.1 |
| [@kabelsalat/core](https://www.npmjs.com/package/@kabelsalat/core/v/0.4.0) | 0.4.0 | AGPL-3.0-or-later |
| [@kabelsalat/lib](https://www.npmjs.com/package/@kabelsalat/lib/v/0.4.1) | 0.4.1 | AGPL-3.0-or-later |
| [@kabelsalat/web](https://www.npmjs.com/package/@kabelsalat/web/v/0.4.1) | 0.4.1 | AGPL-3.0-or-later |
| [@lezer/common](https://www.npmjs.com/package/@lezer/common/v/1.5.3) | 1.5.3 | MIT |
| [@lezer/highlight](https://www.npmjs.com/package/@lezer/highlight/v/1.2.5) | 1.2.5 | MIT |
| [@lezer/javascript](https://www.npmjs.com/package/@lezer/javascript/v/1.5.6) | 1.5.6 | MIT |
| [@lezer/lr](https://www.npmjs.com/package/@lezer/lr/v/1.4.10) | 1.4.10 | MIT |
| [@marijn/find-cluster-break](https://www.npmjs.com/package/@marijn/find-cluster-break/v/1.0.4) | 1.0.4 | MIT |
| [@nanostores/persistent](https://www.npmjs.com/package/@nanostores/persistent/v/0.10.2) | 0.10.2 | MIT |
| [@oxc-project/types](https://www.npmjs.com/package/@oxc-project/types/v/0.152.0) | 0.152.0 | MIT |
| [@playwright/test](https://www.npmjs.com/package/@playwright/test/v/1.63.0) | 1.63.0 | Apache-2.0 |
| [@prettier/plugin-php](https://www.npmjs.com/package/@prettier/plugin-php/v/0.25.0) | 0.25.0 | MIT |
| [@replit/codemirror-emacs](https://www.npmjs.com/package/@replit/codemirror-emacs/v/6.1.0) | 6.1.0 | MIT |
| [@replit/codemirror-vim](https://www.npmjs.com/package/@replit/codemirror-vim/v/6.4.0) | 6.4.0 | MIT |
| [@replit/codemirror-vim-core](https://www.npmjs.com/package/@replit/codemirror-vim-core/v/0.1.0) | 0.1.0 | MIT |
| [@replit/codemirror-vscode-keymap](https://www.npmjs.com/package/@replit/codemirror-vscode-keymap/v/6.0.2) | 6.0.2 | MIT |
| [@rolldown/pluginutils](https://www.npmjs.com/package/@rolldown/pluginutils/v/1.0.1) | 1.0.1 | MIT |
| [@rollup/plugin-node-resolve](https://www.npmjs.com/package/@rollup/plugin-node-resolve/v/15.3.1) | 15.3.1 | MIT |
| [@rollup/pluginutils](https://www.npmjs.com/package/@rollup/pluginutils/v/5.4.0) | 5.4.0 | MIT |
| [@strudel/codemirror](https://www.npmjs.com/package/@strudel/codemirror/v/1.3.0) | 1.3.0 | AGPL-3.0-or-later |
| [@strudel/core](https://www.npmjs.com/package/@strudel/core/v/1.2.6) | 1.2.6 | AGPL-3.0-or-later |
| [@strudel/draw](https://www.npmjs.com/package/@strudel/draw/v/1.2.6) | 1.2.6 | AGPL-3.0-or-later |
| [@strudel/gamepad](https://www.npmjs.com/package/@strudel/gamepad/v/1.2.6) | 1.2.6 | AGPL-3.0-or-later |
| [@strudel/hydra](https://www.npmjs.com/package/@strudel/hydra/v/1.2.6) | 1.2.6 | AGPL-3.0-or-later |
| [@strudel/midi](https://www.npmjs.com/package/@strudel/midi/v/1.3.0) | 1.3.0 | AGPL-3.0-or-later |
| [@strudel/mini](https://www.npmjs.com/package/@strudel/mini/v/1.2.6) | 1.2.6 | AGPL-3.0-or-later |
| [@strudel/osc](https://www.npmjs.com/package/@strudel/osc/v/1.3.2) | 1.3.2 | AGPL-3.0-or-later |
| [@strudel/serial](https://www.npmjs.com/package/@strudel/serial/v/1.2.6) | 1.2.6 | AGPL-3.0-or-later |
| [@strudel/soundfonts](https://www.npmjs.com/package/@strudel/soundfonts/v/1.3.0) | 1.3.0 | AGPL-3.0-or-later |
| [@strudel/tonal](https://www.npmjs.com/package/@strudel/tonal/v/1.2.6) | 1.2.6 | AGPL-3.0-or-later |
| [@strudel/transpiler](https://www.npmjs.com/package/@strudel/transpiler/v/1.2.6) | 1.2.6 | AGPL-3.0-or-later |
| [@strudel/webaudio](https://www.npmjs.com/package/@strudel/webaudio/v/1.3.0) | 1.3.0 | AGPL-3.0-or-later |
| [@strudel/xen](https://www.npmjs.com/package/@strudel/xen/v/1.2.6) | 1.2.6 | AGPL-3.0-or-later |
| [@tonaljs/abc-notation](https://www.npmjs.com/package/@tonaljs/abc-notation/v/4.9.2) | 4.9.2 | MIT |
| [@tonaljs/array](https://www.npmjs.com/package/@tonaljs/array/v/4.8.5) | 4.8.5 | MIT |
| [@tonaljs/chord](https://www.npmjs.com/package/@tonaljs/chord/v/4.10.2) | 4.10.2 | MIT |
| [@tonaljs/chord](https://www.npmjs.com/package/@tonaljs/chord/v/6.2.0) | 6.2.0 | MIT |
| [@tonaljs/chord-detect](https://www.npmjs.com/package/@tonaljs/chord-detect/v/4.9.2) | 4.9.2 | MIT |
| [@tonaljs/chord-type](https://www.npmjs.com/package/@tonaljs/chord-type/v/5.2.0) | 5.2.0 | MIT |
| [@tonaljs/chord-type](https://www.npmjs.com/package/@tonaljs/chord-type/v/4.8.2) | 4.8.2 | MIT |
| [@tonaljs/chord-type](https://www.npmjs.com/package/@tonaljs/chord-type/v/5.2.0) | 5.2.0 | MIT |
| [@tonaljs/chord-type](https://www.npmjs.com/package/@tonaljs/chord-type/v/5.2.0) | 5.2.0 | MIT |
| [@tonaljs/collection](https://www.npmjs.com/package/@tonaljs/collection/v/4.9.0) | 4.9.0 | MIT |
| [@tonaljs/core](https://www.npmjs.com/package/@tonaljs/core/v/4.10.4) | 4.10.4 | MIT |
| [@tonaljs/duration-value](https://www.npmjs.com/package/@tonaljs/duration-value/v/4.9.0) | 4.9.0 | MIT |
| [@tonaljs/interval](https://www.npmjs.com/package/@tonaljs/interval/v/4.8.2) | 4.8.2 | MIT |
| [@tonaljs/interval](https://www.npmjs.com/package/@tonaljs/interval/v/5.1.0) | 5.1.0 | MIT |
| [@tonaljs/interval](https://www.npmjs.com/package/@tonaljs/interval/v/5.1.0) | 5.1.0 | MIT |
| [@tonaljs/key](https://www.npmjs.com/package/@tonaljs/key/v/4.11.3) | 4.11.3 | MIT |
| [@tonaljs/midi](https://www.npmjs.com/package/@tonaljs/midi/v/4.10.3) | 4.10.3 | MIT |
| [@tonaljs/mode](https://www.npmjs.com/package/@tonaljs/mode/v/4.9.3) | 4.9.3 | MIT |
| [@tonaljs/note](https://www.npmjs.com/package/@tonaljs/note/v/4.12.2) | 4.12.2 | MIT |
| [@tonaljs/pcset](https://www.npmjs.com/package/@tonaljs/pcset/v/4.10.2) | 4.10.2 | MIT |
| [@tonaljs/pitch](https://www.npmjs.com/package/@tonaljs/pitch/v/5.0.2) | 5.0.2 | MIT |
| [@tonaljs/pitch](https://www.npmjs.com/package/@tonaljs/pitch/v/5.0.2) | 5.0.2 | MIT |
| [@tonaljs/pitch](https://www.npmjs.com/package/@tonaljs/pitch/v/5.0.2) | 5.0.2 | MIT |
| [@tonaljs/pitch](https://www.npmjs.com/package/@tonaljs/pitch/v/5.0.1) | 5.0.1 | MIT |
| [@tonaljs/pitch](https://www.npmjs.com/package/@tonaljs/pitch/v/5.0.2) | 5.0.2 | MIT |
| [@tonaljs/pitch](https://www.npmjs.com/package/@tonaljs/pitch/v/5.0.2) | 5.0.2 | MIT |
| [@tonaljs/pitch](https://www.npmjs.com/package/@tonaljs/pitch/v/5.0.2) | 5.0.2 | MIT |
| [@tonaljs/pitch](https://www.npmjs.com/package/@tonaljs/pitch/v/5.0.2) | 5.0.2 | MIT |
| [@tonaljs/pitch-distance](https://www.npmjs.com/package/@tonaljs/pitch-distance/v/5.0.2) | 5.0.2 | MIT |
| [@tonaljs/pitch-distance](https://www.npmjs.com/package/@tonaljs/pitch-distance/v/5.0.6) | 5.0.6 | MIT |
| [@tonaljs/pitch-interval](https://www.npmjs.com/package/@tonaljs/pitch-interval/v/6.1.1) | 6.1.1 | MIT |
| [@tonaljs/pitch-interval](https://www.npmjs.com/package/@tonaljs/pitch-interval/v/6.1.1) | 6.1.1 | MIT |
| [@tonaljs/pitch-interval](https://www.npmjs.com/package/@tonaljs/pitch-interval/v/6.1.1) | 6.1.1 | MIT |
| [@tonaljs/pitch-interval](https://www.npmjs.com/package/@tonaljs/pitch-interval/v/6.1.1) | 6.1.1 | MIT |
| [@tonaljs/pitch-interval](https://www.npmjs.com/package/@tonaljs/pitch-interval/v/5.0.2) | 5.0.2 | MIT |
| [@tonaljs/pitch-interval](https://www.npmjs.com/package/@tonaljs/pitch-interval/v/6.1.1) | 6.1.1 | MIT |
| [@tonaljs/pitch-interval](https://www.npmjs.com/package/@tonaljs/pitch-interval/v/6.1.1) | 6.1.1 | MIT |
| [@tonaljs/pitch-note](https://www.npmjs.com/package/@tonaljs/pitch-note/v/5.0.3) | 5.0.3 | MIT |
| [@tonaljs/pitch-note](https://www.npmjs.com/package/@tonaljs/pitch-note/v/6.1.1) | 6.1.1 | MIT |
| [@tonaljs/progression](https://www.npmjs.com/package/@tonaljs/progression/v/4.9.3) | 4.9.3 | MIT |
| [@tonaljs/range](https://www.npmjs.com/package/@tonaljs/range/v/4.9.3) | 4.9.3 | MIT |
| [@tonaljs/roman-numeral](https://www.npmjs.com/package/@tonaljs/roman-numeral/v/4.9.2) | 4.9.2 | MIT |
| [@tonaljs/scale](https://www.npmjs.com/package/@tonaljs/scale/v/4.13.5) | 4.13.5 | MIT |
| [@tonaljs/scale-type](https://www.npmjs.com/package/@tonaljs/scale-type/v/4.9.3) | 4.9.3 | MIT |
| [@tonaljs/time-signature](https://www.npmjs.com/package/@tonaljs/time-signature/v/4.10.0) | 4.10.0 | MIT |
| [@tonaljs/tonal](https://www.npmjs.com/package/@tonaljs/tonal/v/4.10.0) | 4.10.0 | MIT |
| [@types/estree](https://www.npmjs.com/package/@types/estree/v/1.0.9) | 1.0.9 | MIT |
| [@types/node](https://www.npmjs.com/package/@types/node/v/26.6.4) | 26.6.4 | MIT |
| [@types/react](https://www.npmjs.com/package/@types/react/v/19.3.0) | 19.3.0 | MIT |
| [@types/react-dom](https://www.npmjs.com/package/@types/react-dom/v/19.3.0) | 19.3.0 | MIT |
| [@types/resolve](https://www.npmjs.com/package/@types/resolve/v/1.20.2) | 1.20.2 | MIT |
| [@vitejs/plugin-react](https://www.npmjs.com/package/@vitejs/plugin-react/v/6.1.1) | 6.1.1 | MIT |
| [acorn](https://www.npmjs.com/package/acorn/v/8.18.0) | 8.18.0 | MIT |
| [babel-plugin-add-module-exports](https://www.npmjs.com/package/babel-plugin-add-module-exports/v/0.2.1) | 0.2.1 | MIT |
| [buffer-alloc](https://www.npmjs.com/package/buffer-alloc/v/1.2.0) | 1.2.0 | MIT |
| [buffer-alloc-unsafe](https://www.npmjs.com/package/buffer-alloc-unsafe/v/1.1.0) | 1.1.0 | MIT |
| [buffer-fill](https://www.npmjs.com/package/buffer-fill/v/1.0.0) | 1.0.0 | MIT |
| [buffer-from](https://www.npmjs.com/package/buffer-from/v/1.1.2) | 1.1.2 | MIT |
| [chord-voicings](https://www.npmjs.com/package/chord-voicings/v/0.0.1) | 0.0.1 | ISC |
| [core-util-is](https://www.npmjs.com/package/core-util-is/v/1.0.3) | 1.0.3 | MIT |
| [crelt](https://www.npmjs.com/package/crelt/v/1.0.7) | 1.0.7 | MIT |
| [csstype](https://www.npmjs.com/package/csstype/v/3.2.3) | 3.2.3 | MIT |
| [dct](https://www.npmjs.com/package/dct/v/0.1.0) | 0.1.0 | MIT |
| [debug](https://www.npmjs.com/package/debug/v/2.6.9) | 2.6.9 | MIT |
| [debug](https://www.npmjs.com/package/debug/v/2.6.9) | 2.6.9 | MIT |
| [deepmerge](https://www.npmjs.com/package/deepmerge/v/4.3.1) | 4.3.1 | MIT |
| [detect-libc](https://www.npmjs.com/package/detect-libc/v/2.1.2) | 2.1.2 | Apache-2.0 |
| [djipevents](https://www.npmjs.com/package/djipevents/v/2.0.7) | 2.0.7 | Apache-2.0 |
| [es-errors](https://www.npmjs.com/package/es-errors/v/1.3.0) | 1.3.0 | MIT |
| [escodegen](https://www.npmjs.com/package/escodegen/v/2.1.0) | 2.1.0 | BSD-2-Clause |
| [esprima](https://www.npmjs.com/package/esprima/v/4.0.1) | 4.0.1 | BSD-2-Clause |
| [estraverse](https://www.npmjs.com/package/estraverse/v/5.3.0) | 5.3.0 | BSD-2-Clause |
| [estree-walker](https://www.npmjs.com/package/estree-walker/v/2.0.2) | 2.0.2 | MIT |
| [estree-walker](https://www.npmjs.com/package/estree-walker/v/3.0.3) | 3.0.3 | MIT |
| [esutils](https://www.npmjs.com/package/esutils/v/2.0.3) | 2.0.3 | BSD-2-Clause |
| [events](https://www.npmjs.com/package/events/v/1.1.1) | 1.1.1 | MIT |
| [fdir](https://www.npmjs.com/package/fdir/v/6.5.0) | 6.5.0 | MIT |
| [fflate](https://www.npmjs.com/package/fflate/v/0.8.3) | 0.8.3 | MIT |
| [fftjs](https://www.npmjs.com/package/fftjs/v/0.0.4) | 0.0.4 | MIT |
| [fraction.js](https://www.npmjs.com/package/fraction.js/v/5.3.4) | 5.3.4 | MIT |
| [function-bind](https://www.npmjs.com/package/function-bind/v/1.1.2) | 1.1.2 | MIT |
| [hasown](https://www.npmjs.com/package/hasown/v/2.0.4) | 2.0.4 | MIT |
| [hydra-synth](https://www.npmjs.com/package/hydra-synth/v/1.4.0) | 1.4.0 | AGPL |
| [inherits](https://www.npmjs.com/package/inherits/v/2.0.4) | 2.0.4 | ISC |
| [is-core-module](https://www.npmjs.com/package/is-core-module/v/2.17.0) | 2.17.0 | MIT |
| [is-module](https://www.npmjs.com/package/is-module/v/1.0.0) | 1.0.0 | MIT |
| [isarray](https://www.npmjs.com/package/isarray/v/0.0.1) | 0.0.1 | MIT |
| [lightningcss](https://www.npmjs.com/package/lightningcss/v/1.33.0) | 1.33.0 | MPL-2.0 |
| [linguist-languages](https://www.npmjs.com/package/linguist-languages/v/8.2.0) | 8.2.0 | MIT |
| [long](https://www.npmjs.com/package/long/v/4.0.0) | 4.0.0 | Apache-2.0 |
| [lucide-react](https://www.npmjs.com/package/lucide-react/v/1.49.0) | 1.49.0 | ISC |
| [meyda](https://www.npmjs.com/package/meyda/v/5.6.3) | 5.6.3 | MIT |
| [ms](https://www.npmjs.com/package/ms/v/2.0.0) | 2.0.0 | MIT |
| [ms](https://www.npmjs.com/package/ms/v/2.0.0) | 2.0.0 | MIT |
| [nanoid](https://www.npmjs.com/package/nanoid/v/3.3.19) | 3.3.19 | MIT |
| [nanostores](https://www.npmjs.com/package/nanostores/v/0.11.4) | 0.11.4 | MIT |
| [node-getopt](https://www.npmjs.com/package/node-getopt/v/0.3.2) | 0.3.2 | MIT |
| [osc](https://www.npmjs.com/package/osc/v/2.4.5) | 2.4.5 | (MIT OR GPL-2.0) |
| [path-parse](https://www.npmjs.com/package/path-parse/v/1.0.7) | 1.0.7 | MIT |
| [performance-now](https://www.npmjs.com/package/performance-now/v/2.1.0) | 2.1.0 | MIT |
| [php-parser](https://www.npmjs.com/package/php-parser/v/3.7.0) | 3.7.0 | BSD-3-Clause |
| [picocolors](https://www.npmjs.com/package/picocolors/v/1.1.1) | 1.1.1 | ISC |
| [picomatch](https://www.npmjs.com/package/picomatch/v/4.0.7) | 4.0.7 | MIT |
| [playwright](https://www.npmjs.com/package/playwright/v/1.63.0) | 1.63.0 | Apache-2.0 |
| [playwright-core](https://www.npmjs.com/package/playwright-core/v/1.63.0) | 1.63.0 | Apache-2.0 |
| [postcss](https://www.npmjs.com/package/postcss/v/8.5.28) | 8.5.28 | MIT |
| [prettier](https://www.npmjs.com/package/prettier/v/3.9.9) | 3.9.9 | MIT |
| [raf](https://www.npmjs.com/package/raf/v/3.4.1) | 3.4.1 | MIT |
| [raf-loop](https://www.npmjs.com/package/raf-loop/v/1.1.3) | 1.1.3 | MIT |
| [react](https://www.npmjs.com/package/react/v/19.3.0) | 19.3.0 | MIT |
| [react-dom](https://www.npmjs.com/package/react-dom/v/19.3.0) | 19.3.0 | MIT |
| [readable-stream](https://www.npmjs.com/package/readable-stream/v/1.1.14) | 1.1.14 | MIT |
| [regl](https://www.npmjs.com/package/regl/v/1.7.0) | 1.7.0 | MIT |
| [resolve](https://www.npmjs.com/package/resolve/v/1.22.12) | 1.22.12 | MIT |
| [right-now](https://www.npmjs.com/package/right-now/v/1.0.0) | 1.0.0 | MIT |
| [rolldown](https://www.npmjs.com/package/rolldown/v/1.2.12) | 1.2.12 | MIT |
| [scheduler](https://www.npmjs.com/package/scheduler/v/0.28.0) | 0.28.0 | MIT |
| [sfumato](https://www.npmjs.com/package/sfumato/v/0.1.2) | 0.1.2 | ISC |
| [slip](https://www.npmjs.com/package/slip/v/1.0.2) | 1.0.2 | (MIT OR GPL-2.0) |
| [soundfont2](https://www.npmjs.com/package/soundfont2/v/0.4.0) | 0.4.0 | MIT |
| [soundfont2](https://www.npmjs.com/package/soundfont2/v/0.5.0) | 0.5.0 | MIT |
| [source-map-js](https://www.npmjs.com/package/source-map-js/v/1.2.2) | 1.2.2 | BSD-3-Clause |
| [stream-parser](https://www.npmjs.com/package/stream-parser/v/0.3.1) | 0.3.1 | MIT |
| [string_decoder](https://www.npmjs.com/package/string_decoder/v/0.10.31) | 0.10.31 | MIT |
| [style-mod](https://www.npmjs.com/package/style-mod/v/4.1.4) | 4.1.4 | MIT |
| [superdough](https://www.npmjs.com/package/superdough/v/1.3.0) | 1.3.0 | AGPL-3.0-or-later |
| [supports-preserve-symlinks-flag](https://www.npmjs.com/package/supports-preserve-symlinks-flag/v/1.0.0) | 1.0.0 | MIT |
| [supradough](https://www.npmjs.com/package/supradough/v/1.2.4) | 1.2.4 | AGPL-3.0-or-later |
| [tinyglobby](https://www.npmjs.com/package/tinyglobby/v/0.2.17) | 0.2.17 | MIT |
| [typescript](https://www.npmjs.com/package/typescript/v/7.0.2) | 7.0.2 | Apache-2.0 |
| [undici-types](https://www.npmjs.com/package/undici-types/v/8.9.0) | 8.9.0 | MIT |
| [vite](https://www.npmjs.com/package/vite/v/8.3.2) | 8.3.2 | MIT |
| [w3c-keyname](https://www.npmjs.com/package/w3c-keyname/v/2.2.8) | 2.2.8 | MIT |
| [wav](https://www.npmjs.com/package/wav/v/1.0.2) | 1.0.2 | MIT |
| [webmidi](https://www.npmjs.com/package/webmidi/v/3.3.1) | 3.3.1 | Apache-2.0 |
| [wolfy87-eventemitter](https://www.npmjs.com/package/wolfy87-eventemitter/v/5.2.9) | 5.2.9 | Unlicense |
| [ws](https://www.npmjs.com/package/ws/v/8.21.0) | 8.21.0 | MIT |
| [ws](https://www.npmjs.com/package/ws/v/8.21.0) | 8.21.0 | MIT |
