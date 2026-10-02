import test from "node:test";
import assert from "node:assert/strict";
import {
  plainString,
  sampleMapCode,
  sampleSnippet,
  sampleQuoteRepairs,
} from "../src/samples/sample-code.mjs";
import { parse } from "acorn";
const parseCode = (code) => parse(code, { ecmaVersion: "latest" });

test("generated sample maps preserve signed URLs and escaped names as plain JavaScript strings", () => {
  const url = "https://example.org/media/id?expires=42&signature=a'b\\c";
  const source =
    "samples(" +
    sampleMapCode({ "sample's name": { C4: [url] }, plain: url }) +
    ")";
  assert.doesNotThrow(() => parseCode(source));
  assert.deepEqual(sampleQuoteRepairs(source), []);
  assert.equal(Function("return " + plainString(url))(), url);
  assert.doesNotThrow(() => parseCode(sampleSnippet("My sample", url)));
});
test("repair is limited to literal strings in sample maps, preserving music and comments", () => {
  const source =
    '// https://example.org/comment\nsamples({ "recording": "https://example.org/voice.wav" })\n$: s("recording*4").gain(".5 .8")';
  const edits = sampleQuoteRepairs(source);
  assert.equal(edits.length, 2);
  let repaired = source;
  for (const edit of [...edits].reverse())
    repaired =
      repaired.slice(0, edit.from) + edit.insert + repaired.slice(edit.to);
  assert.ok(repaired.includes('s("recording*4").gain(".5 .8")'));
  assert.ok(repaired.startsWith("// https://example.org/comment"));
  assert.doesNotThrow(() => parseCode(repaired));
  assert.deepEqual(sampleQuoteRepairs('const f = () => "hello"; s("bd")'), []);
  assert.deepEqual(sampleQuoteRepairs('samples(() => "hello")'), []);
  assert.deepEqual(sampleQuoteRepairs("s("), []);
});
