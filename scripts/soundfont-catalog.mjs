import fs from "node:fs";
import gm from "../node_modules/@strudel/soundfonts/gm.mjs";
fs.writeFileSync(
  "src/samples/gm-catalog.json",
  JSON.stringify(
    Object.entries(gm).map(([name, fonts]) => ({ name, count: fonts.length })),
    null,
    2,
  ) + "\n",
);
