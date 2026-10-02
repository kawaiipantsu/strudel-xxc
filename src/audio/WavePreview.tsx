import { useEffect, useRef } from "react";
export function WavePreview({ blob }: { blob: Blob }) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    let alive = true;
    const ac = new AudioContext();
    blob
      .arrayBuffer()
      .then((b) => ac.decodeAudioData(b))
      .then((b) => {
        if (!alive || !ref.current) return;
        const c = ref.current,
          w = (c.width = 900),
          h = (c.height = 120),
          x = c.getContext("2d")!,
          d = b.getChannelData(0);
        x.strokeStyle = "#ff3b47";
        x.beginPath();
        for (let px = 0; px < w; px++) {
          let peak = 0;
          for (
            let i = Math.floor((px / w) * d.length);
            i < Math.floor(((px + 1) / w) * d.length);
            i++
          )
            peak = Math.max(peak, Math.abs(d[i]));
          x.moveTo(px, h / 2 - peak * h * 0.45);
          x.lineTo(px, h / 2 + peak * h * 0.45);
        }
        x.stroke();
      })
      .catch(() => {})
      .finally(() => ac.close());
    return () => {
      alive = false;
    };
  }, [blob]);
  return (
    <canvas
      ref={ref}
      className="recording-wave"
      aria-label="Waveform of the recorded master output"
    />
  );
}
