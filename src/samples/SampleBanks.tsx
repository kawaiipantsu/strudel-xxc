import { useEffect, useMemo, useRef, useState } from "react";
import gmSounds from "./gm-catalog.json";

type Sound = {
  name: string;
  collection: string;
  count: number;
  preview: string;
  alias?: string;
};
type Catalogue = {
  stats: { sounds: number; files: number };
  collections: {
    id: string;
    name: string;
    license: string;
    author: string;
    repository: string;
  }[];
  sounds: Sound[];
};

export function SampleBanks({
  query,
  insert,
  onLog,
}: {
  query: string;
  insert: (code: string) => void;
  onLog: (message: string) => void;
}) {
  const [catalogue, setCatalogue] = useState<Catalogue>();
  const [error, setError] = useState("");
  const [collection, setCollection] = useState("");
  const [limit, setLimit] = useState(40);
  const [onlyFavorites, setOnlyFavorites] = useState(false);
  const [playing, setPlaying] = useState("");
  const preview = useRef<HTMLAudioElement | null>(null);
  const [favorites, setFavorites] = useState<string[]>(() => {
    try {
      const value = JSON.parse(localStorage.getItem("xxc-favorites") || "[]");
      return Array.isArray(value)
        ? value.filter((s) => typeof s === "string")
        : [];
    } catch {
      return [];
    }
  });
  useEffect(() => {
    const controller = new AbortController();
    fetch("/sample-banks/catalog.json", {
      signal: controller.signal,
      cache: "no-cache",
    })
      .then((r) => {
        if (!r.ok) throw new Error("Sample catalogue unavailable");
        return r.json();
      })
      .then(setCatalogue)
      .catch((e) => {
        if (e.name !== "AbortError") setError(e.message);
      });
    return () => {
      controller.abort();
      preview.current?.pause();
    };
  }, []);
  useEffect(() => {
    setLimit(40);
  }, [query, collection, onlyFavorites]);
  const shown = useMemo(() => {
    const terms = query.trim().toLowerCase().split(/\s+/);
    return (catalogue?.sounds || []).filter(
      (s) =>
        (!collection || s.collection === collection) &&
        (!onlyFavorites || favorites.includes(s.name)) &&
        terms.every((term) =>
          (s.name + " " + (s.alias || "")).toLowerCase().includes(term),
        ),
    );
  }, [catalogue, query, collection, onlyFavorites, favorites]);

  function audition(sound: Sound) {
    preview.current?.pause();
    if (playing === sound.name) {
      setPlaying("");
      return;
    }
    const audio = new Audio(sound.preview);
    preview.current = audio;
    audio.volume = 0.6;
    setPlaying(sound.name);
    audio.onended = () => {
      if (preview.current === audio) setPlaying("");
    };
    audio.play().catch(() => {
      if (preview.current !== audio) return;
      setPlaying("");
      onLog(
        "Could not preview " +
          sound.name +
          ". Check the network connection and browser audio permission.",
      );
    });
  }

  return (
    <section
      aria-label="Installed Strudel sample banks"
      className="sample-banks"
    >
      <div className="pane-heading">STRUDEL SAMPLE BANKS</div>
      {error && <p role="status">{error}. Reload the studio to retry.</p>}
      {!catalogue && !error && <p role="status">Loading sample catalogue…</p>}
      {catalogue && (
        <>
          <p className="sample-bank-summary">
            {catalogue.stats.sounds.toLocaleString()} sounds ·{" "}
            {catalogue.stats.files.toLocaleString()} local files
          </p>
          <div className="sample-bank-filters">
            <select
              aria-label="Sample collection"
              value={collection}
              onChange={(e) => setCollection(e.target.value)}
            >
              <option value="">All collections</option>
              {catalogue.collections.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
            <button
              aria-label="Show favorite samples"
              aria-pressed={onlyFavorites}
              onClick={() => setOnlyFavorites(!onlyFavorites)}
            >
              ★
            </button>
          </div>
          <p className="sample-bank-summary" role="status">
            {shown.length} matching sounds · loaded on demand
          </p>
          {shown.slice(0, limit).map((s) => (
            <div className="sample-row" key={s.name}>
              <button
                aria-label={"Favorite " + s.name}
                aria-pressed={favorites.includes(s.name)}
                onClick={() => {
                  const next = favorites.includes(s.name)
                    ? favorites.filter((n) => n !== s.name)
                    : [...favorites, s.name];
                  setFavorites(next);
                  localStorage.setItem("xxc-favorites", JSON.stringify(next));
                }}
              >
                {favorites.includes(s.name) ? "★" : "☆"}
              </button>
              <div className="sample-bank-name">
                <b title={s.name}>{s.name}</b>
                <small>
                  {s.count} {s.count === 1 ? "sample" : "samples"}
                  {s.alias ? " · " + s.alias : ""}
                </small>
              </div>
              <button
                aria-label={
                  (playing === s.name ? "Stop preview " : "Preview ") + s.name
                }
                onClick={() => audition(s)}
              >
                {playing === s.name ? "■" : "▶"}
              </button>
              <button
                aria-label={"Insert " + s.name}
                onClick={() =>
                  insert(
                    s.name.startsWith("wt_")
                      ? `note("c3").s("${s.name}")`
                      : `s("${s.name}")`,
                  )
                }
              >
                Insert
              </button>
            </div>
          ))}
          {shown.length > limit && (
            <button className="full-width" onClick={() => setLimit(limit + 40)}>
              Show 40 more
            </button>
          )}
          {catalogue.collections
            .filter((c) => c.id === collection)
            .map((c) => (
              <p className="sample-bank-summary" key={c.id}>
                {c.author}
                <br />
                {c.license}
                <br />
                <a href={c.repository} target="_blank" rel="noreferrer">
                  Upstream collection ↗
                </a>
              </p>
            ))}
          <p className="sample-bank-summary">
            Use <code>.bank("RolandTR909")</code> or a full sound name.{" "}
            <code>crackle</code> is a built-in synth.
          </p>
          {!collection && !onlyFavorites && (
            <>
              <div className="pane-heading">GENERAL MIDI / SOUNDFONTS</div>
              <p className="sample-bank-summary">
                {gmSounds.length} instruments · soundfont audio loads on first
                use.
              </p>
              {gmSounds
                .filter((s) =>
                  s.name.toLowerCase().includes(query.trim().toLowerCase()),
                )
                .slice(0, limit)
                .map((s) => (
                  <div className="sample-row" key={s.name}>
                    <div className="sample-bank-name">
                      <b title={s.name}>{s.name}</b>
                      <small>{s.count} soundfont variants</small>
                    </div>
                    <button
                      aria-label={"Insert " + s.name}
                      onClick={() => insert(`note("c3").s("${s.name}")`)}
                    >
                      Insert
                    </button>
                  </div>
                ))}
              {gmSounds.filter((s) =>
                s.name.toLowerCase().includes(query.trim().toLowerCase()),
              ).length > limit && (
                <button
                  className="full-width"
                  onClick={() => setLimit(limit + 40)}
                >
                  Show more instruments
                </button>
              )}
            </>
          )}
        </>
      )}
    </section>
  );
}
