import fs from "node:fs";
import path from "node:path";
const lock = JSON.parse(fs.readFileSync("package-lock.json", "utf8"));
const packages = [];
fs.mkdirSync("LICENSES/npm", { recursive: true });
for (const [name, data] of Object.entries(lock.packages)) {
  if (!name || data.optional) continue;
  const dir = path.resolve(name);
  if (!fs.existsSync(dir + "/package.json")) continue;
  const p = JSON.parse(fs.readFileSync(dir + "/package.json", "utf8"));
  const license = p.license || data.license || "SEE PACKAGE";
  const files = fs
    .readdirSync(dir)
    .filter((n) => /^(licen[sc]e|copying|notice)(\.|$)/i.test(n));
  for (const f of files) {
    if (fs.statSync(dir + "/" + f).isFile())
      fs.copyFileSync(
        dir + "/" + f,
        "LICENSES/npm/" + p.name.replaceAll("/", "__") + "-" + f,
      );
  }
  packages.push({
    name: p.name,
    version: p.version,
    license: typeof license === "object" ? license.type : license,
    url: "https://www.npmjs.com/package/" + p.name + "/v/" + p.version,
  });
}
packages.sort((a, b) => a.name.localeCompare(b.name));
fs.writeFileSync(
  "LICENSES/dependencies.json",
  JSON.stringify(packages, null, 2) + "\n",
);
const text =
  `# Third-party licenses\n\nGenerated from the pinned package lock. Full available license/notice files are in [LICENSES/npm](../LICENSES/npm). Build-only tooling is included for completeness.\n\n## Application and Strudel\n\nThis combined application is licensed AGPL-3.0-or-later. Strudel, SuperDough and their corresponding source notices are retained. See [Strudel integration](STRUDEL_INTEGRATION.md) for the upstream links, source availability and the documented WebKit compatibility transform.\n\n## Media, fonts and artwork\n\n- Original starter samples and example scores: CC0-1.0. Created specifically for this project, using deterministic synthesis in scripts/generate-samples.py. No third-party recordings are bundled.\n- JetBrains Mono: SIL Open Font License 1.1. The self-hosted variable WOFF2 font comes from @fontsource-variable/jetbrains-mono; the cover-generation TTF is JetBrains Mono v2.304 from the official JetBrains repository. Full OFL text is in LICENSES/JetBrains-Mono-OFL.txt.\n- Lucide SVG icons: ISC license, retained below.\n- Original programmatic identity graphics: distributed with the AGPL application. Brand names and marks remain those of their respective owners.\n- README banner: supplied by the project owner at assets/strudel_xxc_dk_readme_banner.png. It is not presented as a third-party asset or relicensed sample pack.\n- Hydra: hydra-synth is AGPL-3.0; loaded on demand.\n- Soundfont loading is available through the official package. No soundfont bank or questionable remote sample collection is bundled. Users remain responsible for the licenses of external samples and uploaded recordings.\n- Browser media encoders are platform components. FFmpeg and its codecs are host tooling; no FFmpeg binary is redistributed by this repository.\n\n## Pinned dependency inventory\n\n| Package | Version | License |\n|---|---|---|\n` +
  packages
    .map((p) => `| [${p.name}](${p.url}) | ${p.version} | ${p.license} |`)
    .join("\n") +
  "\n";
fs.writeFileSync("docs/THIRD_PARTY_LICENSES.md", text);
console.log(packages.length + " dependency notices inventoried.");
