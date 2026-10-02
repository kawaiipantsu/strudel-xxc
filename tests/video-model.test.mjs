import test from "node:test";
import assert from "node:assert/strict";
import {
  VideoDirector,
  defaultVideo,
  frequencyBands,
  sanitizeVideo,
  scenes,
} from "../src/visuals/video-model.mjs";

test("video settings reject unknown scene data and bound resource controls", () => {
  const config = sanitizeVideo({
    scene: "script",
    overlays: ["spider", "spider", "unknown"],
    sensitivity: Infinity,
    motion: -5,
    cycles: 0,
    palette: "__proto__",
  });
  assert.equal(config.scene, "nebula");
  assert.deepEqual(config.overlays, ["spider"]);
  assert.equal(config.palette, "red");
  assert.equal(config.sensitivity, 0.25);
  assert.equal(config.motion, 0.1);
  assert.equal(config.cycles, 8);
});
test("frequency bands distinguish low and high frequency input using actual bin spacing", () => {
  const fft = new Array(128).fill(0);
  fft[1] = 255;
  const bass = frequencyBands({ fft, fftBinHz: 187.5 });
  assert.ok(bass.bass > 0);
  assert.equal(bass.high, 0);
  fft[1] = 0;
  fft[32] = 255;
  const high = frequencyBands({ fft, fftBinHz: 187.5 });
  assert.equal(high.bass, 0);
  assert.ok(high.high > 0);
});
test("director advances on audible musical cycles, freezes through silence and reduced motion", () => {
  const d = new VideoDirector(),
    config = { ...defaultVideo, cycles: 4 };
  const signal = {
    rms: 0.1,
    peak: 0.4,
    fft: new Array(128).fill(100),
    phase: 0,
  };
  for (let n = 1; n <= 250; n++)
    d.update({ ...signal, phase: n * 0.025 }, config, n * 50);
  assert.ok(d.shot >= 1);
  assert.ok(scenes.some((s) => s.id === d.scene));
  assert.ok(d.energy > 0);
  const time = d.time,
    shot = d.shot;
  for (let n = 251; n <= 600; n++)
    d.update({ ...signal, rms: 0, peak: 0, phase: n * 0.025 }, config, n * 50);
  assert.equal(d.time, time);
  assert.equal(d.shot, shot);
  assert.ok(d.energy < 0.001);
  for (let n = 601; n <= 950; n++)
    d.update({ ...signal, phase: n * 0.025 }, config, n * 50, true);
  assert.equal(d.time, time);
  assert.equal(d.shot, shot);
  d.update(signal, { ...config, automatic: false, scene: "ribbons" }, 50000);
  assert.equal(d.scene, "ribbons");
});

test("VJ sequence advances on musical phrases without replacing manual clip selection", () => {
  const d = new VideoDirector(),
    config = sanitizeVideo({
      source: "vj",
      cycles: 4,
      vjRate: 99,
      vjClip: "0".repeat(64),
    });
  assert.equal(config.vjRate, 2);
  assert.equal(config.vjClip, "0".repeat(64));
  const signal = {
    rms: 0.15,
    peak: 0.5,
    fft: new Array(128).fill(120),
    phase: 0,
  };
  for (let n = 1; n < 250; n++)
    d.update({ ...signal, phase: n * 0.025 }, config, n * 50);
  assert.ok(d.vjShot > 0);
  const shot = d.vjShot;
  d.update(signal, { ...config, automatic: false }, 13000);
  assert.equal(d.vjShot, shot);
  d.next({ ...config, automatic: false });
  assert.equal(d.vjShot, shot + 1);
});

test("one- and two-cycle scenes follow a slow musical clock in both visual modes", () => {
  for (const source of ["generated", "vj"])
    for (const cycles of [1, 2]) {
      const config = sanitizeVideo({ source, cycles });
      assert.equal(config.cycles, cycles);
      const d = new VideoDirector();
      // At 0.125 CPS, two cycles last 16 seconds. Wall time alone must not cut early.
      const signal = { rms: 0.1, peak: 0.4, fft: [], phase: 0 };
      for (let n = 0; n < cycles * 160; n++)
        d.update({ ...signal, phase: n / 160 }, config, n * 50);
      assert.equal(source === "vj" ? d.vjShot : d.shot, 0);
      d.update({ ...signal, phase: cycles }, config, cycles * 8000);
      assert.equal(source === "vj" ? d.vjShot : d.shot, 1);
    }
});
