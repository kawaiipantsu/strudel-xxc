import test from "node:test";
import assert from "node:assert/strict";
import {
  bankIndex,
  bankCode,
  bankVoiceCode,
} from "../src/samples/bank-index.mjs";
test("bank index keeps canonical names, merges runtime case and exposes short aliases", () => {
  const banks = bankIndex(
    [
      { name: "RolandTR909_bd", alias: "TR909_bd", collection: "machines" },
      { name: "RolandTR909_hh", alias: "TR909_hh", collection: "machines" },
    ],
    ["rolandtr909_bd", "tr909_hh", "custom_kick", "piano", "../../bad_name"],
  );
  assert.equal(banks.length, 3);
  assert.deepEqual(
    banks.find((b) => b.name === "RolandTR909"),
    {
      name: "RolandTR909",
      aliases: ["TR909"],
      voices: ["bd", "hh"],
      collections: ["machines"],
    },
  );
  assert.deepEqual(banks.find((b) => b.name === "custom").voices, ["kick"]);
  assert.deepEqual(banks.find((b) => b.name === "").voices, ["piano"]);
});
test("bank snippets preserve ordinary Strudel syntax and pitched soundfont voices", () => {
  assert.equal(bankCode("RolandTR909"), '.bank("RolandTR909")');
  assert.equal(bankVoiceCode("TR909", "bd"), 's("bd").bank("TR909")');
  assert.equal(
    bankVoiceCode("gm", "piano"),
    'note("c3").s("piano").bank("gm")',
  );
  assert.equal(bankVoiceCode("", "piano"), 's("piano")');
});
