import { useState, useEffect, useMemo, useRef, useCallback } from "react";
import {
  Blocks,
  FolderOpen,
  Search,
  Package,
  Settings2,
  HelpCircle,
  ChevronDown,
  ChevronRight,
  Plus,
  Undo2,
  Redo2,
  Save,
  Hammer,
  Upload,
  CheckCircle2,
  AlertCircle,
  AlertTriangle,
  Terminal,
  Code2,
  Columns2,
  PanelLeftClose,
  PanelRightClose,
  PanelRightOpen,
  Minus,
  FileCode2,
  Zap,
  ArrowUpRight,
  X,
  Loader2,
  Braces,
  GitBranch,
  Trash2,
  Pencil,
  Download,
} from "lucide-react";
import type {
  Project,
  Block,
  ApiMember,
  BuildResult,
  Diagnostic,
  Expr,
} from "./types";
import {
  block,
  script,
  method,
  findBlock,
  findLocation,
  cloneBlock,
  walk,
  countBlocks,
  registry,
  validateProject,
  ref,
  literal,
} from "../shared/model.mjs";
import { api, download, useProject } from "./useProject";
import BlockCanvas from "./BlockCanvas";
import Inspector from "./Inspector";
import CodePane from "./CodePane";
import { Explorer, Library, ApiBrowser, ProjectSearch } from "./Sidebar";
import {
  Palette,
  NewProjectDialog,
  OpenProjectDialog,
  SettingsDialog,
  MethodDialog,
  NameDialog,
  FrameworkDialog,
  ReleaseDialog,
  HelpDialog,
} from "./Dialogs";

