import { useState, useEffect } from "react";
import { createRoot } from "react-dom/client";
import {
  LogOut,
  Settings,
  Library,
  Activity,
  Database,
  Music,
  Users,
  Palette,
  Folder,
  Terminal,
  HardDrive,
  Shield,
  Search,
  RefreshCw,
} from "lucide-react";
import { api, initSession, setCsrf, mediaLink } from "../app/api";
import { Modal } from "../app/Modal";
import type { Project, Media } from "../app/types";
import "../app/studio.css";
import "./admin.css";
function Admin() {
  const [authorized, setAuthorized] = useState(false),
    [loading, setLoading] = useState(true),
    [username, setUsername] = useState("admin"),
    [password, setPassword] = useState(""),
    [tab, setTab] = useState("DASHBOARD"),
    [data, setData] = useState<any>(),
    [settings, setSettings] = useState<any>({}),
    [projects, setProjects] = useState<Project[]>([]),
    [media, setMedia] = useState<Media[]>([]),
    [packs, setPacks] = useState<any[]>([]),
    [logs, setLogs] = useState<any[]>([]),
    [error, setError] = useState(""),
    [notice, setNotice] = useState(""),
    [query, setQuery] = useState(""),
    [selected, setSelected] = useState<Project | null>(null),
    [editing, setEditing] = useState<any>(null),
    [confirm, setConfirm] = useState<null | (() => void)>(null),
    [busy, setBusy] = useState(false);
  useEffect(() => {
    document.documentElement.dataset.theme =
      localStorage.getItem("xxc-theme") || "dark";
    initSession()
      .then((s) => {
        setAuthorized(s.admin);
        if (s.admin) refresh();
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);
  async function refresh() {
    try {
      const [d, s, p, m, pk, l] = await Promise.all([
        api("admin/dashboard"),
        api("admin/settings"),
        api<Project[]>("admin/projects"),
        api<Media[]>("admin/media"),
        api("admin/sample-packs"),
        api("admin/logs"),
      ]);
      setData(d);
      setSettings(s);
      setProjects(p);
      setMedia(m);
      setPacks(pk);
      setLogs(l);
      setError("");
    } catch (e) {
      setError(String(e));
    }
  }
  async function login(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      const s = await api("admin/login", "POST", { username, password });
      setCsrf(s.csrf);
      setPassword("");
      setAuthorized(true);
      await refresh();
    } catch (e) {
      setError(String(e));
    } finally {
      setBusy(false);
    }
  }
  async function action(fn: () => Promise<any>, message = "Saved") {
    setBusy(true);
    try {
      await fn();
      setNotice(message);
      setTimeout(() => setNotice(""), 4000);
      await refresh();
    } catch (e) {
      setError(String(e));
    } finally {
      setBusy(false);
    }
  }
  const sections = [
    ["DASHBOARD", Activity],
    ["GLOBAL SETTINGS", Settings],
    ["LIBRARY", Library],
    ["PROJECTS", Folder],
    ["SAMPLES", Music],
    ["SAMPLE PACKS", Database],
    ["MUSIC / SCORES", Music],
    ["AUTHORS", Users],
    ["THEMING", Palette],
    ["MEDIA", HardDrive],
    ["SYSTEM", Shield],
    ["LOGS", Terminal],
  ] as const;
  const settingFields = (keys: string[]) =>
    keys.map((k) => (
      <label className="admin-setting" key={k}>
        <span>{k.replaceAll("_", " ")}</span>
        {typeof settings[k] === "boolean" ? (
          <input
            type="checkbox"
            checked={settings[k]}
            onChange={(e) =>
              setSettings({ ...settings, [k]: e.target.checked })
            }
          />
        ) : typeof settings[k] === "number" ? (
          <input
            type="number"
            value={settings[k]}
            step={k === "visual_intensity" ? ".05" : "1"}
            onChange={(e) => setSettings({ ...settings, [k]: +e.target.value })}
          />
        ) : ["accent", "dark_bg", "light_bg"].includes(k) ? (
          <input
            type="color"
            value={settings[k]}
            onChange={(e) => setSettings({ ...settings, [k]: e.target.value })}
          />
        ) : ["default_theme", "visual_quality", "visual_preset"].includes(k) ? (
          <select
            value={settings[k]}
            onChange={(e) => setSettings({ ...settings, [k]: e.target.value })}
          >
            {(k === "default_theme"
              ? ["dark", "light", "system"]
              : k === "visual_preset"
                ? [
                    "scope",
                    "spectrum",
                    "spectrogram",
                    "pianoroll",
                    "punchcard",
                    "spiral",
                    "phase",
                    "orbits",
                    "geometry",
                  ]
                : ["auto", "low", "balanced", "high"]
            ).map((x) => (
              <option key={x}>{x}</option>
            ))}
          </select>
        ) : (
          <input
            value={String(settings[k] ?? "")}
            onChange={(e) => setSettings({ ...settings, [k]: e.target.value })}
          />
        )}
      </label>
    ));
  if (loading)
    return (
      <main className="admin-login">
        <p>root@strudel:~$ checking session…</p>
      </main>
    );
  if (!authorized)
    return (
      <main className="admin-login">
        <img src="/brand/mark.svg" alt="" />
        <p className="eyebrow">[ XXC / THUGS(red) · ADMIN ]</p>
        <h1>System access.</h1>
        <p>Use the administrator access code generated during installation.</p>
        <form onSubmit={login}>
          <label>
            Username
            <input
              autoComplete="username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
            />
          </label>
          <label>
            Access code
            <input
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </label>
          <button className="primary" disabled={busy}>
            {busy ? "VERIFYING…" : "AUTHENTICATE →"}
          </button>
        </form>
        {error && (
          <p className="red" role="alert">
            {error}
          </p>
        )}
        <a href="/">← Return to studio</a>
      </main>
    );
  return (
    <div className="admin-shell">
      <header className="topbar">
        <a className="brand" href="/">
          <img src="/brand/mark.svg" alt="" />
          <div>
            <b>
              XXC / THUGS<span className="red">(red)</span>
            </b>
            <span>SYSTEM ADMINISTRATION</span>
          </div>
        </a>
        <div className="spacer" />
        <button onClick={refresh}>
          <RefreshCw size={14} />
          Refresh
        </button>
        <button
          onClick={() => {
            const t =
              document.documentElement.dataset.theme === "dark"
                ? "light"
                : "dark";
            document.documentElement.dataset.theme = t;
            localStorage.setItem("xxc-theme", t);
          }}
        >
          Theme
        </button>
        <button
          onClick={() =>
            action(async () => {
              await api("admin/logout", "POST", {});
              setAuthorized(false);
              await initSession();
            }, "Signed out")
          }
        >
          <LogOut size={14} />
          Sign out
        </button>
      </header>
      <div className="admin-workspace">
        <nav className="admin-nav">
          {sections.map(([s, Icon]) => (
            <button
              className={tab === s ? "selected" : ""}
              key={s}
              onClick={() => {
                setTab(s);
                setQuery("");
              }}
            >
              <Icon size={15} />
              {s}
            </button>
          ))}
          <a href="/" className="external-link">
            OPEN STUDIO ↗
          </a>
        </nav>
        <main className="admin-main">
          <div className="admin-heading">
            <div>
              <span className="eyebrow">[ CONTROL PLANE / AUTHENTICATED ]</span>
              <h1>{tab.toLowerCase()}</h1>
            </div>
            <span className="green">
              ● {data?.health.status?.toUpperCase()}
            </span>
          </div>
          {error && (
            <div className="error-box" role="alert">
              {error}
            </div>
          )}
          {notice && (
            <div className="notice" role="status">
              {notice}
            </div>
          )}
          {tab === "DASHBOARD" && data && (
            <>
              <div className="admin-stats">
                {Object.entries(data.counts).map(([k, v]) => (
                  <article key={k}>
                    <span>{k.replaceAll("_", " ")}</span>
                    <b>
                      {k === "storage_bytes"
                        ? (Number(v) / 1048576).toFixed(1) + " MB"
                        : String(v)}
                    </b>
                  </article>
                ))}
              </div>
              <h2>Service health</h2>
              <div className="service-grid">
                {Object.entries(data.health).map(([k, v]) => (
                  <div key={k}>
                    <span>{k}</span>
                    <b className={v === false ? "red" : "green"}>
                      {typeof v === "boolean"
                        ? v
                          ? "READY"
                          : "UNAVAILABLE"
                        : String(v)}
                    </b>
                  </div>
                ))}
              </div>
              <h2>Recent activity</h2>
              <div className="admin-table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>Event</th>
                      <th>Entity</th>
                      <th>Time</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.activity.map((a: any, i: number) => (
                      <tr key={i}>
                        <td>{a.event}</td>
                        <td>{a.entity_id}</td>
                        <td>{a.created_at}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
          {["GLOBAL SETTINGS", "THEMING"].includes(tab) && (
            <>
              <p className="muted">
                Changes affect the public studio on its next load. Canonical
                URL: <b>https://strudel.xxc.dk</b>.
              </p>
              <div className="admin-settings">
                {settingFields(
                  Object.keys(settings).filter((k) =>
                    tab === "THEMING"
                      ? [
                          "accent",
                          "dark_bg",
                          "light_bg",
                          "default_theme",
                          "visual_preset",
                          "visual_intensity",
                          "visual_quality",
                        ].includes(k)
                      : !["accent", "dark_bg", "light_bg"].includes(k),
                  ),
                )}
              </div>
              <button
                className="primary"
                disabled={busy}
                onClick={() =>
                  action(
                    () => api("admin/settings", "PUT", settings),
                    "Global configuration saved",
                  )
                }
              >
                SAVE SETTINGS
              </button>
            </>
          )}
          {["LIBRARY", "PROJECTS", "MUSIC / SCORES"].includes(tab) && (
            <>
              <label className="search">
                <Search size={15} />
                <input
                  placeholder="Search title, author, tag…"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                />
              </label>
              <div className="admin-table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>Project</th>
                      <th>Author</th>
                      <th>Visibility</th>
                      <th>Version / updated</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {projects
                      .filter(
                        (p) =>
                          (tab !== "LIBRARY" || p.visibility !== "private") &&
                          (p.title + " " + p.author + " " + p.tags.join(" "))
                            .toLowerCase()
                            .includes(query.toLowerCase()),
                      )
                      .map((p) => (
                        <tr key={p.id}>
                          <td>
                            <strong>{p.title}</strong>
                            <small>
                              {p.builtin ? "BUILT-IN · " : ""}
                              {p.tags.join(" / ")}
                            </small>
                          </td>
                          <td>{p.author || "Anonymous"}</td>
                          <td>
                            <select
                              value={p.visibility}
                              onChange={(e) =>
                                action(() =>
                                  api("admin/projects", "PATCH", {
                                    id: p.id,
                                    visibility: e.target.value,
                                  }),
                                )
                              }
                            >
                              <option>private</option>
                              <option>unlisted</option>
                              <option>public</option>
                            </select>
                          </td>
                          <td>
                            v{p.version}
                            <small>{p.updated_at}</small>
                          </td>
                          <td>
                            <div className="toolbar wrap">
                              <button
                                onClick={() =>
                                  api<Project>("projects/" + p.id).then(
                                    setSelected,
                                  )
                                }
                              >
                                Inspect / edit
                              </button>
                              <button
                                onClick={() =>
                                  action(() =>
                                    api("admin/projects", "PATCH", {
                                      id: p.id,
                                      featured: !(p as any).featured,
                                    }),
                                  )
                                }
                              >
                                {(p as any).featured ? "Unfeature" : "Feature"}
                              </button>
                              <button
                                className="danger"
                                onClick={() =>
                                  setConfirm(
                                    () => () =>
                                      action(
                                        () => api("projects/" + p.id, "DELETE"),
                                        "Project removed",
                                      ),
                                  )
                                }
                              >
                                Delete
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
          {["SAMPLES", "MEDIA"].includes(tab) && (
            <>
              <p className="muted">
                Files without an associated project are marked as unattached.
                Cleanup is manual for legitimate assets.
              </p>
              <label className="search">
                <Search size={15} />
                <input
                  placeholder="Search media…"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                />
              </label>
              <div className="admin-table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>Media</th>
                      <th>Format / size</th>
                      <th>Association</th>
                      <th>License / source</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {media
                      .filter(
                        (m) =>
                          (tab === "MEDIA" || m.kind === "sample") &&
                          m.original_name
                            .toLowerCase()
                            .includes(query.toLowerCase()),
                      )
                      .map((m) => (
                        <tr key={m.id}>
                          <td>
                            {m.original_name}
                            <small>{m.kind}</small>
                            {m.kind === "cover" ? (
                              <img
                                className="media-thumb"
                                src={mediaLink(m.id)}
                                alt="Cover"
                              />
                            ) : (
                              <audio controls preload="none" src={m.url} />
                            )}
                          </td>
                          <td>
                            {m.mime}
                            <small>
                              {(m.size / 1048576).toFixed(2)} MB /{" "}
                              {m.duration.toFixed(2)} s
                            </small>
                          </td>
                          <td>
                            {projects.find((p) => p.id === m.project_id)
                              ?.title || "UNATTACHED"}
                          </td>
                          <td>
                            {m.metadata.license || "Not supplied"}
                            <small>{m.metadata.source}</small>
                          </td>
                          <td>
                            <div className="toolbar wrap">
                              <button
                                onClick={() =>
                                  action(() =>
                                    api("admin/media", "PATCH", {
                                      id: m.id,
                                      approved: !m.approved,
                                    }),
                                  )
                                }
                              >
                                {m.approved ? "Unpublish media" : "Approve"}
                              </button>
                              <button
                                className="danger"
                                onClick={() =>
                                  setConfirm(
                                    () => () =>
                                      action(
                                        () =>
                                          api("admin/media", "DELETE", {
                                            id: m.id,
                                          }),
                                        "Media deleted",
                                      ),
                                  )
                                }
                              >
                                Delete
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
          {tab === "SAMPLE PACKS" && (
            <>
              <button
                className="primary"
                onClick={() =>
                  setEditing({
                    name: "New sample pack",
                    description: "",
                    license: "",
                    enabled: true,
                    items: [],
                  })
                }
              >
                CREATE PACK
              </button>
              {packs.map((p) => (
                <div className="list-row" key={p.id}>
                  <b>{p.name}</b>
                  <span>{p.license}</span>
                  <span>{p.enabled ? "ENABLED" : "DISABLED"}</span>
                  <button
                    onClick={() => setEditing({ ...p, items: p.items || [] })}
                  >
                    Edit pack
                  </button>
                </div>
              ))}
            </>
          )}
          {tab === "AUTHORS" && (
            <>
              <p className="muted">
                Authors are display metadata on compositions. Anonymous
                ownership is tied to browser credentials; there is no public
                user account database.
              </p>
              <table>
                <thead>
                  <tr>
                    <th>Display name</th>
                    <th>Projects</th>
                    <th>Published</th>
                  </tr>
                </thead>
                <tbody>
                  {[
                    ...new Set(projects.map((p) => p.author || "Anonymous")),
                  ].map((a) => (
                    <tr key={a}>
                      <td>{a}</td>
                      <td>
                        {
                          projects.filter(
                            (p) => (p.author || "Anonymous") === a,
                          ).length
                        }
                      </td>
                      <td>
                        {
                          projects.filter(
                            (p) =>
                              (p.author || "Anonymous") === a &&
                              p.visibility === "public",
                          ).length
                        }
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </>
          )}
          {tab === "SYSTEM" && data && (
            <>
              <div className="service-grid">
                {Object.entries({
                  ...data.health,
                  php: data.php,
                  disk_free_gb: (data.disk_free / 1073741824).toFixed(2),
                  base_url: "https://strudel.xxc.dk",
                  storage: "Private, outside Apache document root",
                  session: "Secure · HttpOnly · SameSite Strict",
                  execution: "Opaque-origin sandbox iframe",
                }).map(([k, v]) => (
                  <div key={k}>
                    <span>{k}</span>
                    <b>{String(v)}</b>
                  </div>
                ))}
              </div>
              <h2>PHP modules</h2>
              <pre className="diagnostics">{data.modules.join(" · ")}</pre>
              <h2>Operations</h2>
              <p>
                Build: <code>./scripts/build.sh</code>
                <br />
                Migrate: <code>./scripts/migrate.sh</code>
                <br />
                Rotate admin credential:{" "}
                <code>php scripts/rotate-admin.php</code>
                <br />
                Health: <code>./scripts/healthcheck.sh</code>
              </p>
              <a href="https://github.com/kawaiipantsu/strudel-xxc/wiki">
                Operations wiki ↗
              </a>
            </>
          )}
          {tab === "LOGS" && (
            <>
              <p className="muted">
                Structured application log, last 100 events. Credentials and
                session tokens are never logged.
              </p>
              <pre className="diagnostics logs">
                {logs.map((l) => JSON.stringify(l)).join("\n")}
              </pre>
            </>
          )}
        </main>
      </div>
      {selected && (
        <Modal title="PROJECT INSPECTOR" wide onClose={() => setSelected(null)}>
          <div className="form-grid">
            <label>
              Title
              <input
                value={selected.title}
                onChange={(e) =>
                  setSelected({ ...selected, title: e.target.value })
                }
              />
            </label>
            <label>
              Author
              <input
                value={selected.author}
                onChange={(e) =>
                  setSelected({ ...selected, author: e.target.value })
                }
              />
            </label>
            <label>
              Description
              <textarea
                value={selected.description}
                onChange={(e) =>
                  setSelected({ ...selected, description: e.target.value })
                }
              />
            </label>
            <label>
              Tags
              <input
                value={selected.tags.join(", ")}
                onChange={(e) =>
                  setSelected({
                    ...selected,
                    tags: e.target.value.split(",").map((x) => x.trim()),
                  })
                }
              />
            </label>
          </div>
          {selected.files
            .filter((f) => f.kind !== "folder")
            .map((f) => (
              <details key={f.path}>
                <summary>{f.path}</summary>
                <pre className="diagnostics">{f.content}</pre>
              </details>
            ))}
          <label className="field">
            Moderation notes
            <textarea
              value={(selected as any).moderation_notes || ""}
              onChange={(e) =>
                setSelected({
                  ...selected,
                  moderation_notes: e.target.value,
                } as any)
              }
            />
          </label>
          <div className="toolbar">
            <button
              className="primary"
              onClick={() =>
                action(async () => {
                  await api("projects/" + selected.id, "PUT", selected);
                  await api("admin/projects", "PATCH", {
                    id: selected.id,
                    moderation_notes: (selected as any).moderation_notes,
                  });
                  setSelected(null);
                })
              }
            >
              Save metadata
            </button>
            <a
              href={"/?project=" + selected.id}
              target="_blank"
              rel="noreferrer"
            >
              Open source in studio ↗
            </a>
            <a href={"/api/projects/" + selected.id + "/bundle"}>
              Download ZIP
            </a>
          </div>
        </Modal>
      )}
      {editing && (
        <Modal title="SAMPLE PACK" onClose={() => setEditing(null)}>
          <div className="form-grid">
            <label>
              Name
              <input
                value={editing.name}
                onChange={(e) =>
                  setEditing({ ...editing, name: e.target.value })
                }
              />
            </label>
            <label>
              License
              <input
                value={editing.license}
                onChange={(e) =>
                  setEditing({ ...editing, license: e.target.value })
                }
              />
            </label>
            <label>
              Description
              <textarea
                value={editing.description}
                onChange={(e) =>
                  setEditing({ ...editing, description: e.target.value })
                }
              />
            </label>
            <label>
              <input
                type="checkbox"
                checked={!!editing.enabled}
                onChange={(e) =>
                  setEditing({ ...editing, enabled: e.target.checked })
                }
              />
              Enabled
            </label>
          </div>
          <h3>Pack samples</h3>
          {media
            .filter((m) => m.kind === "sample")
            .map((m) => (
              <label className="list-row" key={m.id}>
                <span>{m.original_name}</span>
                <input
                  type="checkbox"
                  checked={editing.items.some((i: any) => i.media_id === m.id)}
                  onChange={(e) =>
                    setEditing({
                      ...editing,
                      items: e.target.checked
                        ? [
                            ...editing.items,
                            {
                              media_id: m.id,
                              sample_name: m.metadata.sample_name || m.id,
                            },
                          ]
                        : editing.items.filter((i: any) => i.media_id !== m.id),
                    })
                  }
                />
              </label>
            ))}
          <button
            className="primary"
            onClick={() =>
              action(async () => {
                await api("admin/sample-packs", "POST", editing);
                setEditing(null);
              })
            }
          >
            Save pack
          </button>
        </Modal>
      )}
      {confirm && (
        <Modal title="CONFIRM DELETION" onClose={() => setConfirm(null)}>
          <p>
            This removes the selected item. Keep a project ZIP backup if you
            need to recover it later.
          </p>
          <div className="toolbar">
            <button onClick={() => setConfirm(null)}>Cancel</button>
            <button
              className="danger"
              onClick={() => {
                confirm();
                setConfirm(null);
              }}
            >
              Delete permanently
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
}
createRoot(document.getElementById("root")!).render(<Admin />);
