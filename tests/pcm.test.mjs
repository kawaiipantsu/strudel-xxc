import test from "node:test";
import assert from "node:assert/strict";
import {
  encodeWav,
  editPCM,
  trimSilence,
  resamplePCM,
} from "../src/audio/pcm.mjs";
test("WAV encodes interleaved stereo PCM with valid headers and clipping", () => {
  const data = encodeWav(
    [new Float32Array([1, -1, 2]), new Float32Array([0.5, 0, -2])],
    48000,
  );
  const v = new DataView(data);
  assert.equal(v.getUint32(24, true), 48000);
  assert.equal(v.getUint16(22, true), 2);
  assert.equal(v.getInt16(44, true), 32767);
  assert.equal(v.getInt16(48, true), -32768);
  assert.equal(v.getInt16(54, true), -32768);
  assert.equal(data.byteLength, 56);
});
test("region operations leave channels aligned and original PCM intact", () => {
  const input = [
    new Float32Array([1, 2, 3, 4]),
    new Float32Array([5, 6, 7, 8]),
  ];
  assert.deepEqual([...editPCM(input, "crop", 0.25, 0.75)[0]], [2, 3]);
  assert.deepEqual([...editPCM(input, "cut", 0.25, 0.75)[1]], [5, 8]);
  assert.deepEqual(
    [...editPCM(input, "duplicate", 0.25, 0.75)[0]],
    [1, 2, 3, 2, 3, 4],
  );
  assert.deepEqual([...editPCM(input, "reverse", 0.25, 0.75)[0]], [1, 3, 2, 4]);
  assert.deepEqual([...input[0]], [1, 2, 3, 4]);
});
test("normalization uses shared stereo peak to preserve balance", () => {
  const out = editPCM(
    [new Float32Array([0.5, -0.5]), new Float32Array([0.25, -0.25])],
    "normalize",
  );
  assert.ok(Math.abs(out[0][0] - 0.95) < 1e-6);
  assert.ok(Math.abs(out[1][0] - 0.475) < 1e-6);
});
test("silence trimming respects both channels and resampling preserves duration", () => {
  const out = trimSilence([
    new Float32Array([0, 0, 1, 0]),
    new Float32Array([0, 0.5, 0, 0]),
  ]);
  assert.equal(out[0].length, 2);
  assert.deepEqual([...out[1]], [0.5, 0]);
  assert.equal(resamplePCM(out, 2, 4)[0].length, 4);
});
