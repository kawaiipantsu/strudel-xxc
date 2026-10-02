import fs from "node:fs";
import path from "node:path";
const pages = {
  "Getting-Started": "README.md",
  Architecture: "docs/ARCHITECTURE.md",
  Installation: "docs/INSTALL.md",
  Operations: "docs/OPERATIONS.md",
  Administration: "docs/ADMIN.md",
  API: "docs/API.md",
  Security: "docs/SECURITY.md",
  "Strudel-Integration": "docs/STRUDEL_INTEGRATION.md",
  "Audio-Engine": "docs/AUDIO_ENGINE.md",
  Visualizer: "docs/VISUALIZER.md",
  "VJ-Loops": "docs/VJ_LOOPS.md",
  "Samples-and-Storage": "docs/STORAGE.md",
  "Sample-Banks": "docs/SAMPLE_BANKS.md",
  Licensing: "docs/THIRD_PARTY_LICENSES.md",
  Troubleshooting: "docs/TROUBLESHOOTING.md",
  Contributing: "CONTRIBUTING.md",
  Community: "docs/wiki/Community.md",
  "Known-Limitations": "docs/KNOWN_LIMITATIONS.md",
  "Release-Verification": "docs/VERIFICATION.md",
  Discussions: "docs/COMMUNITY_THREADS.md",
};
for (const [page, file] of Object.entries(pages)) {
  let text = fs.readFileSync(file, "utf8");
  text = text.replace(
    /!\[([^\]]*)\]\((?!https?:)([^)]+)\)/g,
    (_, alt, link) =>
      `![${alt}](https://raw.githubusercontent.com/kawaiipantsu/strudel-xxc/main/${path.posix.normalize(path.posix.join(path.posix.dirname(file), link))})`,
  );
  text = text.replace(
    /\]\((?!https?:|#)([^)]+)\)/g,
    (_, link) =>
      "](https://github.com/kawaiipantsu/strudel-xxc/blob/main/" +
      path.posix.normalize(path.posix.join(path.posix.dirname(file), link)) +
      ")",
  );
  if (page === "Getting-Started")
    text = text.replace(
      'src="assets/strudel_xxc_dk_readme_banner.png"',
      'src="https://raw.githubusercontent.com/kawaiipantsu/strudel-xxc/main/assets/strudel_xxc_dk_readme_banner.png"',
    );
  fs.writeFileSync(".wiki/" + page + ".md", text);
}
const links = Object.keys(pages)
  .map((p) => `- [${p.replaceAll("-", " ")}](${p})`)
  .join("\n");
fs.writeFileSync(
  ".wiki/Home.md",
  `# XXC / THUGS(red) — Strudel Sandbox\n\n**A workstation for code, sound and signal.**\n\n[Open the studio](https://strudel.xxc.dk) · [Explore the public library](https://strudel.xxc.dk/library) · [Discuss scores and ideas](https://github.com/kawaiipantsu/strudel-xxc/discussions)\n\nThe studio runs the official Strudel engine inside an isolated editor runtime, with project storage, sample editing, recording, cover generation and a public remix library.\n\n## Guides\n\n${links}\n\n## First session\n\nPress Play, enable audio if prompted, change a pattern, and use Ctrl/Cmd+Enter to evaluate a selected expression or logical block. Ctrl/Cmd+. is Hush. Export a project ZIP before clearing browser cookies.\n\nThe source is AGPL-3.0-or-later. Original bundled samples and example scores are CC0-1.0.\n`,
);
fs.writeFileSync(
  ".wiki/_Sidebar.md",
  "# Strudel Sandbox\n\n[Home](Home)\n\n" + links + "\n",
);
fs.writeFileSync(
  ".wiki/_Footer.md",
  "XXC / THUGS(red) · [Studio](https://strudel.xxc.dk) · [Source](https://github.com/kawaiipantsu/strudel-xxc) · [Discussions](https://github.com/kawaiipantsu/strudel-xxc/discussions)\n",
);
console.log("Wiki documentation generated.");
