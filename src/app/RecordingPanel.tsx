import { useState, useEffect } from "react";
import { WavePreview } from "../audio/WavePreview";
import { api, download, mediaLink } from "./api";
import type { Media, Project } from "./types";
export function RecordingPanel({
  blob,
  project,
  ensureProject,
  onLog,
  onUpdate,
}: {
  blob: Blob | null;
  project: Project;
  ensureProject: () => Promise<string>;
  onLog: (s: string) => void;
  onUpdate: () => void;
}) {
  const [title, setTitle] = useState(project.title),
    [artist, setArtist] = useState(project.author),
    [comment, setComment] = useState(""),
    [format, setFormat] = useState("wav"),
    [busy, setBusy] = useState(false),
    [recording, setRecording] = useState<Media>(),
    [url, setUrl] = useState(""),
    [exports, setExports] = useState<Media[]>([]),
    [status, setStatus] = useState("");
  useEffect(() => {
    if (blob) {
      const u = URL.createObjectURL(blob);
      setUrl(u);
      return () => URL.revokeObjectURL(u);
    }
  }, [blob]);
  async function upload() {
    if (recording) return recording;
    if (!blob) throw new Error("Record a take first.");
    const id = await ensureProject();
    const form = new FormData();
    form.append("file", blob, "session.wav");
    form.append("project_id", id);
    const m = await api<Media>("recordings", "POST", form);
    setRecording(m);
    return m;
  }
  async function convert() {
    setBusy(true);
    try {
      setStatus("Uploading and encoding your take…");
      const m = await upload();
      const out = await api<Media>("exports", "POST", {
        recording_id: m.id,
        format,
        title,
        artist,
        comment,
      });
      setExports((x) => [out, ...x]);
      setStatus(format.toUpperCase() + " export ready.");
      onLog("Export complete: " + out.original_name);
    } catch (e) {
      setStatus(String(e));
    } finally {
      setBusy(false);
    }
  }
  return (
    <section>
      <span className="eyebrow">[ MASTER OUTPUT / RECORDING ]</span>
      <h2>Your take, captured.</h2>
      {blob ? (
        <>
          <p>
            Lossless stereo PCM from the actual SuperDough master output. WAV
            preserves the capture; MP3 and AAC are encoded by FFmpeg.
          </p>
          <WavePreview blob={blob} />
          <audio controls src={url} className="full-width" />
          <div className="form-grid">
            <label>
              Title
              <input value={title} onChange={(e) => setTitle(e.target.value)} />
            </label>
            <label>
              Artist
              <input
                value={artist}
                onChange={(e) => setArtist(e.target.value)}
              />
            </label>
            <label>
              Comment
              <input
                value={comment}
                onChange={(e) => setComment(e.target.value)}
              />
            </label>
            <label>
              Format
              <select
                value={format}
                onChange={(e) => setFormat(e.target.value)}
              >
                <option value="wav">WAV · 24-bit export</option>
                <option value="mp3">MP3 · 320 kbps</option>
                <option value="m4a">M4A / AAC · 256 kbps</option>
              </select>
            </label>
          </div>
          <p className="muted">
            Generate a cover in Export / Share before encoding to embed it in
            MP3 and M4A.
          </p>
          <div className="toolbar">
            <button onClick={() => download(blob, "take.wav")}>
              Download original WAV
            </button>
            <button className="primary" disabled={busy} onClick={convert}>
              {busy ? "Encoding…" : "Export with metadata"}
            </button>
            <button
              disabled={busy}
              onClick={async () => {
                setBusy(true);
                try {
                  const m = await upload();
                  await api("projects/" + m.project_id + "/preview", "POST", {
                    id: m.id,
                  });
                  setStatus("This take is now the project audio preview.");
                  onUpdate();
                } catch (e) {
                  setStatus(String(e));
                } finally {
                  setBusy(false);
                }
              }}
            >
              Set as project preview
            </button>
          </div>
        </>
      ) : (
        <p>
          Use the Record button in the transport to capture a performance. Stop
          recording to preview and export it here.
        </p>
      )}
      <p role="status">{status}</p>
      {exports.map((e) => (
        <div className="list-row" key={e.id}>
          <span>
            {e.original_name} · {(e.size / 1048576).toFixed(2)} MB
          </span>
          <a
            className="button"
            href={e.url + (e.url.includes("?") ? "&" : "?") + "download=1"}
            download
          >
            Download
          </a>
        </div>
      ))}
    </section>
  );
}
