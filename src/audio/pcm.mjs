export function encodeWav(channels, sampleRate) {
  const frames = channels[0]?.length || 0;
  const buffer = new ArrayBuffer(44 + frames * channels.length * 2),
    v = new DataView(buffer);
  const str = (offset, text) => {
    [...text].forEach((c, i) => v.setUint8(offset + i, c.charCodeAt(0)));
  };
  str(0, "RIFF");
  v.setUint32(4, buffer.byteLength - 8, true);
  str(8, "WAVE");
  str(12, "fmt ");
  v.setUint32(16, 16, true);
  v.setUint16(20, 1, true);
  v.setUint16(22, channels.length, true);
  v.setUint32(24, sampleRate, true);
  v.setUint32(28, sampleRate * channels.length * 2, true);
  v.setUint16(32, channels.length * 2, true);
  v.setUint16(34, 16, true);
  str(36, "data");
  v.setUint32(40, buffer.byteLength - 44, true);
  let offset = 44;
  for (let i = 0; i < frames; i++)
    for (const ch of channels) {
      const x = Math.max(-1, Math.min(1, ch[i] || 0));
      v.setInt16(offset, x < 0 ? x * 32768 : x * 32767, true);
      offset += 2;
    }
  return buffer;
}
export function editPCM(channels, operation, start = 0, end = 1, gain = 1) {
  const n = channels[0].length,
    a = Math.max(0, Math.min(n, Math.floor(start * n))),
    b = Math.max(a, Math.min(n, Math.ceil(end * n)));
  let peak = 0;
  if (operation === "normalize")
    for (const ch of channels)
      for (let i = a; i < b; i++) peak = Math.max(peak, Math.abs(ch[i]));
  return channels.map((ch) => {
    if (operation === "crop") return ch.slice(a, b);
    if (operation === "cut") {
      const out = new Float32Array(n - (b - a));
      out.set(ch.slice(0, a));
      out.set(ch.slice(b), a);
      return out;
    }
    if (operation === "duplicate") {
      const out = new Float32Array(n + b - a);
      out.set(ch.slice(0, b));
      out.set(ch.slice(a, b), b);
      out.set(ch.slice(b), b + b - a);
      return out;
    }
    const out = ch.slice();
    for (let i = a; i < b; i++) {
      if (operation === "reverse") out[i] = ch[b - 1 - (i - a)];
      else if (operation === "fade-in")
        out[i] *= (i - a) / Math.max(1, b - a - 1);
      else if (operation === "fade-out")
        out[i] *= (b - 1 - i) / Math.max(1, b - a - 1);
      else if (operation === "gain") out[i] *= gain;
      else if (operation === "normalize") out[i] *= peak ? 0.95 / peak : 1;
    }
    return out;
  });
}
export function trimSilence(channels, threshold = 0.005) {
  const n = channels[0].length;
  let a = 0,
    b = n;
  const quiet = (i) => channels.every((ch) => Math.abs(ch[i]) < threshold);
  while (a < b && quiet(a)) a++;
  while (b > a && quiet(b - 1)) b--;
  return channels.map((c) => c.slice(a, b));
}
export function resamplePCM(channels, fromRate, toRate) {
  const ratio = fromRate / toRate;
  return channels.map((ch) => {
    const out = new Float32Array(Math.round(ch.length / ratio));
    for (let i = 0; i < out.length; i++) {
      const p = i * ratio,
        j = Math.floor(p),
        f = p - j;
      out[i] =
        (ch[j] || 0) * (1 - f) + (ch[Math.min(j + 1, ch.length - 1)] || 0) * f;
    }
    return out;
  });
}
export function encodeFloatWav(channels, sampleRate) {
  const frames = channels[0]?.length || 0;
  const buffer = new ArrayBuffer(44 + frames * channels.length * 4),
    v = new DataView(buffer);
  const str = (offset, text) => {
    [...text].forEach((c, i) => v.setUint8(offset + i, c.charCodeAt(0)));
  };
  str(0, "RIFF");
  v.setUint32(4, buffer.byteLength - 8, true);
  str(8, "WAVE");
  str(12, "fmt ");
  v.setUint32(16, 16, true);
  v.setUint16(20, 3, true);
  v.setUint16(22, channels.length, true);
  v.setUint32(24, sampleRate, true);
  v.setUint32(28, sampleRate * channels.length * 4, true);
  v.setUint16(32, channels.length * 4, true);
  v.setUint16(34, 32, true);
  str(36, "data");
  v.setUint32(40, buffer.byteLength - 44, true);
  let offset = 44;
  for (let i = 0; i < frames; i++)
    for (const ch of channels) {
      v.setFloat32(offset, Number.isFinite(ch[i]) ? ch[i] : 0, true);
      offset += 4;
    }
  return buffer;
}
