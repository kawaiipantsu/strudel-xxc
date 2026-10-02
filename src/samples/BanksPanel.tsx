import { useEffect, useMemo, useState } from "react";
import { bankCode, bankIndex, bankVoiceCode } from "./bank-index.mjs";
import gmSounds from "./gm-catalog.json";
import "./banks.css";
type Catalogue = {
  sounds: { name: string; collection: string; alias?: string }[];
  collections: { id: string; name: string }[];
};
export function BanksPanel({
  names,
  refresh,
  insert,
}: {
  names: string[];
  refresh: () => void;
  insert: (code: string) => void;
}) {
  const [catalogue, setCatalogue] = useState<Catalogue>();
  const [query, setQuery] = useState("");
  const [error, setError] = useState("");
  const [status, setStatus] = useState("");
  const [expanded, setExpanded] = useState<string>();
  useEffect(() => {
    const controller = new AbortController();
    refresh();
    fetch("/sample-banks/catalog.json", {
      signal: controller.signal,
      cache: "no-cache",
    })
      .then((r) => {
        if (!r.ok)
          throw new Error("Bank catalogue unavailable. Reopen Banks to retry.");
        return r.json();
      })
      .then(setCatalogue)
      .catch((e) => {
        if (e.name !== "AbortError") setError(e.message);
      });
    return () => controller.abort();
  }, []);
  const banks = useMemo(
    () =>
      bankIndex(
        [
          ...(catalogue?.sounds || []),
          ...gmSounds.map((s) => ({
            name: s.name,
            collection: "General MIDI / soundfonts",
          })),
        ],
        names,
      ),
    [catalogue, names],
  );
  const shown = banks.filter((bank) =>
    [
      bank.name || "Default",
      ...bank.aliases,
      ...bank.voices,
      ...bank.collections,
    ]
      .join(" ")
      .toLowerCase()
      .includes(query.trim().toLowerCase()),
  );
  const add = (code: string) => {
    insert(code);
    setStatus("Inserted " + code);
  };
  return (
    <section className="banks-panel" aria-label="Available sound banks">
      <div className="pane-heading">BANKS / SOUND PALETTES</div>
      <input
        className="bank-search"
        aria-label="Search banks"
        placeholder="909, Roland, gm, kick…"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
      />
      <p className="sample-bank-summary">
        Choose a bank for an existing pattern, insert its name, or start with a
        voice below. Includes installed samples, GM instruments and banks loaded
        by your score.
      </p>
      <div className="bank-toolbar">
        <span>
          {shown.length} banks{query ? " matching" : " available"}
        </span>
        <button
          onClick={() => {
            refresh();
            setStatus("Refreshed loaded sound names.");
          }}
        >
          Refresh banks
        </button>
      </div>
      <p className="bank-insert-status" role="status">
        {status}
      </p>
      {error && <p role="alert">{error}</p>}
      {!catalogue && !error && <p role="status">Loading installed banks…</p>}
      {shown.map((bank) => (
        <article
          className="bank-card"
          key={bank.name}
          aria-label={(bank.name || "Default") + " bank"}
        >
          <h3>{bank.name || "Default / unbanked"}</h3>
          <small>
            {bank.voices.length} voices ·{" "}
            {bank.collections
              .map(
                (id: string) =>
                  catalogue?.collections.find((c) => c.id === id)?.name || id,
              )
              .join(" / ")}
          </small>
          <code>{bankCode(bank.name)}</code>
          <div className="bank-actions">
            <button
              onClick={() => add(bankCode(bank.name))}
              aria-label={"Insert bank " + (bank.name || "Default")}
            >
              Insert .bank()
            </button>
            {bank.name && (
              <button
                onClick={() => add(bank.name)}
                aria-label={"Insert bank name " + bank.name}
              >
                Name
              </button>
            )}
            <button
              onClick={() =>
                add(
                  bankVoiceCode(
                    bank.name,
                    bank.voices.includes("bd")
                      ? "bd"
                      : bank.voices.includes("piano")
                        ? "piano"
                        : bank.voices[0],
                  ),
                )
              }
              aria-label={"Insert example for " + (bank.name || "Default")}
            >
              Example
            </button>
          </div>
          {bank.aliases.length > 0 && (
            <div className="bank-aliases">
              Aliases:{" "}
              {bank.aliases.map((alias: string) => (
                <button
                  key={alias}
                  title={bankCode(alias)}
                  aria-label={"Insert bank alias " + alias}
                  onClick={() => add(bankCode(alias))}
                >
                  {alias}
                </button>
              ))}
            </div>
          )}
          <details
            open={expanded === bank.name}
            onToggle={(e) => {
              if (e.currentTarget.open) setExpanded(bank.name);
              else
                setExpanded((previous) =>
                  previous === bank.name ? undefined : previous,
                );
            }}
          >
            <summary>Browse {bank.voices.length} voices</summary>
            {expanded === bank.name && (
              <div className="bank-voices">
                {bank.voices.map((voice: string) => (
                  <button
                    key={voice}
                    title={bankVoiceCode(bank.name, voice)}
                    aria-label={
                      "Insert " + (bank.name || "Default") + " voice " + voice
                    }
                    onClick={() => add(bankVoiceCode(bank.name, voice))}
                  >
                    {voice}
                  </button>
                ))}
              </div>
            )}
          </details>
        </article>
      ))}
      {!shown.length && catalogue && (
        <p>
          No matching bank. Try a shorter name or refresh after loading custom
          samples.
        </p>
      )}
    </section>
  );
}
