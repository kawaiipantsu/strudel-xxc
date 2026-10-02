import { useState, useEffect, useRef, useCallback } from "react";
import {
  Play,
  Square,
  RefreshCw,
  Circle,
  Volume2,
  Sun,
  Moon,
  Maximize2,
  Minimize2,
  Command,
  Library,
  Share2,
  Save,
  Folder,
  FileCode2,
  Plus,
  ChevronRight,
  ChevronDown,
  Files,
  Search,
  SlidersHorizontal,
  Settings,
  History,
  Terminal,
  PanelLeftClose,
  PanelRightClose,
  Undo2,
  Redo2,
  Upload,
  Download,
  GitFork,
  X,
  Pin,
  BookOpen,
  Menu,
  Headphones,
  Pause,
  ArrowUpRight,
  Check,
} from "lucide-react";
import { api, initSession, download, mediaLink } from "./api";
import { makeStarter } from "./examples";
import type { Project, ProjectFile, Signal } from "./types";
import { emptySignal } from "./types";
import { Modal } from "./Modal";
import { SignalCanvas } from "../visuals/SignalCanvas";
import { Toolbox, type Control } from "./Toolbox";
import { SampleLab } from "../samples/SampleLab";
import { Library as LibraryView } from "../library/Library";
import { RecordingPanel } from "./RecordingPanel";
import "./studio.css";
type Log = { time: string; type: string; text: string; line?: number };
const storeRead = (key: string, fallback: any) => {
  try {
    return JSON.parse(localStorage.getItem(key) || "null") ?? fallback;
  } catch {
    return fallback;
  }
};
export function Studio() {
  const initialPreferences = useRef({
    theme: localStorage.getItem("xxc-theme"),
    intensity: localStorage.getItem("xxc-intensity"),
    quality: localStorage.getItem("xxc-quality"),
    draft: localStorage.getItem("xxc-draft"),
  });
  const [themePreference, setThemePreference] = useState(
    initialPreferences.current.theme || "system",
  );
  const [systemTheme, setSystemTheme] = useState(
    matchMedia("(prefers-color-scheme: light)").matches ? "light" : "dark",
  );
  const theme = themePreference === "system" ? systemTheme : themePreference;
  const setTheme = (value: string | ((current: string) => string)) =>
    setThemePreference(typeof value === "function" ? value(theme) : value);
  useEffect(() => {
    const media = matchMedia("(prefers-color-scheme: light)");
    const change = () => setSystemTheme(media.matches ? "light" : "dark");
    media.addEventListener("change", change);
    return () => media.removeEventListener("change", change);
  }, []);
  const [project, setProject] = useState<Project>(() =>
      storeRead("xxc-draft", makeStarter()),
    ),
    [active, setActive] = useState("main.strudel"),
    [tabs, setTabs] = useState<string[]>([
      "main.strudel",
      "drums.strudel",
      "ambient.strudel",
      "visuals.strudel",
    ]),
    [pinned, setPinned] = useState<string[]>(["main.strudel"]),
    [closed, setClosed] = useState<string[]>([]),
    [expanded, setExpanded] = useState<string[]>(["samples"]),
    [search, setSearch] = useState("");
  const [modal, setModal] = useState(""),
    [palette, setPalette] = useState(""),
    [playing, setPlaying] = useState(false),
    [ready, setReady] = useState(false),
    [saveState, setSaveState] = useState("LOCAL DRAFT"),
    [dirty, setDirty] = useState(false),
    [performanceMode, setPerformanceMode] = useState(false),
    [left, setLeft] = useState(innerWidth > 980),
    [right, setRight] = useState(innerWidth > 980),
    [bottom, setBottom] = useState(true),
    [leftWidth, setLeftWidth] = useState(() =>
      storeRead("xxc-left-width", 222),
    ),
    [rightWidth, setRightWidth] = useState(() =>
      storeRead("xxc-right-width", 326),
    ),
    [consoleHeight, setConsoleHeight] = useState(() =>
      storeRead("xxc-console-height", 146),
    );
  const [tool, setTool] = useState("VISUALS"),
    [mode, setMode] = useState("scope"),
    [consoleTab, setConsoleTab] = useState("OUTPUT"),
    [filter, setFilter] = useState(""),
    [timestamps, setTimestamps] = useState(true),
    [logs, setLogs] = useState<Log[]>([
      {
        time: new Date().toLocaleTimeString(),
        type: "OUTPUT",
        text: "XXC / THUGS(red) · booting studio",
      },
    ]),
    [toast, setToast] = useState(""),
    [volume, setVolume] = useState(0.75),
    [audioStatus, setAudioStatus] = useState({
      state: "suspended",
      sampleRate: 0,
      latency: 0,
    }),
    [cursor, setCursor] = useState({ line: 1, column: 1, word: "" }),
    [font, setFont] = useState(() => storeRead("xxc-font", 14)),
    [quality, setQuality] = useState(
      () => localStorage.getItem("xxc-quality") || "auto",
    ),
    [intensity, setIntensity] = useState(() => storeRead("xxc-intensity", 0.3)),
    [reduced, setReduced] = useState(
      matchMedia("(prefers-reduced-motion: reduce)").matches,
    ),
    [tick, setTick] = useState(0),
    [settings, setSettings] = useState<any>({}),
    [health, setHealth] = useState<any>({}),
    [controls, setControls] = useState<Control[]>(() =>
      storeRead("xxc-controls", [
        {
          id: "cutoff",
          name: "cutoff",
          kind: "slider",
          min: 100,
          max: 4000,
          value: 1200,
        },
      ]),
    );
  const [recent, setRecent] = useState<Project[]>([]),
    [revisions, setRevisions] = useState<any[]>([]),
    [revision, setRevision] = useState<Project | null>(null),
    [recordState, setRecordState] = useState("inactive"),
    [recordSeconds, setRecordSeconds] = useState(0),
    [recorded, setRecorded] = useState<Blob | null>(null),
    [coverStyle, setCoverStyle] = useState("terminal"),
    [busy, setBusy] = useState(false),
    [context, setContext] = useState<{
      x: number;
      y: number;
      selection: string;
    } | null>(null),
    [fileAction, setFileAction] = useState<{
      action: string;
      path: string;
    } | null>(null),
    [nameValue, setNameValue] = useState(""),
    [confirm, setConfirm] = useState<{
      text: string;
      action: () => void;
    } | null>(null),
    [onboarding, setOnboarding] = useState(
      !localStorage.getItem("xxc-onboarded"),
    ),
    [shortcuts, setShortcuts] = useState(() =>
      storeRead("xxc-shortcuts", {
        evaluate: "Mod+Enter",
        hush: "Mod+.",
        save: "Mod+s",
        palette: "Mod+Shift+p",
      }),
    );
  const frame = useRef<HTMLIFrameElement>(null),
    signal = useRef<Signal>(structuredClone(emptySignal)),
    proj = useRef(project),
    activeRef = useRef(active),
    generation = useRef(0),
    readyRef = useRef(false),
    sessionReady = useRef(false),
    dirtyRef = useRef(false),
    editCount = useRef(0),
    savePromise = useRef<Promise<string> | null>(null),
    fileInput = useRef<HTMLInputElement>(null),
    layout = useRef<HTMLDivElement>(null),
    consoleList = useRef<HTMLDivElement>(null),
    lastContext = useRef(context);
  proj.current = project;
  activeRef.current = active;
  readyRef.current = ready;
  dirtyRef.current = dirty;
  lastContext.current = context;
  const log = useCallback(
    (text: string, type = "OUTPUT", line?: number) =>
      setLogs((l) => [
        ...l.slice(-199),
        { time: new Date().toLocaleTimeString(), text, type, line },
      ]),
    [],
  );
  const notice = useCallback((text: string) => {
    setToast(text);
    setTimeout(() => setToast(""), 4500);
  }, []);
  const send = useCallback(
    (type: string, data: any = {}) =>
      frame.current?.contentWindow?.postMessage(
        { channel: "xxc-host", type, ...data },
        "*",
      ),
    [],
  );
  const loadFile = useCallback(
    (path: string, p = proj.current) => {
      const f = p.files.find((f) => f.path === path && f.kind !== "folder");
      if (!f) return;
      generation.current++;
      activeRef.current = path;
      setActive(path);
      setTabs((t) => (t.includes(path) ? t : [...t, path]));
      send("load", {
        file: path,
        code: f.content,
        generation: generation.current,
        projectKey: p.id || "draft",
      });
    },
    [send],
  );
  function updateProject(next: Project | ((p: Project) => Project)) {
    setProject((p) => {
      const n = typeof next === "function" ? next(p) : next;
      proj.current = n;
      return n;
    });
    setDirty(true);
    editCount.current++;
    setSaveState("UNSAVED");
  }
  async function save(forceFork = false): Promise<string> {
    if (savePromise.current) return savePromise.current;
    savePromise.current = (async () => {
      if (!sessionReady.current) await initSession();
      const p = structuredClone(proj.current),
        revisionAtSave = editCount.current;
      setSaveState("SAVING…");
      try {
        let saved: Project;
        if (p.id && p.editable !== false && !forceFork)
          saved = await api<Project>("projects/" + p.id, "PUT", p);
        else if (p.id) {
          saved = await api<Project>("projects/" + p.id + "/fork", "POST", p);
        } else {
          delete p.version;
          saved = await api<Project>("projects", "POST", p);
        }
        if (editCount.current === revisionAtSave) {
          if (p.id !== saved.id)
            send("project-key", { from: p.id || "draft", to: saved.id });
          const before = p.files.find(
            (f) => f.path === activeRef.current,
          )?.content;
          const after = saved.files.find(
            (f) => f.path === activeRef.current,
          )?.content;
          if (before !== after) loadFile(activeRef.current, saved);
          setProject(saved);
          proj.current = saved;
          setDirty(false);
          setSaveState("SAVED");
          localStorage.setItem("xxc-draft", JSON.stringify(saved));
        } else {
          setProject((current) => ({
            ...current,
            id: saved.id,
            version: saved.version,
            slug: saved.slug,
            editable: true,
          }));
          setSaveState("UNSAVED");
        }
        log("Project checkpoint saved.", "NETWORK");
        return saved.id!;
      } catch (e) {
        setSaveState("LOCAL ONLY");
        log(String(e), "PROBLEMS");
        throw e;
      } finally {
        savePromise.current = null;
      }
    })();
    return savePromise.current;
  }
  const saveRef = useRef(save);
  saveRef.current = save;
  async function ensureProject() {
    if (!proj.current.id || dirtyRef.current || proj.current.editable === false)
      return saveRef.current();
    return proj.current.id!;
  }
  async function openProject(p: Project) {
    send("stop");
    setProject(p);
    proj.current = p;
    setDirty(false);
    setSaveState(p.editable === false ? "READ ONLY / REMIX TO SAVE" : "SAVED");
    setTabs(
      p.files
        .filter((f) => f.kind !== "folder")
        .slice(0, 6)
        .map((f) => f.path),
    );
    loadFile(p.entry_file, p);
    setModal("");
    localStorage.setItem("xxc-draft", JSON.stringify(p));
    notice("Score opened. Press Play when you are ready.");
  }
  async function fork(p: Project) {
    try {
      if (dirtyRef.current) await saveRef.current();
      const next = await api<Project>("projects/" + p.id + "/fork", "POST", {});
      await openProject(next);
      notice("New remix created.");
    } catch (e) {
      notice(String(e));
    }
  }
  const shortcutRef = useRef<(c: string) => void>(() => {});
  shortcutRef.current = (c) => {
    if (c === "save")
      save()
        .then(() => notice("Project saved"))
        .catch((e) => notice(e.message));
    if (c === "palette" || c === "quickopen") {
      setPalette("");
      setModal(c);
    }
    if (c === "hush") send("stop");
    if (c === "evaluate") send("evaluate", { mode: "block" });
  };
  useEffect(() => {
    let alive = true;
    initSession()
      .then(async () => {
        sessionReady.current = true;
        const [settings, health] = await Promise.all([
          api("settings/public"),
          api("health"),
        ]);
        if (!alive) return;
        setSettings(settings);
        setHealth(health);
        if (!initialPreferences.current.theme)
          setThemePreference(settings.default_theme || "system");
        if (!initialPreferences.current.intensity)
          setIntensity(settings.visual_intensity);
        if (!initialPreferences.current.quality)
          setQuality(settings.visual_quality);
        setMode(settings.visual_preset || "scope");
        document.documentElement.style.setProperty("--accent", settings.accent);
        document.documentElement.style.setProperty(
          "--configured-dark",
          settings.dark_bg,
        );
        document.documentElement.style.setProperty(
          "--configured-light",
          settings.light_bg,
        );
        log("Database / Redis / media services connected.", "NETWORK");
        const params = new URLSearchParams(location.search),
          id =
            params.get("project") ||
            (!initialPreferences.current.draft ? settings.default_project : "");
        if (id) {
          const p = await api<Project>("projects/" + id);
          if (params.has("fork")) await fork(p);
          else await openProject(p);
        }
      })
      .catch((e) => log(e.message, "NETWORK"));
    return () => {
      alive = false;
    };
  }, []);
  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    localStorage.setItem("xxc-theme", themePreference);
    send("theme", { value: theme });
  }, [theme, themePreference, ready]);
  useEffect(() => {
    send("features", {
      hydra: settings.hydra_enabled !== false,
      midi: settings.midi_enabled !== false,
    });
  }, [ready, settings]);
  useEffect(() => {
    localStorage.setItem("xxc-font", JSON.stringify(font));
    send("font", { value: font });
    send("shortcuts", { values: shortcuts });
  }, [font, ready]);
  useEffect(() => {
    localStorage.setItem("xxc-intensity", JSON.stringify(intensity));
    localStorage.setItem("xxc-quality", quality);
    localStorage.setItem("xxc-controls", JSON.stringify(controls));
    controls.forEach((c) => send("macro", { name: c.name, value: c.value }));
  }, [intensity, quality, controls, ready]);
  useEffect(() => {
    const t = setInterval(() => setTick((x) => x + 1), 200);
    return () => clearInterval(t);
  }, []);
  useEffect(() => {
    if (recordState !== "recording") return;
    const t = setInterval(() => setRecordSeconds((s) => s + 1), 1000);
    return () => clearInterval(t);
  }, [recordState]);
  useEffect(() => {
    if (!dirty) return;
    const local = setTimeout(() => {
      try {
        localStorage.setItem("xxc-draft", JSON.stringify(project));
      } catch {
        log(
          "Local draft storage is full. Export a project backup.",
          "PROBLEMS",
        );
      }
    }, 350);
    const server = setTimeout(() => {
      if (sessionReady.current && navigator.onLine)
        saveRef.current().catch(() => {});
    }, 6000);
    return () => {
      clearTimeout(local);
      clearTimeout(server);
    };
  }, [project, dirty]);
  useEffect(() => {
    const handler = (e: MessageEvent) => {
      if (
        e.source !== frame.current?.contentWindow ||
        e.origin !== "null" ||
        e.data?.channel !== "xxc-runtime"
      )
        return;
      const d = e.data;
      switch (d.type) {
        case "ready":
          setReady(true);
          const path = proj.current.files.some(
            (f) => f.path === activeRef.current,
          )
            ? activeRef.current
            : proj.current.entry_file;
          loadFile(path);
          log(
            "Official Strudel runtime ready. Click Play to enable audio.",
            "AUDIO",
          );
          break;
        case "code":
          if (
            d.file !== activeRef.current ||
            d.generation !== generation.current ||
            typeof d.code !== "string" ||
            d.code.length > 1000000
          )
            return;
          setProject((p) => {
            const next = {
              ...p,
              files: p.files.map((f) =>
                f.path === d.file ? { ...f, content: d.code } : f,
              ),
            };
            proj.current = next;
            return next;
          });
          setDirty(true);
          editCount.current++;
          setSaveState("UNSAVED");
          break;
        case "frame":
          if (
            Array.isArray(d.wave) &&
            d.wave.length <= 2048 &&
            Array.isArray(d.events) &&
            d.events.length <= 256
          )
            signal.current = d;
          break;
        case "playing":
          setPlaying(!!d.playing);
          log(
            d.playing ? "Scheduler running." : "Hush / audio suspended.",
            "AUDIO",
          );
          break;
        case "audio":
          setAudioStatus(d);
          log(
            `${d.sampleRate} Hz / ${(d.latency * 1000).toFixed(1)} ms base latency`,
            "AUDIO",
          );
          break;
        case "error":
          log(
            String(d.message).slice(0, 1500),
            "PROBLEMS",
            Number(d.line) || undefined,
          );
          notice("Evaluation error — see Problems.");
          setConsoleTab("PROBLEMS");
          setBottom(true);
          break;
        case "cursor":
          setCursor({
            line: Number(d.line) || 1,
            column: Number(d.column) || 1,
            word: String(d.word).slice(0, 80),
          });
          break;
        case "evaluated":
          log("Pattern evaluated.", "OUTPUT");
          break;
        case "shortcut":
          if (["save", "quickopen", "palette"].includes(d.command))
            shortcutRef.current(d.command);
          break;
        case "context": {
          const r = frame.current!.getBoundingClientRect();
          setContext({
            x: Math.min(innerWidth - 260, r.left + d.x),
            y: Math.min(innerHeight - 450, r.top + d.y),
            selection: String(d.selection).slice(0, 10000),
          });
          break;
        }
        case "recording":
          setRecordState(d.state);
          if (d.state === "recording") log("Recording master PCM.", "AUDIO");
          break;
        case "recorded":
          if (d.blob instanceof Blob && d.blob.size <= 268435456) {
            setRecorded(d.blob);
            setRecordState("inactive");
            setModal("recording");
            log("Recording ready for preview and export.", "EXPORT");
          }
          break;
        case "log":
          log(String(d.message).slice(0, 1000), "DEBUG");
          break;
        case "midi-send": {
          const midi = (window as any).__xxcMidi;
          if (
            !midi ||
            !Array.isArray(d.bytes) ||
            d.bytes.length > 3 ||
            !d.bytes.every(
              (x: any) => Number.isInteger(x) && x >= 0 && x <= 255,
            ) ||
            (![0x80, 0x90, 0xa0, 0xb0, 0xc0, 0xd0, 0xe0].includes(
              d.bytes[0] & 0xf0,
            ) &&
              ![0xf8, 0xfa, 0xfb, 0xfc].includes(d.bytes[0]))
          )
            break;
          const out = midi.outputs.get(d.id);
          if (out)
            try {
              out.send(
                d.bytes,
                Math.min(
                  performance.now() + 1000,
                  Math.max(
                    performance.now(),
                    (Number(d.time) || 0) - performance.timeOrigin,
                  ),
                ),
              );
            } catch {}
          break;
        }
      }
    };
    window.addEventListener("message", handler);
    return () => window.removeEventListener("message", handler);
  }, [loadFile, log, notice]);
  useEffect(() => {
    const f = (e: KeyboardEvent) => {
      const mod = e.ctrlKey || e.metaKey,
        key = e.key.toLowerCase();
      if (mod && key === "s") {
        e.preventDefault();
        shortcutRef.current("save");
      } else if ((mod && key === "p") || key === "f1") {
        e.preventDefault();
        shortcutRef.current(
          e.shiftKey || key === "f1" ? "palette" : "quickopen",
        );
      } else if (mod && key === ".") {
        e.preventDefault();
        send("stop");
      } else if (mod && key === "b") {
        e.preventDefault();
        setLeft((v) => !v);
      } else if (key === "escape") {
        setContext(null);
        setPerformanceMode(false);
      } else if (mod && key === "enter") {
        e.preventDefault();
        send("evaluate", { mode: "block" });
      }
    };
    window.addEventListener("keydown", f);
    const unload = (e: BeforeUnloadEvent) => {
      if (dirtyRef.current) {
        localStorage.setItem("xxc-draft", JSON.stringify(proj.current));
        e.preventDefault();
        e.returnValue = "";
      }
    };
    window.addEventListener("beforeunload", unload);
    return () => {
      window.removeEventListener("keydown", f);
      window.removeEventListener("beforeunload", unload);
    };
  }, []);
  useEffect(() => {
    consoleList.current?.scrollTo({ top: 99999 });
  }, [logs]);
  const insert = (code: string) => {
    send("command", { command: "insert", arg: code });
    setModal("");
  };
  function resize(kind: string, e: React.PointerEvent) {
    e.preventDefault();
    const x = e.clientX,
      y = e.clientY,
      initial =
        kind === "left"
          ? leftWidth
          : kind === "right"
            ? rightWidth
            : consoleHeight;
    const move = (ev: PointerEvent) => {
      const val = Math.max(
        kind === "console" ? 70 : 180,
        Math.min(
          kind === "console" ? 400 : 500,
          initial +
            (kind === "left"
              ? ev.clientX - x
              : kind === "right"
                ? x - ev.clientX
                : y - ev.clientY),
        ),
      );
      if (kind === "left") setLeftWidth(val);
      else if (kind === "right") setRightWidth(val);
      else setConsoleHeight(val);
      localStorage.setItem(
        "xxc-" + (kind === "console" ? "console-height" : kind + "-width"),
        JSON.stringify(val),
      );
    };
    const up = () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
    };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
  }
  function closeTab(path: string) {
    if (pinned.includes(path)) return;
    const next = tabs.filter((t) => t !== path);
    setTabs(next);
    setClosed((c) => [...c, path]);
    if (active === path && next.length) loadFile(next.at(-1)!);
  }
  function newFile(action: string, path = "") {
    setFileAction({ action, path });
    setNameValue(
      action === "rename"
        ? path
        : action === "duplicate"
          ? path.replace(/(\.[^.]+)$/, "-copy$1")
          : action === "folder"
            ? "new-folder"
            : "untitled.strudel",
    );
    setModal("file");
  }
  function applyFileAction() {
    if (!fileAction) return;
    const name = nameValue.trim();
    if (
      !/^[a-zA-Z0-9_][a-zA-Z0-9_ .\/-]*$/.test(name) ||
      name.includes("..") ||
      name.includes("//") ||
      name.endsWith("/")
    ) {
      notice("Use a relative file name without traversal segments.");
      return;
    }
    if (
      project.files.some((f) => f.path === name) &&
      fileAction.path !== name
    ) {
      notice("That path already exists.");
      return;
    }
    let files = project.files;
    if (fileAction.action === "rename") {
      files = files.map((f) =>
        f.path === fileAction.path || f.path.startsWith(fileAction.path + "/")
          ? { ...f, path: name + f.path.slice(fileAction.path.length) }
          : f,
      );
      setTabs((t) => t.map((x) => (x === fileAction.path ? name : x)));
    } else
      files = [
        ...files,
        {
          path: name,
          kind: fileAction.action === "folder" ? "folder" : "file",
          content:
            fileAction.action === "duplicate"
              ? files.find((f) => f.path === fileAction.path)?.content || ""
              : localStorage.getItem("xxc-snippet") || "// " + name + "\n",
        },
      ];
    const p = {
      ...project,
      files,
      entry_file:
        project.entry_file === fileAction.path && fileAction.action === "rename"
          ? name
          : project.entry_file,
    };
    updateProject(p);
    if (fileAction.action !== "folder") loadFile(name, p);
    localStorage.removeItem("xxc-snippet");
    setModal("");
  }
  function removeFile(path: string) {
    if (path === project.entry_file) {
      notice("Choose another entry file before deleting this file.");
      return;
    }
    setConfirm({
      text: "Delete " + path + "? A saved checkpoint will be kept.",
      action: async () => {
        try {
          await save();
          const p = {
            ...proj.current,
            files: proj.current.files.filter(
              (f) => f.path !== path && !f.path.startsWith(path + "/"),
            ),
          };
          updateProject(p);
          setTabs((t) =>
            t.filter((x) => x !== path && !x.startsWith(path + "/")),
          );
          loadFile(p.entry_file, p);
        } catch (e) {
          notice(String(e));
        }
      },
    });
  }
  async function importFile(f: File) {
    try {
      if (dirtyRef.current) await save();
      if (f.name.endsWith(".zip")) {
        const form = new FormData();
        form.append("file", f);
        setBusy(true);
        const p = await api<Project>("projects/import", "POST", form);
        await openProject(p);
        setBusy(false);
      } else if (/\.(strudel|js|txt|json)$/i.test(f.name)) {
        if (f.size > 1000000) throw new Error("Source file exceeds 1 MB");
        let path = f.name.replace(/[^a-zA-Z0-9_. -]/g, "_");
        if (project.files.some((x) => x.path === path))
          path = "import-" + Date.now() + "-" + path;
        const p = {
          ...proj.current,
          files: [...proj.current.files, { path, content: await f.text() }],
        };
        updateProject(p);
        loadFile(path, p);
        notice("Source imported.");
      } else setModal("samples");
    } catch (e) {
      setBusy(false);
      notice(String(e));
    }
  }
  const commands = [
    ["Strudel: Play", () => send("evaluate", { mode: "all" })],
    ["Strudel: Hush", () => send("stop")],
    [
      "Strudel: Evaluate Selection / Block",
      () => send("evaluate", { mode: "block" }),
    ],
    ["Project: Save", () => save().catch((e) => notice(e.message))],
    [
      "Project: New",
      () => {
        setConfirm({
          text: "Start a new project? The current draft will be saved first.",
          action: async () => {
            await save();
            await openProject(makeStarter());
            setSaveState("LOCAL DRAFT");
          },
        });
      },
    ],
    ["Project: Export / Share", () => setModal("share")],
    ["Project: Import", () => fileInput.current?.click()],
    [
      "Project: Recent projects",
      () => {
        api<Project[]>("projects").then(setRecent);
        setModal("recent");
      },
    ],
    ["Samples: Open Sample Lab", () => setModal("samples")],
    ["Visuals: Performance Mode", () => setPerformanceMode((p) => !p)],
    [
      "Visuals: Browser fullscreen",
      () => {
        if (document.fullscreenElement) document.exitFullscreen();
        else
          document.documentElement
            .requestFullscreen()
            .catch(() => notice("Fullscreen unavailable in this browser"));
      },
    ],
    ["Editor: Format Document", () => send("command", { command: "format" })],
    ["Editor: Find / Replace", () => send("command", { command: "find" })],
    [
      "Editor: Reopen closed tab",
      () => {
        const path = closed.at(-1);
        if (path) {
          loadFile(path);
          setClosed((c) => c.slice(0, -1));
        }
      },
    ],
    ["Library: Browse scores", () => setModal("library")],
    ["Library: Publish", () => setModal("share")],
    [
      "Theme: Toggle Dark / Light",
      () => setTheme((t) => (t === "dark" ? "light" : "dark")),
    ],
    [
      "MIDI: Connect device",
      () => {
        setTool("CONTROLS");
        setRight(true);
      },
    ],
    ["Workspace: Preferences", () => setModal("settings")],
    ["Workspace: Revision history", () => openHistory()],
  ] as [string, () => void][];
  async function openHistory() {
    try {
      const id = await ensureProject();
      setRevisions(await api("projects/" + id + "/revisions"));
      setRevision(null);
      setModal("history");
    } catch (e) {
      notice(String(e));
    }
  }
  async function cover() {
    setBusy(true);
    try {
      const id = await ensureProject();
      await api("projects/" + id + "/cover", "POST", {
        style: coverStyle,
        wave: signal.current.wave,
        fft: signal.current.fft,
      });
      const p = await api<Project>("projects/" + id);
      setProject(p);
      proj.current = p;
      notice("SVG master and PNG cover generated.");
    } catch (e) {
      notice(String(e));
    } finally {
      setBusy(false);
    }
  }
  const tree = (parent = ""): React.ReactNode => {
    const children = new Map<string, { folder: boolean; file?: ProjectFile }>();
    project.files
      .filter((f) => f.path.startsWith(parent ? parent + "/" : ""))
      .forEach((f) => {
        const rest = f.path.slice(parent ? parent.length + 1 : 0),
          part = rest.split("/")[0];
        if (!part) return;
        const folder = rest.includes("/") || f.kind === "folder";
        children.set(part, {
          folder: folder || children.get(part)?.folder || false,
          file: rest.includes("/") ? undefined : f,
        });
      });
    return [...children]
      .sort(
        ([a, x], [b, y]) =>
          Number(y.folder) - Number(x.folder) || a.localeCompare(b),
      )
      .map(([name, node]) => {
        const path = parent ? parent + "/" + name : name;
        if (
          search &&
          !path.toLowerCase().includes(search.toLowerCase()) &&
          !node.folder
        )
          return null;
        return (
          <div key={path}>
            <div
              className={"tree-row " + (active === path ? "active" : "")}
              style={{ paddingLeft: 12 + path.split("/").length * 9 }}
              draggable
              onDragStart={(e) => e.dataTransfer.setData("text/plain", path)}
              onDragOver={(e) => node.folder && e.preventDefault()}
              onDrop={(e) => {
                e.preventDefault();
                const from = e.dataTransfer.getData("text/plain");
                if (
                  node.folder &&
                  from &&
                  from !== path &&
                  !path.startsWith(from + "/")
                ) {
                  const dest = path + "/" + from.split("/").at(-1);
                  if (project.files.some((f) => f.path === dest))
                    return notice("Destination already exists.");
                  const p = {
                    ...project,
                    files: project.files.map((f) =>
                      f.path === from || f.path.startsWith(from + "/")
                        ? { ...f, path: dest + f.path.slice(from.length) }
                        : f,
                    ),
                    entry_file:
                      project.entry_file === from ? dest : project.entry_file,
                  };
                  updateProject(p);
                  loadFile(p.entry_file, p);
                  setExpanded((x) => [...x, path]);
                }
              }}
              onContextMenu={(e) => {
                e.preventDefault();
                setFileAction({ action: "menu", path });
                setModal("file-menu");
              }}
            >
              <button
                className="tree-open"
                title={path}
                onClick={() =>
                  node.folder
                    ? setExpanded((x) =>
                        x.includes(path)
                          ? x.filter((p) => p !== path)
                          : [...x, path],
                      )
                    : loadFile(path)
                }
              >
                {node.folder ? (
                  expanded.includes(path) ? (
                    <ChevronDown size={12} />
                  ) : (
                    <ChevronRight size={12} />
                  )
                ) : (
                  <span className="file-indent" />
                )}
                {node.folder ? <Folder size={14} /> : <FileCode2 size={14} />}
                <span>{name}</span>
                {path === active && dirty && <i className="dirty-dot" />}
              </button>
            </div>
            {node.folder && (expanded.includes(path) || search) && tree(path)}
          </div>
        );
      });
  };
  return (
    <div className={"studio " + (performanceMode ? "performance" : "")}>
      <SignalCanvas
        signal={signal}
        background
        intensity={intensity}
        quality={quality}
        reduced={reduced}
      />
      <header className="topbar">
        <a
          className="brand"
          href="/"
          aria-label="XXC / THUGS(red) Strudel Sandbox"
        >
          <img src="/brand/mark.svg" alt="" />
          <div>
            <b>
              XXC <span className="brand-slash">/</span> THUGS
              <span className="red">(red)</span>
            </b>
            <span>
              STRUDEL SANDBOX <i>▰</i>
            </span>
          </div>
        </a>
        <div className="top-divider" />
        <div className="project-heading">
          <span className="eyebrow">
            WORKSPACE / {project.visibility.toUpperCase()}
          </span>
          <button onClick={() => setModal("share")}>
            {project.title}
            <ChevronDown size={13} />
          </button>
        </div>
        <button
          className="command-trigger"
          onClick={() => {
            setModal("palette");
            setPalette("");
          }}
        >
          <Command size={13} />
          <span>Type a command…</span>
          <kbd>⌘ ⇧ P</kbd>
        </button>
        <div className="header-actions">
          <button
            className="icon"
            title="Toggle theme"
            aria-label="Toggle theme"
            onClick={() => setTheme((t) => (t === "dark" ? "light" : "dark"))}
          >
            {theme === "dark" ? <Sun size={17} /> : <Moon size={17} />}
          </button>
          <button
            className="icon"
            title="Performance mode"
            aria-label="Performance mode"
            onClick={() => setPerformanceMode((p) => !p)}
          >
            {performanceMode ? (
              <Minimize2 size={17} />
            ) : (
              <Maximize2 size={17} />
            )}
          </button>
          <button onClick={() => setModal("library")}>
            <Library size={15} />
            <span className="hide-small">Library</span>
          </button>
          <button className="share-button" onClick={() => setModal("share")}>
            <Share2 size={15} />
            <span className="hide-small">Export / Share</span>
          </button>
        </div>
      </header>
      {settings.announcement && (
        <div className="announcement">[ SYSTEM ] {settings.announcement}</div>
      )}
      <div className="transport">
        <button
          className="mobile-toggle icon"
          aria-label="Toggle explorer"
          onClick={() => setLeft((x) => !x)}
        >
          <Menu size={17} />
        </button>
        <div className="transport-main">
          <button
            className={"play-button " + (playing ? "running" : "")}
            disabled={!ready}
            onClick={() => send("evaluate", { mode: "all" })}
          >
            <Play size={15} fill="currentColor" />
            {playing ? "PLAYING" : "PLAY"}
          </button>
          <button
            title="Evaluate current file"
            disabled={!ready}
            onClick={() => send("evaluate", { mode: "all" })}
          >
            <RefreshCw size={14} />
            <span>UPDATE</span>
            <kbd>ALL</kbd>
          </button>
          <button title="Hush · Ctrl/Cmd + ." onClick={() => send("stop")}>
            <Square size={13} fill="currentColor" />
            <span>HUSH</span>
          </button>
          <span className="transport-rule" />
          <button
            className={
              recordState !== "inactive"
                ? "record-button active"
                : "record-button"
            }
            disabled={!ready}
            onClick={() => {
              if (recordState === "inactive") {
                setRecordSeconds(0);
                setRecorded(null);
                send("record", {
                  action: "start",
                  limit: settings.recording_seconds || 600,
                  maxBytes: (settings.upload_mb || 32) * 1048576,
                });
              } else send("record", { action: "stop" });
            }}
          >
            <Circle
              size={13}
              fill={recordState !== "inactive" ? "currentColor" : "none"}
            />
            {recordState === "inactive"
              ? "REC"
              : Math.floor(recordSeconds / 60)
                  .toString()
                  .padStart(2, "0") +
                ":" +
                (recordSeconds % 60).toString().padStart(2, "0")}
          </button>
          {recordState !== "inactive" && (
            <button
              className="icon"
              aria-label="Pause or resume recording"
              onClick={() =>
                send("record", {
                  action: recordState === "paused" ? "resume" : "pause",
                })
              }
            >
              <Pause size={13} />
            </button>
          )}
        </div>
        <div className="tempo">
          <b>{Math.round(signal.current.cps * 240)}</b>
          <span>
            BPM
            <br />
            <small>{signal.current.cps.toFixed(3)} CPS</small>
          </span>
        </div>
        <div className="master-volume">
          <Volume2 size={14} />
          <input
            aria-label="Master volume"
            type="range"
            min="0"
            max="1"
            step=".01"
            value={volume}
            onChange={(e) => {
              setVolume(+e.target.value);
              send("volume", { value: +e.target.value });
            }}
          />
          <span>{Math.round(volume * 100)}%</span>
        </div>
        <div className="transport-end">
          <span className={"engine-state " + (playing ? "green" : "")}>
            {playing
              ? "● AUDIO RUNNING"
              : ready
                ? "○ AUDIO STANDBY"
                : "◌ LOADING ENGINE"}
          </span>
          <button
            className="icon"
            aria-label="Undo"
            onClick={() => send("command", { command: "undo" })}
          >
            <Undo2 size={14} />
          </button>
          <button
            className="icon"
            aria-label="Redo"
            onClick={() => send("command", { command: "redo" })}
          >
            <Redo2 size={14} />
          </button>
          <button
            title="Save · Ctrl/Cmd + S"
            onClick={() =>
              save()
                .then(() => notice("Project saved"))
                .catch((e) => notice(e.message))
            }
          >
            <Save size={14} />
            <span className="hide-small">SAVE</span>
          </button>
          <button
            className="icon"
            aria-label="Toggle tools"
            onClick={() => setRight((x) => !x)}
          >
            <SlidersHorizontal size={16} />
          </button>
        </div>
      </div>
      <div
        className="workspace"
        ref={layout}
        style={
          {
            "--left-width": (left && !performanceMode ? leftWidth : 0) + "px",
            "--right-width":
              (right && !performanceMode ? rightWidth : 0) + "px",
          } as React.CSSProperties
        }
      >
        <nav className="activity-rail" aria-label="Workspace panels">
          {[
            [Files, "Explorer", () => setLeft((x) => !x)],
            [Library, "Library", () => setModal("library")],
            [SlidersHorizontal, "Sample Lab", () => setModal("samples")],
            [History, "History", openHistory],
            [
              BookOpen,
              "Documentation",
              () => {
                setRight(true);
                setTool("DOCS");
              },
            ],
          ].map(([Icon, label, fn]: any) => (
            <button
              key={label}
              className={label === "Explorer" && left ? "selected" : ""}
              title={label}
              aria-label={label}
              onClick={fn}
            >
              <Icon size={19} />
            </button>
          ))}
          <div className="rail-bottom">
            <a
              href="https://github.com/kawaiipantsu/strudel-xxc"
              title="AGPL source code"
              target="_blank"
              rel="noreferrer"
            >
              &lt;/&gt;
            </a>
            <button
              title="Preferences"
              aria-label="Preferences"
              onClick={() => setModal("settings")}
            >
              <Settings size={19} />
            </button>
          </div>
        </nav>
        <aside className={"explorer " + (!left ? "collapsed" : "")}>
          <div className="pane-heading">
            <span>EXPLORER</span>
            <button
              className="icon"
              title="Collapse explorer"
              aria-label="Collapse explorer"
              onClick={() => setLeft(false)}
            >
              <PanelLeftClose size={14} />
            </button>
          </div>
          <div className="explorer-root">
            <ChevronDown size={13} />
            <b>{project.title.toLowerCase().replaceAll(" ", "-")}</b>
            <button
              className="icon"
              title="New file"
              aria-label="New file"
              onClick={() => {
                localStorage.removeItem("xxc-snippet");
                newFile("new");
              }}
            >
              <Plus size={15} />
            </button>
          </div>
          <div className="tree" role="tree" aria-label="Project files">
            {tree()}
          </div>
          <div className="explorer-actions">
            <button onClick={() => newFile("folder")}>
              <Folder size={12} />
              Folder
            </button>
            <button onClick={() => fileInput.current?.click()}>
              <Upload size={12} />
              Import
            </button>
          </div>
          <label className="explorer-search">
            <Search size={13} />
            <input
              aria-label="Search project files"
              placeholder="Find in project…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </label>
          {search && (
            <div className="search-results">
              {project.files
                .filter((f) =>
                  f.content.toLowerCase().includes(search.toLowerCase()),
                )
                .map((f) => (
                  <button key={f.path} onClick={() => loadFile(f.path)}>
                    {f.path}
                    <small>
                      {f.content
                        .split("\n")
                        .find((l) =>
                          l.toLowerCase().includes(search.toLowerCase()),
                        )
                        ?.slice(0, 70)}
                    </small>
                  </button>
                ))}
            </div>
          )}
          <div className="explorer-bottom">
            <div className="pane-heading">SESSION NOTES</div>
            <p>{project.description}</p>
            <span className="tag">#{project.tags[0] || "live-code"}</span>
            <div className="ascii-mark" aria-hidden="true">
              {"┌─[ SIGNAL / LAB ]─┐\n│  ▂▅▃▁▆█▅▂▃▇▂▁   │\n└─────────────────┘"}
            </div>
            <small>
              CODE IS THE INSTRUMENT.
              <br />
              MAKE IT YOURS.
            </small>
          </div>
        </aside>
        <div
          className="divider vertical left-divider"
          role="separator"
          aria-label="Resize explorer"
          onPointerDown={(e) => resize("left", e)}
          onDoubleClick={() => setLeftWidth(222)}
        />
        <main className="editor-column">
          <div className="editor-tabs" role="tablist" aria-label="Open files">
            {tabs
              .filter((t) =>
                project.files.some((f) => f.path === t && f.kind !== "folder"),
              )
              .map((t) => (
                <div
                  key={t}
                  className={"editor-tab " + (t === active ? "active" : "")}
                  draggable
                  onDragStart={(e) => e.dataTransfer.setData("xxc/tab", t)}
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={(e) => {
                    const from = e.dataTransfer.getData("xxc/tab");
                    if (!from) return;
                    setTabs((prev) => {
                      const next = prev.filter((x) => x !== from);
                      next.splice(next.indexOf(t), 0, from);
                      return next;
                    });
                  }}
                >
                  <button
                    role="tab"
                    aria-selected={t === active}
                    onClick={() => loadFile(t)}
                    onDoubleClick={() =>
                      setPinned((x) =>
                        x.includes(t) ? x.filter((p) => p !== t) : [...x, t],
                      )
                    }
                  >
                    <FileCode2 size={13} />
                    {t.split("/").at(-1)}
                    {dirty && t === active && <i className="dirty-dot" />}
                  </button>
                  <button
                    className="tab-close"
                    aria-label={
                      pinned.includes(t) ? "Unpin " + t : "Close " + t
                    }
                    onClick={() =>
                      pinned.includes(t)
                        ? setPinned((p) => p.filter((x) => x !== t))
                        : closeTab(t)
                    }
                  >
                    {pinned.includes(t) ? <Pin size={11} /> : <X size={12} />}
                  </button>
                </div>
              ))}
            <button
              className="icon tab-add"
              title="New file"
              aria-label="Add editor tab"
              onClick={() => {
                localStorage.removeItem("xxc-snippet");
                newFile("new");
              }}
            >
              <Plus size={14} />
            </button>
          </div>
          <div className="breadcrumb">
            <span>{project.title}</span>
            <ChevronRight size={11} />
            <span>{active}</span>
            <span className="editor-language">JAVASCRIPT / STRUDEL</span>
          </div>
          <div className="editor-surface">
            <iframe
              ref={frame}
              src="/sandbox/"
              title="Strudel code editor"
              sandbox="allow-scripts"
              allow="autoplay"
            />
            <div className="editor-watermark" aria-hidden="true">
              {"[ XXC / THUGS(red) ]\nLIVE CODE · OPEN SOUND"}
            </div>
            {!ready && (
              <div className="loading-state">
                <img src="/brand/loading.svg" alt="" />
                <b>INITIALIZING STRUDEL</b>
                <p>Preparing the pattern engine and audio worklets…</p>
              </div>
            )}
          </div>
          {performanceMode && (
            <div className="performance-signal">
              <SignalCanvas signal={signal} mode={mode} quality={quality} />
            </div>
          )}
          {bottom && (
            <>
              <div
                className="divider horizontal"
                role="separator"
                aria-label="Resize console"
                onPointerDown={(e) => resize("console", e)}
                onDoubleClick={() => setConsoleHeight(146)}
              />
              <section className="console" style={{ height: consoleHeight }}>
                <div className="console-tabs">
                  {[
                    "OUTPUT",
                    "PROBLEMS",
                    "AUDIO",
                    "DEBUG",
                    "NETWORK",
                    "EXPORT",
                  ].map((t) => (
                    <button
                      className={consoleTab === t ? "active" : ""}
                      key={t}
                      onClick={() => setConsoleTab(t)}
                    >
                      {t}
                      {t === "PROBLEMS" &&
                        logs.filter((l) => l.type === "PROBLEMS").length >
                          0 && (
                          <span>
                            {logs.filter((l) => l.type === "PROBLEMS").length}
                          </span>
                        )}
                    </button>
                  ))}
                  <div className="spacer" />
                  <input
                    aria-label="Filter console"
                    placeholder="filter…"
                    value={filter}
                    onChange={(e) => setFilter(e.target.value)}
                  />
                  <button
                    title="Toggle timestamps"
                    onClick={() => setTimestamps((x) => !x)}
                  >
                    ◷
                  </button>
                  <button
                    title="Copy console"
                    onClick={() =>
                      navigator.clipboard
                        .writeText(
                          logs.map((l) => l.time + " " + l.text).join("\n"),
                        )
                        .then(() => notice("Console copied"))
                    }
                  >
                    COPY
                  </button>
                  <button onClick={() => setLogs([])}>CLEAR</button>
                  <button
                    aria-label="Collapse console"
                    onClick={() => setBottom(false)}
                  >
                    ⌄
                  </button>
                </div>
                <div className="console-lines" ref={consoleList}>
                  {logs
                    .filter(
                      (l) =>
                        (consoleTab === "OUTPUT" || l.type === consoleTab) &&
                        l.text.toLowerCase().includes(filter.toLowerCase()),
                    )
                    .map((l, i) => (
                      <button
                        key={i}
                        className={l.type === "PROBLEMS" ? "error-line" : ""}
                        onClick={() =>
                          l.line &&
                          send("command", { command: "focus", arg: l.line })
                        }
                      >
                        {timestamps && <time>{l.time}</time>}
                        <span className="log-label">
                          [{l.type === "PROBLEMS" ? "ERROR" : l.type}]
                        </span>
                        <span>{l.text}</span>
                      </button>
                    ))}
                </div>
              </section>
            </>
          )}
        </main>
        <div
          className="divider vertical right-divider"
          role="separator"
          aria-label="Resize workbench"
          onPointerDown={(e) => resize("right", e)}
          onDoubleClick={() => setRightWidth(326)}
        />
        <div className={"right-panel " + (!right ? "collapsed" : "")}>
          <Toolbox
            tab={tool}
            setTab={setTool}
            signal={signal}
            tick={tick}
            send={send}
            insert={insert}
            word={cursor.word}
            quality={quality}
            intensity={intensity}
            setIntensity={setIntensity}
            mode={mode}
            setMode={setMode}
            onSampleLab={() => setModal("samples")}
            onLog={log}
            controls={controls}
            setControls={setControls}
            features={{
              midi: settings.midi_enabled !== false,
              hydra: settings.hydra_enabled !== false,
            }}
          />
        </div>
      </div>
      <footer className="statusbar">
        <button onClick={() => setBottom((x) => !x)}>
          <Terminal size={12} />
          <span>{ready ? "STRUDEL READY" : "INITIALIZING"}</span>
        </button>
        <span className="status-green">{health.database ? "●" : "○"} API</span>
        <span className="hide-small">
          {audioStatus.sampleRate
            ? audioStatus.sampleRate / 1000 + " kHz"
            : "AUDIO LOCKED"}
        </span>
        <span className="hide-small">
          {(audioStatus.latency * 1000).toFixed(1)} ms
        </span>
        <span className="spacer" />
        <span className="hide-small">{active}</span>
        <span>
          Ln {cursor.line}, Col {cursor.column}
        </span>
        <span className="hide-small">UTF-8</span>
        <button
          onClick={() => setTheme((t) => (t === "dark" ? "light" : "dark"))}
        >
          {theme.toUpperCase()}
        </button>
        <span className={dirty ? "red" : "saved-indicator"}>
          {dirty ? "●" : "✓"} {saveState}
        </span>
      </footer>
      <input
        ref={fileInput}
        hidden
        type="file"
        accept=".strudel,.js,.txt,.json,.zip,audio/*"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) importFile(f);
          e.target.value = "";
        }}
      />
      {onboarding && ready && (
        <aside className="onboarding" aria-label="Quick start">
          <button
            className="icon dismiss"
            aria-label="Dismiss quick start"
            onClick={() => {
              setOnboarding(false);
              localStorage.setItem("xxc-onboarded", "1");
            }}
          >
            <X size={14} />
          </button>
          <span className="eyebrow">[ FIRST TRANSMISSION ]</span>
          <h3>Your code. Your sound.</h3>
          <p>
            Press <b>Play</b> to start. Change a pattern, then{" "}
            <kbd>Ctrl / ⌘ ↵</kbd> to evaluate. Watch the signal on the right.{" "}
            <kbd>Ctrl / ⌘ .</kbd> is your hush key.
          </p>
          <div className="toolbar">
            <button
              className="primary"
              onClick={() => {
                send("evaluate", { mode: "all" });
                setOnboarding(false);
                localStorage.setItem("xxc-onboarded", "1");
              }}
            >
              <Play size={13} />
              Let’s make noise
            </button>
            <button
              onClick={() => {
                setOnboarding(false);
                localStorage.setItem("xxc-onboarded", "1");
              }}
            >
              Explore first
            </button>
          </div>
        </aside>
      )}
      {toast && (
        <div className="toast" role="status">
          <Check size={15} />
          {toast}
        </div>
      )}
      {context && (
        <>
          <div className="context-dismiss" onClick={() => setContext(null)} />
          <div
            className="context-menu"
            role="menu"
            style={{ left: context.x, top: Math.max(5, context.y) }}
          >
            {[
              [
                "Evaluate selection / block",
                () => send("evaluate", { mode: "block" }),
              ],
              ["Hush", () => send("stop")],
              ["Format document", () => send("command", { command: "format" })],
              [
                "Comment / uncomment",
                () => send("command", { command: "comment" }),
              ],
              [
                "Duplicate selection / line",
                () => send("command", { command: "duplicate" }),
              ],
              ...(/^(?:s|sound|note|n|stack|cat|sequence|choose|randcat)\s*\(/.test(
                context.selection.trim(),
              )
                ? [
                    [
                      "Append .fast(2)",
                      () =>
                        send("command", {
                          command: "insert",
                          arg: context.selection + ".fast(2)",
                        }),
                    ],
                    [
                      "Append .slow(2)",
                      () =>
                        send("command", {
                          command: "insert",
                          arg: context.selection + ".slow(2)",
                        }),
                    ],
                    [
                      "Reverse pattern",
                      () =>
                        send("command", {
                          command: "insert",
                          arg: context.selection + ".rev()",
                        }),
                    ],
                  ]
                : []),
              ...[
                ".room(.4)",
                ".delay(.3)",
                ".lpf(800)",
                ".gain(.5)",
                "._scope()",
                "._pianoroll()",
                "._spiral()",
                ".lpf(slider(800,100,4000))",
              ].map((code) => ["Insert " + code, () => insert(code)]),
              [
                "Search function docs",
                () => {
                  setRight(true);
                  setTool("DOCS");
                },
              ],
              [
                "Search samples",
                () => {
                  setRight(true);
                  setTool("SAMPLES");
                },
              ],
              ...(context.selection
                ? [
                    [
                      "Copy snippet",
                      () =>
                        navigator.clipboard
                          .writeText(context.selection)
                          .then(() => notice("Snippet copied")),
                    ],
                    [
                      "Extract to new file",
                      () => {
                        newFile("new");
                        setNameValue("snippet.strudel");
                        localStorage.setItem("xxc-snippet", context.selection);
                      },
                    ],
                  ]
                : []),
            ].map(([label, fn]: any) => (
              <button
                role="menuitem"
                key={label}
                onClick={() => {
                  fn();
                  setContext(null);
                }}
              >
                {label}
              </button>
            ))}
          </div>
        </>
      )}
      {["palette", "quickopen"].includes(modal) && (
        <Modal
          title={modal === "palette" ? "COMMAND PALETTE" : "QUICK OPEN"}
          onClose={() => setModal("")}
        >
          <input
            className="palette-input"
            autoFocus
            placeholder={
              modal === "palette" ? "> Type a command" : "Find a file…"
            }
            value={palette}
            onChange={(e) => setPalette(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "ArrowDown") {
                e.preventDefault();
                (
                  e.currentTarget.nextElementSibling?.querySelector(
                    "button",
                  ) as HTMLButtonElement
                )?.focus();
              }
            }}
          />
          <div className="palette-results">
            {(modal === "palette"
              ? commands
              : project.files
                  .filter((f) => f.kind !== "folder")
                  .map(
                    (f) =>
                      [f.path, () => loadFile(f.path)] as [string, () => void],
                  )
            )
              .filter(([label]) =>
                label.toLowerCase().includes(palette.toLowerCase()),
              )
              .map(([label, fn]) => (
                <button
                  key={label}
                  onClick={() => {
                    setModal("");
                    fn();
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "ArrowDown")
                      (
                        e.currentTarget.nextElementSibling as HTMLButtonElement
                      )?.focus();
                    if (e.key === "ArrowUp")
                      (
                        e.currentTarget
                          .previousElementSibling as HTMLButtonElement
                      )?.focus();
                  }}
                >
                  <span>&gt; {label}</span>
                  <span>↵</span>
                </button>
              ))}
          </div>
        </Modal>
      )}
      {modal === "library" && (
        <Modal title="XXC / LIBRARY" wide onClose={() => setModal("")}>
          <LibraryView
            onOpen={async (p) => {
              if (dirtyRef.current) await save();
              openProject(p);
            }}
            onFork={fork}
          />
        </Modal>
      )}
      {modal === "samples" && (
        <Modal title="SAMPLE LAB" wide onClose={() => setModal("")}>
          <SampleLab
            ensureProject={ensureProject}
            onInsert={insert}
            onLog={log}
          />
        </Modal>
      )}
      {modal === "recording" && (
        <Modal title="RECORDING / EXPORT" wide onClose={() => setModal("")}>
          <RecordingPanel
            blob={recorded}
            project={project}
            ensureProject={ensureProject}
            onLog={log}
            onUpdate={() =>
              api<Project>("projects/" + proj.current.id).then(setProject)
            }
          />
        </Modal>
      )}
      {modal === "file" && (
        <Modal
          title={(fileAction?.action || "new") + " file"}
          onClose={() => setModal("")}
        >
          <label className="field">
            Relative path
            <input
              autoFocus
              value={nameValue}
              onChange={(e) => setNameValue(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && applyFileAction()}
            />
          </label>
          <p className="muted">
            Use a folder path such as <code>patterns/drums.strudel</code>.
          </p>
          <button className="primary" onClick={applyFileAction}>
            Apply change
          </button>
        </Modal>
      )}
      {modal === "file-menu" && fileAction && (
        <Modal title={fileAction.path} onClose={() => setModal("")}>
          <div className="palette-results">
            {[
              ["Rename", () => newFile("rename", fileAction.path)],
              ["Duplicate", () => newFile("duplicate", fileAction.path)],
              [
                "Set as entry file",
                () => {
                  updateProject({ ...project, entry_file: fileAction.path });
                  setModal("");
                },
              ],
              [
                "Delete",
                () => {
                  removeFile(fileAction.path);
                  setModal("");
                },
              ],
            ].map(([name, fn]: any) => (
              <button key={name} onClick={fn}>
                {name}
              </button>
            ))}
          </div>
        </Modal>
      )}
      {modal === "recent" && (
        <Modal title="RECENT PROJECTS" onClose={() => setModal("")}>
          {recent.map((p) => (
            <button
              className="list-row full-width"
              key={p.id}
              onClick={() => api<Project>("projects/" + p.id).then(openProject)}
            >
              <span>{p.title}</span>
              <small>{p.updated_at}</small>
            </button>
          ))}
          {!recent.length && <p>Your saved projects will appear here.</p>}
        </Modal>
      )}
      {modal === "history" && (
        <Modal
          title="PROJECT / REVISION HISTORY"
          wide
          onClose={() => setModal("")}
        >
          <div className="history-layout">
            <div>
              {revisions.map((r) => (
                <button
                  className="list-row full-width"
                  key={r.id}
                  onClick={() =>
                    api<Project>(
                      "projects/" + project.id + "/revisions",
                      "POST",
                      { id: r.id },
                    ).then(setRevision)
                  }
                >
                  <span>{r.reason}</span>
                  <small>{r.created_at}</small>
                </button>
              ))}
              {!revisions.length && (
                <p>Save another meaningful change to create a checkpoint.</p>
              )}
            </div>
            <div>
              {revision && (
                <>
                  <h3>{revision.title}</h3>
                  <div className="diff">
                    <div>
                      <b>CURRENT</b>
                      <pre>
                        {project.files.find((f) => f.path === active)?.content}
                      </pre>
                    </div>
                    <div>
                      <b>REVISION</b>
                      <pre>
                        {revision.files.find((f) => f.path === active)?.content}
                      </pre>
                    </div>
                  </div>
                  <button
                    className="primary"
                    onClick={() =>
                      setConfirm({
                        text: "Restore this revision? The current version will be checkpointed.",
                        action: async () => {
                          const p = {
                            ...revision,
                            id: project.id,
                            version: project.version,
                          };
                          const saved = await api<Project>(
                            "projects/" + project.id,
                            "PUT",
                            p,
                          );
                          await openProject(saved);
                        },
                      })
                    }
                  >
                    Restore revision
                  </button>
                </>
              )}
            </div>
          </div>
        </Modal>
      )}
      {modal === "share" && (
        <Modal
          title="PROJECT / EXPORT / SHARE"
          wide
          onClose={() => setModal("")}
        >
          <div className="share-layout">
            <div>
              <span className="eyebrow">[ SESSION METADATA ]</span>
              <div className="form-grid">
                <label>
                  Project title
                  <input
                    value={project.title}
                    onChange={(e) =>
                      updateProject({ ...project, title: e.target.value })
                    }
                  />
                </label>
                <label>
                  Author / artist
                  <input
                    value={project.author}
                    onChange={(e) =>
                      updateProject({ ...project, author: e.target.value })
                    }
                  />
                </label>
                <label className="full-width">
                  Description
                  <textarea
                    value={project.description}
                    onChange={(e) =>
                      updateProject({ ...project, description: e.target.value })
                    }
                  />
                </label>
                <label>
                  Tags
                  <input
                    value={project.tags.join(", ")}
                    onChange={(e) =>
                      updateProject({
                        ...project,
                        tags: e.target.value
                          .split(",")
                          .map((x) => x.trim())
                          .filter(Boolean),
                      })
                    }
                  />
                </label>
                <label>
                  Visibility
                  <select
                    aria-label="Visibility"
                    value={project.visibility}
                    onChange={(e) =>
                      updateProject({
                        ...project,
                        visibility: e.target.value as Project["visibility"],
                      })
                    }
                  >
                    <option value="private">Private · this browser</option>
                    <option value="unlisted">
                      Unlisted · anyone with link
                    </option>
                    <option value="public">Public · XXC Library</option>
                  </select>
                </label>
              </div>
              <div className="toolbar wrap">
                <button
                  className="primary"
                  disabled={busy}
                  onClick={() =>
                    save()
                      .then(() =>
                        notice(
                          project.visibility === "public"
                            ? "Published to XXC Strudel Library"
                            : "Project saved",
                        ),
                      )
                      .catch((e) => notice(e.message))
                  }
                >
                  <Save size={14} />
                  {project.visibility === "public"
                    ? "Save to XXC Strudel Library"
                    : "Save project"}
                </button>
                {project.id && (
                  <button onClick={() => fork(project)}>
                    <GitFork size={14} />
                    Fork / remix
                  </button>
                )}
              </div>
              {project.id && project.visibility !== "private" && (
                <div className="share-link">
                  <a
                    href={"/p/" + project.slug}
                    target="_blank"
                    rel="noreferrer"
                  >
                    https://strudel.xxc.dk/p/{project.slug}
                  </a>
                  <button
                    onClick={() =>
                      navigator.clipboard
                        .writeText("https://strudel.xxc.dk/p/" + project.slug)
                        .then(() => notice("Share URL copied"))
                    }
                  >
                    Copy link
                  </button>
                </div>
              )}
              <div className="pane-heading">DOWNLOAD / OPEN FORMATS</div>
              <div className="toolbar wrap">
                <button
                  onClick={() =>
                    download(
                      new Blob(
                        [
                          project.files.find((f) => f.path === active)
                            ?.content || "",
                        ],
                        { type: "text/plain" },
                      ),
                      active.split("/").at(-1)!,
                    )
                  }
                >
                  Current .strudel
                </button>
                <button
                  onClick={async () => {
                    try {
                      const id = await ensureProject();
                      location.href = "/api/projects/" + id + "/bundle";
                    } catch (e) {
                      notice(String(e));
                    }
                  }}
                >
                  Project ZIP
                </button>
                <button
                  onClick={() =>
                    download(
                      new Blob(
                        [
                          JSON.stringify(
                            {
                              format: "xxc-strudel-project",
                              version: 1,
                              title: project.title,
                              entryFile: project.entry_file,
                              project,
                            },
                            null,
                            2,
                          ),
                        ],
                        { type: "application/json" },
                      ),
                      "project.json",
                    )
                  }
                >
                  Metadata JSON
                </button>
                <button
                  onClick={async () => {
                    try {
                      const id = await ensureProject();
                      const map = await api("projects/" + id + "/sample-map");
                      download(
                        new Blob([JSON.stringify(map, null, 2)], {
                          type: "application/json",
                        }),
                        "strudel.json",
                      );
                    } catch (e) {
                      notice(String(e));
                    }
                  }}
                >
                  Sample map
                </button>
                <button onClick={() => setModal("recording")}>
                  Audio recording
                </button>
                <button onClick={() => fileInput.current?.click()}>
                  Import ZIP / source
                </button>
              </div>
              <p className="hint">
                Private projects are owned by this browser’s secure cookie.
                Export a ZIP for backups and moving between devices.
              </p>
            </div>
            <div className="cover-builder">
              <img
                src={
                  project.cover_id
                    ? mediaLink(project.cover_id)
                    : "/brand/default-cover.svg"
                }
                alt="Project cover"
              />
              <label>
                Cover style
                <select
                  value={coverStyle}
                  onChange={(e) => setCoverStyle(e.target.value)}
                >
                  {[
                    "terminal",
                    "oscilloscope",
                    "spectral",
                    "piano-roll",
                    "glitch",
                    "minimal",
                    "thugs-red",
                  ].map((s) => (
                    <option key={s}>{s}</option>
                  ))}
                </select>
              </label>
              <button className="full-width" disabled={busy} onClick={cover}>
                {busy ? "GENERATING…" : "GENERATE CODE COVER"}
              </button>
              {project.cover_id && (
                <div className="toolbar">
                  <a href={mediaLink(project.cover_id) + "?download=1"}>
                    PNG ↓
                  </a>
                  <a
                    href={
                      mediaLink(project.cover_id) + "?format=svg&download=1"
                    }
                  >
                    SVG master ↓
                  </a>
                </div>
              )}
              <p className="hint">
                Derived from your project’s tokens, source hash, title and
                tempo.
              </p>
            </div>
          </div>
        </Modal>
      )}
      {modal === "settings" && (
        <Modal title="WORKSPACE / PREFERENCES" onClose={() => setModal("")}>
          <div className="form-grid">
            <label>
              Theme
              <select
                value={themePreference}
                onChange={(e) => setTheme(e.target.value)}
              >
                <option value="system">System preference</option>
                <option value="dark">Dark / terminal</option>
                <option value="light">Light / engineering paper</option>
              </select>
            </label>
            <label>
              Editor font size
              <input
                type="number"
                min="10"
                max="28"
                value={font}
                onChange={(e) => setFont(+e.target.value)}
              />
            </label>
            <label>
              Visual quality
              <select
                value={quality}
                onChange={(e) => setQuality(e.target.value)}
              >
                {["auto", "low", "balanced", "high"].map((q) => (
                  <option key={q}>{q}</option>
                ))}
              </select>
            </label>
            <label>
              <input
                type="checkbox"
                checked={reduced}
                onChange={(e) => setReduced(e.target.checked)}
              />
              Reduced motion
            </label>
          </div>
          <div className="pane-heading">KEYBOARD / SHORTCUTS</div>
          {Object.entries(shortcuts).map(([k, v]) => (
            <label className="shortcut-row" key={k}>
              {k}
              <input
                value={String(v)}
                onChange={(e) => {
                  const next = { ...shortcuts, [k]: e.target.value };
                  setShortcuts(next);
                  localStorage.setItem("xxc-shortcuts", JSON.stringify(next));
                  send("shortcuts", { values: next });
                }}
              />
            </label>
          ))}
          <p className="hint">
            Mod = Ctrl on Windows/Linux, Command on macOS. Editor: Shift+Enter
            evaluates the current line; Ctrl/Cmd+Enter evaluates a selected
            expression or block.
          </p>
          <div className="pane-heading">DIAGNOSTICS</div>
          <pre className="diagnostics">
            {JSON.stringify(
              {
                engine: "Strudel core 1.2.6",
                editor: "CodeMirror / Strudel 1.3.0",
                audio: audioStatus,
                api: health.status,
                redis: health.redis,
                ffmpeg: health.ffmpeg,
                online: navigator.onLine,
              },
              null,
              2,
            )}
          </pre>
          <a href="/admin/" target="_blank" rel="noreferrer">
            Administrator console ↗
          </a>
          <br />
          <a
            href="https://github.com/kawaiipantsu/strudel-xxc"
            target="_blank"
            rel="noreferrer"
          >
            AGPL-3.0-or-later / complete source ↗
          </a>
        </Modal>
      )}
      {confirm && (
        <Modal title="CONFIRM CHANGE" onClose={() => setConfirm(null)}>
          <p>{confirm.text}</p>
          <div className="toolbar">
            <button onClick={() => setConfirm(null)}>Cancel</button>
            <button
              className="danger"
              onClick={() => {
                const action = confirm.action;
                setConfirm(null);
                Promise.resolve(action()).catch((e) => notice(String(e)));
              }}
            >
              Continue
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
}
