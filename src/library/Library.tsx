import { useState, useEffect } from "react";
import { Search, ArrowUpRight, GitFork, Clock } from "lucide-react";
import { api, mediaLink } from "../app/api";
import type { Project } from "../app/types";
export function Library({
  onOpen,
  onFork,
}: {
  onOpen: (p: Project) => void;
  onFork: (p: Project) => void;
}) {
  const [items, setItems] = useState<Project[]>([]),
    [query, setQuery] = useState(""),
    [tag, setTag] = useState(""),
    [sort, setSort] = useState("newest"),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(true);
  useEffect(() => {
    const t = setTimeout(() => {
      setBusy(true);
      api<Project[]>(
        "library?search=" +
          encodeURIComponent(query) +
          "&tag=" +
          encodeURIComponent(tag) +
          "&sort=" +
          sort,
      )
        .then(setItems)
        .catch((e) => setError(e.message))
        .finally(() => setBusy(false));
    }, 200);
    return () => clearTimeout(t);
  }, [query, tag, sort]);
  async function open(id: string) {
    try {
      onOpen(await api<Project>("projects/" + id));
    } catch (e) {
      setError(String(e));
    }
  }
  return (
    <section>
      <div className="section-intro">
        <span className="eyebrow">[ XXC STRUDEL LIBRARY ]</span>
        <h2>Patterns are meant to travel.</h2>
        <p>
          Explore a score, inspect the source, and make a remix. Playback always
          starts with you.
        </p>
      </div>
      <div className="toolbar wrap">
        <label className="search">
          <Search size={15} />
          <input
            aria-label="Search library"
            placeholder="Search scores, sounds, people…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </label>
        <input
          aria-label="Filter by tag"
          placeholder="tag"
          value={tag}
          onChange={(e) => setTag(e.target.value)}
        />
        <select
          aria-label="Sort library"
          value={sort}
          onChange={(e) => setSort(e.target.value)}
        >
          <option value="newest">Newest</option>
          <option value="updated">Recently updated</option>
        </select>
      </div>
      {error && (
        <p role="alert" className="red">
          {error}
        </p>
      )}
      {busy && <p className="muted">querying library…</p>}
      <div className="library-grid">
        {items.map((p) => (
          <article className="score-card" key={p.id}>
            <img
              src={
                p.cover_id ? mediaLink(p.cover_id) : "/brand/default-cover.svg"
              }
              alt={"Code cover for " + p.title}
            />
            <div className="score-info">
              <span className="eyebrow">
                {p.builtin ? "BUILT-IN / CC0" : "COMMUNITY SCORE"} ·{" "}
                {p.metadata?.bpm || "—"} BPM
              </span>
              <h3>{p.title}</h3>
              <p>{p.description}</p>
              <div className="tag-row">
                {p.tags.map((t) => (
                  <button key={t} onClick={() => setTag(t)}>
                    #{t}
                  </button>
                ))}
              </div>
              <small className="muted">
                {p.author || "Anonymous"} · <Clock size={10} />{" "}
                {p.updated_at?.slice(0, 10)}
              </small>
              {p.preview_id && (
                <audio controls preload="none" src={mediaLink(p.preview_id)} />
              )}
              <div className="toolbar">
                <button onClick={() => open(p.id!)}>
                  Open score
                  <ArrowUpRight size={14} />
                </button>
                <button onClick={() => onFork(p)}>
                  <GitFork size={14} />
                  Remix
                </button>
                <a href={"/p/" + p.slug} target="_blank" rel="noreferrer">
                  Share ↗
                </a>
              </div>
            </div>
          </article>
        ))}
      </div>
      {!busy && !items.length && (
        <p className="empty-state">[ no scores match this query ]</p>
      )}
    </section>
  );
}