export default function App() {
  const store = useProject(),
    { project, edit, save, load } = store;
  const [fileId, setFileId] = useState(""),
    [methodId, setMethodId] = useState(""),
    [selected, setSelected] = useState<string | null>(null);
  const [sidebar, setSidebar] = useState("explorer"),
    [sidebarOpen, setSidebarOpen] = useState(true),
    [inspectorOpen, setInspectorOpen] = useState(true),
    [view, setView] = useState("blocks"),
    [zoom, setZoom] = useState(1);
  const [modal, setModal] = useState(""),
    [libraryQuery, setLibraryQuery] = useState(""),
    [insertion, setInsertion] = useState<{
      target: string | null;
      mode: string;
    } | null>(null);
  const [status, setStatus] = useState<any>(null),
    [catalog, setCatalog] = useState<any[] | null>(null),
    [build, setBuild] = useState<BuildResult | null>(null),
    [building, setBuilding] = useState(false),
    [builtSnapshot, setBuiltSnapshot] = useState("");
  const [generated, setGenerated] = useState<any>({
      files: [],
      diagnostics: [],
      lineCount: 0,
    }),
    [generating, setGenerating] = useState(false),
    [consoleOpen, setConsoleOpen] = useState(true),
    [consoleTab, setConsoleTab] = useState("problems"),
    [toast, setToast] = useState("");
  const worker = useRef<Worker | null>(null),
    revision = useRef(0),
    buildBusy = useRef(false),
    uploadSource = useRef<HTMLInputElement>(null);
  const activeFile =
    project?.files.find((f) => f.id === fileId) || project?.files[0];
  const activeMethod =
    activeFile?.methods.find((m) => m.id === methodId) ||
    activeFile?.methods.find((m) => m.event === "constructor") ||
    activeFile?.methods[0];
  const currentBlock =
    activeMethod && selected
      ? (findBlock(activeMethod.blocks, selected) as Block | null)
      : null;
  const generatedFile = generated.files.find(
    (f: any) => f.name === activeFile?.name,
  ) || { source: "", map: {}, lineCount: 0 };
  const isCurrentBuild = !!project && builtSnapshot === JSON.stringify(project);
  const diagnostics: Diagnostic[] = useMemo(
    () => [
      ...generated.diagnostics,
      ...(isCurrentBuild
        ? build?.diagnostics.filter(
            (d) => !d.code.startsWith("BF1") && !d.code.startsWith("BF2"),
          ) || []
        : []),
    ],
    [generated, build, isCurrentBuild],
  );
  const errorCount = diagnostics.filter((d) => d.severity === "error").length,
    warningCount = diagnostics.filter((d) => d.severity === "warning").length;
  const errorBlocks = useMemo(
    () =>
      new Set(
        diagnostics
          .filter((d) => d.severity === "error" && d.blockId)
          .map((d) => d.blockId!),
      ),
    [diagnostics],
  );
  const totalBlocks = useMemo(
    () => (project ? countBlocks(project) : 0),
    [project],
  );
  const variables = useMemo(() => {
    const names = new Set<string>();
    if (activeFile)
      for (const m of activeFile.methods)
        walk(m.blocks, (b: Block) => {
          if (
            b.values.name &&
            [
              "field",
              "variable",
              "vehicle",
              "ped",
              "blip",
              "menu",
              "menuCheckbox",
              "phone",
              "contact",
              "new",
            ].includes(b.kind)
          )
            names.add(b.values.name);
          if (b.values.result) names.add(b.values.result);
        });
    return [...names];
  }, [activeFile]);
  useEffect(() => {
    api("/status")
      .then(setStatus)
      .catch((e) => notify(e.message));
  }, []);
  useEffect(() => {
    const w = new Worker(new URL("./generator.worker.ts", import.meta.url), {
      type: "module",
    });
    worker.current = w;
    w.onmessage = (e) => {
      if (e.data.revision !== revision.current) return;
      setGenerating(false);
      if (e.data.error)
        setGenerated({
          files: [],
          lineCount: 0,
          diagnostics: [
            { severity: "error", code: "BF000", message: e.data.error },
          ],
        });
      else setGenerated(e.data.result);
    };
    w.onerror = (e) => {
      setGenerating(false);
      notify("Code generation failed: " + e.message);
    };
    return () => {
      w.terminate();
      worker.current = null;
    };
  }, []);
  useEffect(() => {
    if (!project) return;
    setGenerating(true);
    const r = ++revision.current;
    const t = setTimeout(
      () => worker.current?.postMessage({ project, revision: r }),
      160,
    );
    return () => clearTimeout(t);
  }, [project]);
  useEffect(() => {
    if (sidebar === "api" && !catalog) reloadCatalog();
  }, [sidebar]);
  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(""), 4500);
    return () => clearTimeout(t);
  }, [toast]);
  function notify(message: string) {
    setToast(message);
  }
  async function reloadCatalog() {
    try {
      setCatalog(await api("/catalog"));
    } catch (e: any) {
      notify(e.message);
    }
  }
  function selectMethod(file: string, method?: string) {
    setFileId(file);
    setMethodId(method || "");
    setSelected(null);
  }
  function activate(p: Project) {
    load(p);
    setFileId(p.files[0].id);
    setMethodId(
      p.files[0].methods.find((m) => m.event === "constructor")?.id ||
        p.files[0].methods[0]?.id ||
        "",
    );
    setSelected(null);
    setBuild(null);
    setBuiltSnapshot("");
    setModal("");
  }
  function editMethod(fn: (blocks: Block[]) => void, coalesce = false) {
    if (!activeFile || !activeMethod) return;
    edit((p) => {
      const m = p.files
        .find((f) => f.id === activeFile.id)
        ?.methods.find((m) => m.id === activeMethod.id);
      if (m) fn(m.blocks);
    }, coalesce);
  }
  function openPalette(target: string | null = selected, mode = "after") {
    setInsertion({ target, mode });
    setModal("palette");
  }
  function insertBlock(b: Block, target = selected, mode = "after") {
    if (!activeFile || !activeMethod) return;
    edit((p) => {
      const f = p.files.find((f) => f.id === activeFile.id)!;
      const m = f.methods.find((m) => m.id === activeMethod.id)!;
      const dependency = (registry[b.kind] as any).dependency;
      if (dependency && !p.frameworks.includes(dependency))
        p.frameworks.push(dependency);
      if (mode === "inside" || mode === "children" || mode === "otherwise") {
        const parent = target ? findBlock(m.blocks, target) : null;
        if (parent) {
          (mode === "otherwise" ? parent.otherwise : parent.children).push(b);
          parent.collapsed = false;
        } else m.blocks.push(b);
      } else {
        const location = target ? findLocation(m.blocks, target) : null;
        if (location && mode !== "end")
          location.list.splice(
            location.index + (mode === "before" ? 0 : 1),
            0,
            b,
          );
        else m.blocks.push(b);
      }
    });
    setSelected(b.id);
    setInspectorOpen(true);
    setModal("");
  }
  function addKind(kind: string) {
    const place = modal === "palette" ? insertion : null;
    insertBlock(
      block(kind) as Block,
      place ? place.target : selected,
      place ? place.mode : "after",
    );
  }
  function changeValue(key: string, value: any) {
    if (!selected) return;
    editMethod((blocks) => {
      const b = findBlock(blocks, selected);
      if (b) b.values[key] = value;
    }, true);
  }
  function blockAction(action: string) {
    if (!selected || !activeMethod) return;
    let nextId: string | null = selected;
    editMethod((blocks) => {
      const loc = findLocation(blocks, selected);
      if (!loc) return;
      const b = loc.list[loc.index];
      if (action === "delete") {
        loc.list.splice(loc.index, 1);
        nextId = loc.list[Math.min(loc.index, loc.list.length - 1)]?.id || null;
      }
      if (action === "duplicate") {
        const c = cloneBlock(b);
        loc.list.splice(loc.index + 1, 0, c);
        nextId = c.id;
      }
      if (action === "disable") b.disabled = !b.disabled;
      if (action === "up" && loc.index > 0) {
        loc.list.splice(loc.index, 1);
        loc.list.splice(loc.index - 1, 0, b);
      }
      if (action === "down" && loc.index < loc.list.length - 1) {
        loc.list.splice(loc.index, 1);
        loc.list.splice(loc.index + 1, 0, b);
      }
      if (action === "indent") {
        const prev = loc.list[loc.index - 1];
        if (prev && (registry[prev.kind] as any).container) {
          loc.list.splice(loc.index, 1);
          prev.children.push(b);
          prev.collapsed = false;
        } else
          notify(
            "The preceding block must be a condition or loop to contain this block.",
          );
      }
      if (action === "outdent") {
        let parent: Block | null = null;
        walk(blocks, (n: Block) => {
          if (n.children === loc.list || n.otherwise === loc.list) parent = n;
        });
        if (parent) {
          const pl = findLocation(blocks, (parent as Block).id);
          loc.list.splice(loc.index, 1);
          pl?.list.splice(pl.index + 1, 0, b);
        }
      }
    });
    setSelected(nextId);
  }
  function dropBlock(data: any, target: string | null, mode: string) {
    if (data.kind) {
      insertBlock(block(data.kind) as Block, target, mode);
      return;
    }
    if (!data.id || data.id === target) return;
    editMethod((blocks) => {
      const loc = findLocation(blocks, data.id);
      if (!loc) return;
      const b = loc.list[loc.index];
      if (target && findBlock([b], target)) {
        notify("A block cannot be moved inside itself.");
        return;
      }
      loc.list.splice(loc.index, 1);
      const to = target ? findLocation(blocks, target) : null;
      if (to && mode === "inside") {
        const parent = to.list[to.index];
        parent.children.push(b);
        parent.collapsed = false;
      } else if (to)
        to.list.splice(to.index + (mode === "before" ? 0 : 1), 0, b);
      else blocks.push(b);
    });
    setSelected(data.id);
  }
  function selectBlockGlobal(id: string) {
    if (!project) return;
    for (const f of project.files)
      for (const m of f.methods) {
        if (findBlock(m.blocks, id)) {
          setFileId(f.id);
          setMethodId(m.id);
          setSelected(id);
          edit((p) => {
            const method = p.files
              .find((x) => x.id === f.id)!
              .methods.find((x) => x.id === m.id)!;
            const expand = (bs: Block[]): boolean => {
              let has = false;
              for (const b of bs) {
                const descendant = expand(b.children) || expand(b.otherwise);
                if (descendant) b.collapsed = false;
                if (b.id === id || descendant) has = true;
              }
              return has;
            };
            expand(method.blocks);
          });
          return;
        }
      }
  }
  async function runBuild() {
    if (!project || buildBusy.current) return;
    buildBusy.current = true;
    setBuilding(true);
    setConsoleOpen(true);
    setConsoleTab("output");
    const snapshot = JSON.stringify(project);
    try {
      const result = await api("/build", { project });
      setBuild(result);
      setBuiltSnapshot(snapshot);
      setConsoleTab(result.success ? "output" : "problems");
      notify(
        result.success
          ? "Build succeeded · " + result.name + ".dll"
          : "Build failed. Select a diagnostic to inspect its block.",
      );
    } catch (e: any) {
      notify(e.message);
    } finally {
      buildBusy.current = false;
      setBuilding(false);
    }
  }
  async function exportSource() {
    if (!project) return;
    try {
      const r = await fetch("/api/export/source", {
        method: "POST",
        headers: { "Content-Type": "application/json", "X-BlockForge": "1" },
        body: JSON.stringify({ project }),
      });
      if (!r.ok) throw new Error((await r.json()).error);
      download(await r.blob(), project.name + "-source.zip");
      notify("C# source project exported.");
    } catch (e: any) {
      notify(e.message);
    }
  }
  function exportProject() {
    if (project)
      download(
        new Blob([JSON.stringify(project, null, 2)], {
          type: "application/json",
        }),
        project.name + ".blockforge.json",
      );
  }
  async function importProject(file: File) {
    const p = JSON.parse(await file.text());
    validateProject(p);
    await save();
    activate(await api("/projects", { project: p }));
    notify("Visual project imported.");
  }
  function addApi(m: ApiMember) {
    const argument = (p: any): Expr =>
      p.type === "string"
        ? literal("")
        : p.type === "bool"
          ? literal(false)
          : [
                "int",
                "float",
                "double",
                "long",
                "short",
                "byte",
                "uint",
                "System.Int64",
                "System.UInt32",
              ].includes(p.type)
            ? literal(0)
            : { kind: "raw", value: "default(" + p.type + ")" };
    const required = m.parameters.filter((p) => !p.optional),
      values = required.map(argument);
    let b: Block;
    if (m.kind === "constructor")
      b = block("new", {
        type: m.type,
        name: "new" + m.type.split(".").pop(),
        args: values,
        _argNames: required.map((p) => p.name + " · " + p.type),
        _apiDescription: m.description,
      }) as Block;
    else if (m.kind === "property")
      b = block("variable", {
        type: "var",
        name: m.name.charAt(0).toLowerCase() + m.name.slice(1),
        value: ref((m.isStatic ? m.type : "instance") + "." + m.name),
        _apiDescription: m.description,
      }) as Block;
    else
      b = block("api", {
        target: m.isStatic ? "" : "instance",
        member: (m.isStatic ? m.type + "." : "") + m.name,
        args: values,
        result: m.returnType === "void" ? "" : "result",
        _argNames: required.map((p) => p.name + " · " + p.type),
        _apiDescription: m.description,
      }) as Block;
    const dep =
      m.assembly === "LemonUI.SHVDN3"
        ? "lemon"
        : m.assembly === "iFruitAddon2"
          ? "ifruit"
          : null;
    if (dep && project && !project.frameworks.includes(dep))
      edit((p) => p.frameworks.push(dep));
    insertBlock(b);
    if (!m.isStatic) notify("Set the instance target in the inspector.");
  }
  const actions = useRef<any>({});
  actions.current = {
    save,
    runBuild,
    openPalette,
    undo: store.undo,
    redo: store.redo,
    blockAction,
    setSidebar,
    setSidebarOpen,
    setModal,
    modal,
  };
  useEffect(() => {
    const key = (e: KeyboardEvent) => {
      const a = actions.current;
      const input =
        e.target instanceof HTMLElement &&
        (["INPUT", "TEXTAREA", "SELECT"].includes(e.target.tagName) ||
          e.target.isContentEditable);
      if (e.ctrlKey && e.key.toLowerCase() === "s") {
        e.preventDefault();
        a.save().catch((err: any) => notify(err.message));
      } else if (e.ctrlKey && e.key.toLowerCase() === "b") {
        e.preventDefault();
        a.runBuild();
      } else if (e.ctrlKey && e.code === "Space") {
        e.preventDefault();
        a.openPalette();
      } else if (e.ctrlKey && e.shiftKey && e.key.toLowerCase() === "f") {
        e.preventDefault();
        a.setSidebar("search");
        a.setSidebarOpen(true);
      } else if (!input && !a.modal) {
        if (e.ctrlKey && e.key.toLowerCase() === "z") {
          e.preventDefault();
          e.shiftKey ? a.redo() : a.undo();
        } else if (e.ctrlKey && e.key.toLowerCase() === "y") {
          e.preventDefault();
          a.redo();
        } else if (e.ctrlKey && e.key.toLowerCase() === "d") {
          e.preventDefault();
          a.blockAction("duplicate");
        } else if (e.key === "Delete") {
          e.preventDefault();
          a.blockAction("delete");
        }
      }
    };
    document.addEventListener("keydown", key);
    return () => document.removeEventListener("keydown", key);
  }, []);
  if (!project || !activeFile || !activeMethod)
    return (
      <div className="loading-screen">
        <div className="brand-mark">
          <Blocks size={26} />
        </div>
        <h1>BlockForge</h1>
        <p>{store.error || "Opening your workspace…"}</p>
        {store.error && (
          <button className="primary" onClick={() => location.reload()}>
            Retry connection
          </button>
        )}
      </div>
    );
  const file = activeFile,
    m = activeMethod;
  const changeSidebar = (s: string) => {
    setSidebar(s);
    setSidebarOpen(true);
  };
  return (
    <div className="app-shell">
      <header className="topbar">
        <div className="brand">
          <div className="brand-mark">
            <Blocks size={18} />
          </div>
          <strong>BlockForge</strong>
          <span>STUDIO</span>
        </div>
        <div className="top-divider" />
        <button className="project-picker" onClick={() => setModal("open")}>
          {project.name}
          <ChevronDown size={13} />
        </button>
        <span className="project-version">v{project.version}</span>
        <div className="top-spacer" />
        <button className="command-trigger" onClick={() => openPalette()}>
          <Search size={14} />
          <span>Find a block or action</span>
          <kbd>Ctrl Space</kbd>
        </button>
        <button
          className="top-help"
          title="Help and shortcuts"
          onClick={() => setModal("help")}
        >
          <HelpCircle size={17} />
        </button>
        <span className="local-indicator">
          <span /> LOCAL
        </span>
      </header>
      <div className="workbench">
        <nav className="activity-bar" aria-label="Workspace sections">
          {[
            [FolderOpen, "explorer", "Project explorer"],
            [Blocks, "library", "Block library"],
            [Braces, "api", "Framework API browser"],
            [Search, "search", "Search project"],
          ].map(([Icon, id, title]: any) => (
            <button
              key={id}
              title={title}
              aria-label={title}
              className={sidebar === id && sidebarOpen ? "active" : ""}
              onClick={() => changeSidebar(id)}
            >
              <Icon size={21} />
            </button>
          ))}
          <div className="activity-spacer" />
          <button
            title="Frameworks and references"
            aria-label="Frameworks and references"
            onClick={() => setModal("frameworks")}
          >
            <Package size={21} />
          </button>
          <button
            title="Project settings"
            aria-label="Project settings"
            onClick={() => setModal("settings")}
          >
            <Settings2 size={21} />
          </button>
        </nav>
        {sidebarOpen && (
          <aside className="sidebar">
            {sidebar === "explorer" ? (
              <Explorer
                project={project}
                fileId={file.id}
                methodId={m.id}
                onSelect={selectMethod}
                onAddFile={() => setModal("file")}
                onAddMethod={() => setModal("newMethod")}
                onOpen={() => setModal("open")}
                onSettings={() => setModal("settings")}
              />
            ) : sidebar === "library" ? (
              <Library
                query={libraryQuery}
                setQuery={setLibraryQuery}
                onAdd={addKind}
              />
            ) : sidebar === "api" ? (
              <ApiBrowser
                catalog={catalog}
                onAdd={addApi}
                onReload={reloadCatalog}
              />
            ) : (
              <ProjectSearch
                project={project}
                onSelect={(f, m, b) => {
                  setFileId(f);
                  setMethodId(m);
                  selectBlockGlobal(b);
                }}
              />
            )}
          </aside>
        )}
        <main className="workspace">
          <div className="workspace-toolbar">
            <div className="toolbar-left">
              <button
                title={sidebarOpen ? "Hide sidebar" : "Show sidebar"}
                onClick={() => setSidebarOpen((v) => !v)}
              >
                <PanelLeftClose size={16} />
              </button>
              <div className="toolbar-divider" />
              <button
                title="Save project · Ctrl S"
                onClick={() => save().catch((e) => notify(e.message))}
              >
                <Save size={15} />
              </button>
              <button
                title="Undo · Ctrl Z"
                disabled={!store.canUndo}
                onClick={store.undo}
              >
                <Undo2 size={16} />
              </button>
              <button
                title="Redo · Ctrl Shift Z"
                disabled={!store.canRedo}
                onClick={store.redo}
              >
                <Redo2 size={16} />
              </button>
              <span
                className={
                  "save-indicator " +
                  (store.saveState === "Save failed" ? "error-text" : "")
                }
              >
                <span />
                {store.saveState}
              </span>
            </div>
            <div className="toolbar-right">
              <span className="build-target">
                Release <ChevronDown size={11} />
              </span>
              <button
                className="build-button"
                disabled={building}
                onClick={runBuild}
              >
                {building ? (
                  <Loader2 size={15} className="spin" />
                ) : (
                  <Hammer size={15} />
                )}{" "}
                {building ? "Building…" : "Build"}
                <kbd>Ctrl B</kbd>
              </button>
              <button
                className="primary release-button"
                onClick={() => setModal("release")}
              >
                <Upload size={14} /> Package mod
              </button>
            </div>
          </div>
          <div className="file-tabs">
            {project.files.map((f) => (
              <button
                key={f.id}
                className={file.id === f.id ? "active" : ""}
                onClick={() => selectMethod(f.id)}
              >
                <span className="cs-file">C#</span>
                {f.name}
                {file.id === f.id && <span className="tab-dot" />}
              </button>
            ))}
            <button
              title="New script"
              className="new-file-tab"
              onClick={() => setModal("file")}
            >
              <Plus size={15} />
            </button>
          </div>
          <div className="breadcrumb">
            <FolderOpen size={12} />
            {project.name}
            <ChevronRight size={12} />
            <span>{file.name}</span>
            <ChevronRight size={12} />
            <span className="breadcrumb-method">{m.name}</span>
            <div />
            <button
              title="Rename script"
              onClick={() => setModal("renameFile")}
            >
              <Pencil size={12} />
            </button>
            <button
              title="Import C# statements into a block"
              onClick={() => uploadSource.current?.click()}
            >
              <Download size={13} />
            </button>
            <button
              title="Delete script (undo available)"
              disabled={project.files.length < 2}
              onClick={() => {
                edit((p) => {
                  p.files = p.files.filter((f) => f.id !== file.id);
                });
                setFileId("");
                setMethodId("");
                setSelected(null);
              }}
            >
              <Trash2 size={12} />
            </button>
          </div>
          <div className="editor-area">
            <div className="editor-main">
              <div className="method-tabs">
                {file.methods.map((md) => (
                  <button
                    key={md.id}
                    className={m.id === md.id ? "active" : ""}
                    onClick={() => {
                      setMethodId(md.id);
                      setSelected(null);
                    }}
                  >
                    {md.event === "fields" ? (
                      <Braces size={12} />
                    ) : (
                      <Zap size={12} />
                    )}{" "}
                    {md.name}
                  </button>
                ))}
                <button
                  title="Add method"
                  onClick={() => setModal("newMethod")}
                >
                  <Plus size={13} />
                </button>
              </div>
              <div className="canvas-toolbar">
                <div>
                  <h1>
                    {m.event === "fields" ? "Class fields" : m.name}
                    <button
                      title="Configure method"
                      onClick={() => setModal("method")}
                    >
                      <ChevronDown size={13} />
                    </button>
                  </h1>
                  <p>
                    {m.event === "constructor"
                      ? "Runs once when your script loads."
                      : m.event === "tick"
                        ? "Runs each frame while your script is active."
                        : m.event === "keyDown"
                          ? "Respond to keyboard input."
                          : m.event === "fields"
                            ? "State shared across your script methods."
                            : "Arrange the behavior of this method."}
                  </p>
                </div>
                <div className="view-switch">
                  {[
                    [Blocks, "blocks", "Blocks"],
                    [Columns2, "split", "Split"],
                    [Code2, "code", "C#"],
                  ].map(([Icon, id, label]: any) => (
                    <button
                      key={id}
                      title={label + " view"}
                      className={view === id ? "active" : ""}
                      onClick={() => setView(id)}
                    >
                      <Icon size={14} />
                      <span>{label}</span>
                    </button>
                  ))}
                </div>
                <button
                  className="inspector-toggle"
                  title="Toggle inspector"
                  onClick={() => setInspectorOpen((v) => !v)}
                >
                  {inspectorOpen ? (
                    <PanelRightClose size={16} />
                  ) : (
                    <PanelRightOpen size={16} />
                  )}
                </button>
              </div>
              <div className={"canvas-and-code " + view}>
                {view !== "code" && (
                  <div className="canvas-container">
                    <div className="canvas-meta">
                      <span className="event-badge">
                        <Zap size={11} />
                        {m.event === "constructor"
                          ? "ON INITIALIZE"
                          : m.event.toUpperCase()}
                      </span>
                      <span>{m.blocks.length} root blocks</span>
                      <button
                        className="add-toolbar"
                        onClick={() => openPalette()}
                      >
                        <Plus size={13} /> Add block
                      </button>
                    </div>
                    <BlockCanvas
                      method={m}
                      selected={selected}
                      onSelect={setSelected}
                      onAdd={() => openPalette()}
                      onCollapse={(id) =>
                        editMethod((bs) => {
                          const b = findBlock(bs, id);
                          if (b) b.collapsed = !b.collapsed;
                        })
                      }
                      onDrop={dropBlock}
                      zoom={zoom}
                      errors={errorBlocks}
                    />
                    <div className="canvas-footer">
                      <span>
                        <GitBranch size={12} /> Visual C#
                      </span>
                      <div>
                        <button
                          title="Zoom out"
                          disabled={zoom <= 0.8}
                          onClick={() => setZoom((z) => Math.max(0.8, z - 0.1))}
                        >
                          <Minus size={12} />
                        </button>
                        <span>{Math.round(zoom * 100)}%</span>
                        <button
                          title="Zoom in"
                          disabled={zoom >= 1.4}
                          onClick={() => setZoom((z) => Math.min(1.4, z + 0.1))}
                        >
                          <Plus size={12} />
                        </button>
                      </div>
                    </div>
                  </div>
                )}
                {view !== "blocks" && (
                  <CodePane
                    source={generatedFile.source}
                    name={file.name}
                    map={generatedFile.map}
                    selected={selected}
                    diagnostics={
                      isCurrentBuild ? diagnostics : generated.diagnostics
                    }
                    onSelect={selectBlockGlobal}
                    onCopy={() =>
                      navigator.clipboard
                        .writeText(generatedFile.source)
                        .then(() => notify("C# source copied."))
                        .catch(() =>
                          notify(
                            "Clipboard unavailable. Export the C# project instead.",
                          ),
                        )
                    }
                  />
                )}
              </div>
            </div>
            {inspectorOpen && view !== "code" && (
              <Inspector
                block={currentBlock}
                method={m}
                variables={variables}
                onChange={changeValue}
                onAction={blockAction}
                onAddInside={(branch) => openPalette(selected, branch)}
                onEditMethod={() => setModal("method")}
              />
            )}
          </div>
          <div className={"console " + (consoleOpen ? "open" : "collapsed")}>
            <div className="console-tabs">
              <button
                className={consoleTab === "problems" ? "active" : ""}
                onClick={() => {
                  setConsoleTab("problems");
                  setConsoleOpen(true);
                }}
              >
                Problems{" "}
                <span className={errorCount ? "error-count" : ""}>
                  {errorCount + warningCount}
                </span>
              </button>
              <button
                className={consoleTab === "output" ? "active" : ""}
                onClick={() => {
                  setConsoleTab("output");
                  setConsoleOpen(true);
                }}
              >
                Build output
              </button>
              <div />
              <span className="compiler-label">Roslyn C# compiler</span>
              <button
                title={consoleOpen ? "Collapse output" : "Expand output"}
                onClick={() => setConsoleOpen((v) => !v)}
              >
                <ChevronDown
                  size={14}
                  style={{ transform: consoleOpen ? "" : "rotate(180deg)" }}
                />
              </button>
            </div>
            {consoleOpen && (
              <div className="console-content">
                {consoleTab === "problems" ? (
                  diagnostics.length ? (
                    diagnostics.map((d, i) => (
                      <button
                        className={"diagnostic " + d.severity}
                        key={i}
                        onClick={() => {
                          if (d.blockId) selectBlockGlobal(d.blockId);
                          else if (d.file) {
                            const f = project.files.find(
                              (f) => f.name === d.file,
                            );
                            if (f) selectMethod(f.id);
                            setView("code");
                          }
                        }}
                      >
                        {d.severity === "error" ? (
                          <AlertCircle size={13} />
                        ) : (
                          <AlertTriangle size={13} />
                        )}
                        <code>{d.code}</code>
                        <span>{d.message}</span>
                        <small>
                          {d.file}
                          {d.line ? ":" + d.line : ""}
                        </small>
                      </button>
                    ))
                  ) : (
                    <div className="console-empty">
                      <CheckCircle2 size={16} />
                      <div>
                        <strong>
                          {isCurrentBuild && build?.success
                            ? "No compiler errors or warnings"
                            : "No structural problems detected"}
                        </strong>
                        <span>
                          {isCurrentBuild && build?.success
                            ? "Compiled successfully against your installed framework assemblies."
                            : "Build your project to check C# types and framework calls."}
                        </span>
                      </div>
                      <kbd>Ctrl B</kbd>
                    </div>
                  )
                ) : (
                  <div className="build-output">
                    {building ? (
                      <p>
                        <Loader2 size={13} className="spin" /> Compiling{" "}
                        {project.name}.dll with Roslyn…
                      </p>
                    ) : build ? (
                      <>
                        <p
                          className={
                            build.success ? "success-text" : "error-text"
                          }
                        >
                          {build.success
                            ? "✓ BUILD SUCCEEDED"
                            : "✕ BUILD FAILED"}{" "}
                          · {build.name}.dll ·{" "}
                          {(build.duration / 1000).toFixed(2)}s ·{" "}
                          {build.lineCount.toLocaleString()} lines{" "}
                          {!isCurrentBuild && "· SOURCE CHANGED SINCE BUILD"}
                        </p>
                        <pre>
                          {build.output ||
                            "Compiler completed without diagnostics."}
                        </pre>
                        <span>
                          {new Date(build.builtAt).toLocaleString()} · Release ·
                          .NET Framework 4.8
                        </span>
                      </>
                    ) : (
                      <p>
                        <Terminal size={14} /> Build your project to see
                        compiler output here.
                      </p>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        </main>
      </div>
      <footer className="statusbar">
        <span className="status-branch">
          <GitBranch size={12} /> Local workspace
        </span>
        <button
          onClick={() => {
            setConsoleOpen(true);
            setConsoleTab("problems");
          }}
        >
          <AlertCircle size={12} /> {errorCount}
          <AlertTriangle size={12} /> {warningCount}
        </button>
        <span className="status-spacer" />
        {generating ? (
          <span>Generating…</span>
        ) : (
          <span>{generated.lineCount.toLocaleString()} lines</span>
        )}
        <span>{totalBlocks.toLocaleString()} blocks</span>
        <span>
          {project.files.length} script{project.files.length === 1 ? "" : "s"}
        </span>
        <button onClick={() => setModal("frameworks")}>SHVDN 3 · net48</button>
        <span className="compiler-status">
          <span className={status?.compiler ? "good" : ""} />
          {status?.compiler ? "Compiler ready" : "Checking compiler"}
        </span>
      </footer>
      {(toast || store.error) && (
        <div role="status" className={"toast " + (store.error ? "error" : "")}>
          <AlertCircle size={16} />
          <span>{store.error || toast}</span>
          <button
            title="Dismiss message"
            onClick={() => {
              setToast("");
              store.setError("");
            }}
          >
            <X size={14} />
          </button>
        </div>
      )}
      {modal === "palette" && (
        <Palette
          onClose={() => setModal("")}
          onAdd={addKind}
          insertion={
            (insertion?.mode === "children" || insertion?.mode === "inside"
              ? "Inside selected block"
              : insertion?.mode === "otherwise"
                ? "In the alternate branch"
                : insertion?.target
                  ? "After selected block"
                  : "At the end of") +
            " · " +
            m.name
          }
        />
      )}
      {modal === "new" && (
        <NewProjectDialog
          onClose={() => setModal("")}
          onCreate={async (name, template) => {
            await save();
            activate(await api("/projects", { name, template }));
          }}
          onImport={importProject}
        />
      )}
      {modal === "open" && (
        <OpenProjectDialog
          onClose={() => setModal("")}
          onOpen={async (id) => {
            await save();
            activate(await api("/projects/" + id));
          }}
          onNew={() => setModal("new")}
        />
      )}
      {modal === "settings" && (
        <SettingsDialog
          project={project}
          onClose={() => setModal("")}
          onApply={(p) => {
            edit((current) => Object.assign(current, p));
            setModal("");
          }}
        />
      )}
      {modal === "method" && (
        <MethodDialog
          method={m}
          file={file}
          onClose={() => setModal("")}
          onApply={(updated) => {
            edit((p) => {
              const ms = p.files.find((f) => f.id === file.id)!.methods;
              ms[ms.findIndex((md) => md.id === m.id)] = updated;
            });
            setModal("");
          }}
          onDelete={() => {
            edit((p) => {
              const f = p.files.find((f) => f.id === file.id)!;
              f.methods = f.methods.filter((md) => md.id !== m.id);
              if (!f.methods.length)
                f.methods.push(method("Initialize", "constructor") as any);
            });
            setMethodId("");
            setSelected(null);
            setModal("");
          }}
        />
      )}
      {modal === "newMethod" && (
        <NameDialog
          title="New method"
          label="Method name"
          initial="DoWork"
          onClose={() => setModal("")}
          onSubmit={(name) => {
            if (file.methods.some((md) => md.name === name))
              throw new Error("A method with this name exists.");
            const md = method(name) as any;
            edit((p) =>
              p.files.find((f) => f.id === file.id)!.methods.push(md),
            );
            setMethodId(md.id);
            setSelected(null);
            setModal("method");
          }}
        />
      )}
      {(modal === "file" || modal === "renameFile") && (
        <NameDialog
          title={modal === "file" ? "New script" : "Rename script"}
          label="Class name · .cs extension is added automatically"
          initial={modal === "file" ? "NewScript" : file.className}
          onClose={() => setModal("")}
          onSubmit={(name) => {
            if (
              project.files.some(
                (f) =>
                  f.name.toLowerCase() === (name + ".cs").toLowerCase() &&
                  (modal === "file" || f.id !== file.id),
              )
            )
              throw new Error("A script with this name exists.");
            if (modal === "file") {
              const f = script(name) as any;
              edit((p) => p.files.push(f));
              selectMethod(f.id);
            } else
              edit((p) => {
                const f = p.files.find((f) => f.id === file.id)!;
                f.name = name + ".cs";
                f.className = name;
              });
            setModal("");
          }}
        />
      )}
      {modal === "frameworks" && (
        <FrameworkDialog
          project={project}
          status={status}
          onClose={() => setModal("")}
          onToggle={(id) =>
            edit((p) => {
              p.frameworks = p.frameworks.includes(id)
                ? p.frameworks.filter((f) => f !== id)
                : [...p.frameworks, id];
            })
          }
          onAddReference={(name, enabled) =>
            edit((p) => {
              p.references = enabled
                ? [...new Set([...p.references, name])]
                : p.references.filter((r) => r !== name);
            })
          }
          onCatalogReload={reloadCatalog}
        />
      )}
      {modal === "release" && (
        <ReleaseDialog
          project={project}
          build={build}
          current={isCurrentBuild}
          onClose={() => setModal("")}
          onBuild={() => {
            setModal("");
            runBuild();
          }}
          onSource={exportSource}
          onProject={exportProject}
        />
      )}
      {modal === "help" && <HelpDialog onClose={() => setModal("")} />}
      <input
        hidden
        ref={uploadSource}
        type="file"
        accept=".cs,.txt"
        onChange={async (e) => {
          const file = e.target.files?.[0];
          if (file) {
            const text = await file.text();
            if (text.length > 16 * 1024 * 1024) {
              notify("Source import is limited to 16 MB.");
              return;
            }
            insertBlock(
              block(m.event === "fields" ? "member" : "raw", {
                code: text,
              }) as Block,
            );
            notify(
              "Imported as C# " +
                (m.event === "fields" ? "class members" : "statements") +
                ". Full files must be adapted to the current scope.",
            );
          }
          e.target.value = "";
        }}
      />
    </div>
  );
}
