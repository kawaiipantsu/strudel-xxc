import test from "node:test";
import assert from "node:assert/strict";
import { nextVJClip, sharedVJClip } from "../src/visuals/vj-random.mjs";
import { VideoDirector } from "../src/visuals/video-model.mjs";
const clips = Array.from({ length: 12 }, (_, id) => ({ id: String(id) }));
test("VJ choices use fresh randomness and avoid consecutive repeats", () => {
  const starts = new Set();
  let previous = "";
  for (let i = 0; i < 64; i++) {
    starts.add(nextVJClip(clips).id);
    const chosen = nextVJClip(clips, previous);
    assert.notEqual(chosen.id, previous);
    previous = chosen.id;
  }
  assert.ok(starts.size > 1);
  assert.equal(nextVJClip([]), undefined);
  assert.equal(nextVJClip([clips[0]], clips[0].id), clips[0]);
});
test("preview, background and fullscreen share one random choice without replaying the manual start", () => {
  const d = new VideoDirector();
  const initial = sharedVJClip(d, clips, "pack:manual", 0, clips[2].id);
  assert.equal(initial, clips[2]);
  assert.equal(sharedVJClip(d, clips, "pack:manual", 0), initial);
  const next = sharedVJClip(d, clips, "pack:manual", 1);
  assert.notEqual(next, initial);
  assert.equal(sharedVJClip(d, clips, "pack:manual", 1, clips[2].id), next);
  assert.ok(
    clips.slice(8).includes(sharedVJClip(d, clips.slice(8), "another pack", 1)),
  );
});
