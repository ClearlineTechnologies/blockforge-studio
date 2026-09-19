import { useState, useEffect, useRef } from "react";
import {
  X,
  Plus,
  Search,
  Layers,
  PanelTop,
  Phone,
  FileCode2,
  FolderOpen,
  Upload,
  Check,
  Package,
  ArrowUpRight,
  Download,
  CheckCircle2,
  AlertCircle,
  Keyboard,
  BookOpen,
} from "lucide-react";
import type { Project, BuildResult, Method, ScriptFile } from "./types";
import { definitions, validateProject } from "../shared/model.mjs";
import { api } from "./useProject";
import { BlockIcon, categoryClass } from "./BlockCanvas";
export function Modal({
  title,
  subtitle,
  children,
  onClose,
  wide = false,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  onClose: () => void;
  wide?: boolean;
}) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const previous = document.activeElement as HTMLElement;
    const el = ref.current;
    const input = el?.querySelector<HTMLElement>(
      "input,select,textarea,button",
    );
    input?.focus();
    const key = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "Tab" && el) {
        const items = Array.from(
          el.querySelectorAll<HTMLElement>(
            'button:not(:disabled),a[href],input,textarea,select,[tabindex="0"]',
          ),
        );
        const first = items[0],
          last = items[items.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          last?.focus();
          e.preventDefault();
        } else if (!e.shiftKey && document.activeElement === last) {
          first?.focus();
          e.preventDefault();
        }
      }
    };
    document.addEventListener("keydown", key);
    return () => {
      document.removeEventListener("keydown", key);
      previous?.focus();
    };
  }, []);
  return (
    <div
      className="modal-backdrop"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        ref={ref}
        className={"modal " + (wide ? "wide" : "")}
        role="dialog"
        aria-modal="true"
        aria-label={title}
      >
        <div className="modal-header">
          <div>
            <h2>{title}</h2>
            {subtitle && <p>{subtitle}</p>}
          </div>
          <button title="Close dialog" onClick={onClose}>
            <X size={19} />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}
export function Palette({
  onClose,
  onAdd,
  insertion,
}: {
  onClose: () => void;
  onAdd: (kind: string) => void;
  insertion: string;
}) {
  const [q, setQ] = useState("");
  const ds = definitions.filter((d) =>
    (d.label + " " + d.category).toLowerCase().includes(q.toLowerCase()),
  );
  return (
    <Modal title="Add a block" subtitle={insertion} onClose={onClose}>
      <div className="palette-search">
        <Search size={18} />
        <input
          autoFocus
          placeholder="Search blocks, frameworks, and actions…"
          aria-label="Find block to add"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && ds[0]) onAdd(ds[0].kind);
          }}
        />
        <kbd>ESC</kbd>
      </div>
      <div className="palette-results">
        {ds.map((d) => (
          <button
            key={d.kind}
            className={"palette-result " + categoryClass(d.category)}
            onClick={() => onAdd(d.kind)}
          >
            <span className="block-symbol">
              <BlockIcon kind={d.kind} />
            </span>
            <div>
              <strong>{d.label}</strong>
              <span>{d.category}</span>
            </div>
            <Plus size={15} />
          </button>
        ))}
        {!ds.length && (
          <p className="empty-message">
            No matching block. Try the framework API browser for more members.
          </p>
        )}
      </div>
      <div className="modal-note">
        Choose a block to place it in your method. Its properties open in the
        inspector.
      </div>
    </Modal>
  );
}
export function NewProjectDialog({
  onClose,
  onCreate,
  onImport,
}: {
  onClose: () => void;
  onCreate: (name: string, template: string) => Promise<void>;
  onImport: (f: File) => Promise<void>;
}) {
  const [name, setName] = useState("MyMod"),
    [template, setTemplate] = useState("starter"),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false);
  const input = useRef<HTMLInputElement>(null);
  return (
    <Modal
      title="Create a project"
      subtitle="Start with a working foundation for your next GTA V mod."
      onClose={onClose}
      wide
    >
      <form
        onSubmit={async (e) => {
          e.preventDefault();
          if (!/^[A-Za-z_]\w{0,79}$/.test(name)) {
            setError(
              "Use a name with letters, numbers, and underscores, starting with a letter.",
            );
            return;
          }
          setBusy(true);
          try {
            await onCreate(name, template);
          } catch (e: any) {
            setError(e.message);
          } finally {
            setBusy(false);
          }
        }}
      >
        <label className="field">
          <span>Project name</span>
          <input
            autoFocus
            aria-label="Project name"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        </label>
        <div className="section-label">PROJECT TEMPLATE</div>
        <div className="template-grid">
          {[
            [
              Layers,
              "starter",
              "Essentials",
              "A working F7 menu and vehicle repair action.",
            ],
            [
              PanelTop,
              "menu",
              "LemonUI menu",
              "A menu, tick processing, and click handler.",
            ],
            [
              Phone,
              "phone",
              "Phone contact",
              "An iFruit contact with an answered callback.",
            ],
            [
              FileCode2,
              "blank",
              "Empty script",
              "Script lifecycle handlers, ready for your logic.",
            ],
          ].map(([Icon, id, title, desc]: any) => (
            <button
              type="button"
              key={id}
              className={"template " + (template === id ? "selected" : "")}
              onClick={() => setTemplate(id)}
            >
              <Icon size={21} />
              <strong>{title}</strong>
              <span>{desc}</span>
              {template === id && <Check size={15} />}
            </button>
          ))}
        </div>
        {error && <p className="inline-error">{error}</p>}
        <div className="modal-footer">
          <button
            type="button"
            className="subtle"
            onClick={() => input.current?.click()}
          >
            <Upload size={14} /> Import project
          </button>
          <button disabled={busy} className="primary" type="submit">
            <Plus size={15} />
            {busy ? "Creating…" : "Create project"}
          </button>
        </div>
        <input
          ref={input}
          hidden
          type="file"
          accept=".json,.blockforge"
          onChange={async (e) => {
            if (e.target.files?.[0])
              try {
                await onImport(e.target.files[0]);
              } catch (e: any) {
                setError(e.message);
              }
          }}
        />
      </form>
    </Modal>
  );
}
export function OpenProjectDialog({
  onClose,
  onOpen,
  onNew,
}: {
  onClose: () => void;
  onOpen: (id: string) => Promise<void>;
  onNew: () => void;
}) {
  const [list, setList] = useState<any[]>([]),
    [error, setError] = useState("");
  useEffect(() => {
    api("/projects")
      .then(setList)
      .catch((e) => setError(e.message));
  }, []);
  return (
    <Modal
      title="Open project"
      subtitle="Projects are saved locally on this computer."
      onClose={onClose}
    >
      <div className="project-list">
        {list.map((p) => (
          <button
            key={p.id}
            onClick={() => onOpen(p.id).catch((e) => setError(e.message))}
          >
            <FolderOpen size={22} />
            <div>
              <strong>{p.name}</strong>
              <span>
                {p.files} script{p.files === 1 ? "" : "s"} · v{p.version}
              </span>
            </div>
            <ChevronIcon />
          </button>
        ))}
      </div>
      {error && <p className="inline-error">{error}</p>}
      <div className="modal-footer">
        <button className="primary" onClick={onNew}>
          <Plus size={15} /> New project
        </button>
      </div>
    </Modal>
  );
}
const ChevronIcon = () => <ArrowUpRight size={16} />;
export function SettingsDialog({
  project,
  onClose,
  onApply,
}: {
  project: Project;
  onClose: () => void;
  onApply: (p: Project) => void;
}) {
  const [p, setP] = useState(structuredClone(project)),
    [error, setError] = useState("");
  return (
    <Modal
      title="Project settings"
      subtitle="Assembly identity and release metadata."
      onClose={onClose}
    >
      <form
        onSubmit={(e) => {
          e.preventDefault();
          try {
            validateProject(p);
            onApply(p);
          } catch (e: any) {
            setError(e.message);
          }
        }}
      >
        {[
          ["name", "Assembly name"],
          ["namespace", "Namespace"],
          ["version", "Version"],
          ["author", "Author"],
        ].map(([key, label]) => (
          <label className="field" key={key}>
            <span>{label}</span>
            <input
              value={(p as any)[key]}
              onChange={(e) => setP({ ...p, [key]: e.target.value })}
            />
          </label>
        ))}
        <label className="field">
          <span>Description</span>
          <textarea
            value={p.description}
            rows={3}
            onChange={(e) => setP({ ...p, description: e.target.value })}
          />
        </label>
        <label className="field">
          <span>Additional using namespaces · one per line</span>
          <textarea
            className="mono"
            rows={3}
            value={p.usings.join("\n")}
            onChange={(e) =>
              setP({
                ...p,
                usings: e.target.value
                  .split("\n")
                  .map((x) => x.trim())
                  .filter(Boolean),
              })
            }
          />
        </label>
        <div className="info-banner">
          <FileCode2 size={16} />
          <span>Target: C# · .NET Framework 4.8 · ScriptHookVDotNet 3</span>
        </div>
        {error && <p className="inline-error">{error}</p>}
        <div className="modal-footer">
          <button type="button" className="subtle" onClick={onClose}>
            Cancel
          </button>
          <button type="submit" className="primary">
            Apply settings
          </button>
        </div>
      </form>
    </Modal>
  );
}
export function MethodDialog({
  method,
  file,
  onClose,
  onApply,
  onDelete,
}: {
  method: Method;
  file: ScriptFile;
  onClose: () => void;
  onApply: (m: Method) => void;
  onDelete: () => void;
}) {
  const [m, setM] = useState({ ...method }),
    [error, setError] = useState("");
  return (
    <Modal title="Configure method" subtitle={file.name} onClose={onClose}>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (!/^[A-Za-z_]\w*$/.test(m.name)) {
            setError("Enter a valid C# method name.");
            return;
          }
          if (file.methods.some((x) => x.id !== m.id && x.name === m.name)) {
            setError("A method with that name already exists.");
            return;
          }
          onApply(m);
        }}
      >
        <label className="field">
          <span>Method name</span>
          <input
            value={m.name}
            onChange={(e) => setM({ ...m, name: e.target.value })}
          />
        </label>
        <label className="field">
          <span>Handler type</span>
          <select
            value={m.event}
            onChange={(e) => setM({ ...m, event: e.target.value })}
          >
            {[
              ["fields", "Class fields"],
              ["constructor", "Script initialization"],
              ["tick", "Tick · every frame"],
              ["keyDown", "Key down"],
              ["keyUp", "Key up"],
              ["aborted", "Script aborted"],
              ["menuClick", "LemonUI item activated"],
              ["phoneAnswered", "iFruit contact answered"],
              ["method", "Custom method"],
            ].map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </label>
        {m.event === "method" && (
          <>
            <label className="field">
              <span>Return type</span>
              <input
                value={m.returnType}
                onChange={(e) => setM({ ...m, returnType: e.target.value })}
              />
            </label>
            <label className="field">
              <span>Parameters · C# declarations, comma separated</span>
              <input
                className="mono"
                value={m.parameters}
                placeholder="int amount, string message"
                onChange={(e) => setM({ ...m, parameters: e.target.value })}
              />
            </label>
          </>
        )}
        {error && <p className="inline-error">{error}</p>}
        <div className="modal-footer">
          <button type="button" className="danger" onClick={onDelete}>
            Delete method
          </button>
          <button type="submit" className="primary">
            Apply
          </button>
        </div>
      </form>
    </Modal>
  );
}
export function NameDialog({
  title,
  label,
  initial,
  onClose,
  onSubmit,
}: {
  title: string;
  label: string;
  initial: string;
  onClose: () => void;
  onSubmit: (name: string) => void;
}) {
  const [name, setName] = useState(initial),
    [error, setError] = useState("");
  return (
    <Modal title={title} onClose={onClose}>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          try {
            if (!/^[A-Za-z_]\w*$/.test(name))
              throw new Error(
                "Use letters, numbers, and underscores, starting with a letter.",
              );
            onSubmit(name);
          } catch (e: any) {
            setError(e.message);
          }
        }}
      >
        <label className="field">
          <span>{label}</span>
          <input
            autoFocus
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        </label>
        {error && <p className="inline-error">{error}</p>}
        <div className="modal-footer">
          <button type="submit" className="primary">
            Create
          </button>
        </div>
      </form>
    </Modal>
  );
}
export function FrameworkDialog({
  project,
  status,
  onToggle,
  onAddReference,
  onClose,
  onCatalogReload,
}: {
  project: Project;
  status: any;
  onToggle: (id: string) => void;
  onAddReference: (name: string, enabled: boolean) => void;
  onClose: () => void;
  onCatalogReload: () => void;
}) {
  const [references, setReferences] = useState<string[]>([]),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false);
  const upload = useRef<HTMLInputElement>(null);
  useEffect(() => {
    api("/references")
      .then(setReferences)
      .catch((e) => setError(e.message));
  }, []);
  return (
    <Modal
      title="Frameworks & references"
      subtitle="Real assemblies, real API signatures. Enable only what your mod uses."
      onClose={onClose}
      wide
    >
      <div className="framework-list">
        {(status?.frameworks || []).map((f: any) => (
          <div className="framework-card" key={f.id}>
            <span className={"framework-logo " + f.id}>
              {f.id === "shvdn" ? "C#" : f.id === "lemon" ? "L" : "iF"}
            </span>
            <div>
              <strong>
                {f.name} <small>{f.version}</small>
              </strong>
              <span>{f.file}</span>
              <small className={f.installed ? "success-text" : "error-text"}>
                {f.installed ? "Installed locally" : "Missing assembly"}
              </small>
            </div>
            <label className="switch">
              <input
                aria-label={"Enable " + f.name}
                type="checkbox"
                disabled={f.id === "shvdn" || !f.installed}
                checked={project.frameworks.includes(f.id)}
                onChange={() => onToggle(f.id)}
              />
              <span />
            </label>
          </div>
        ))}
      </div>
      <div className="section-label">ADDITIONAL .NET FRAMEWORK ASSEMBLIES</div>
      <p className="muted">
        Add compatible GTA V libraries or your own DLLs. Public methods,
        properties, and constructors become available in the API browser.
        Runtime compatibility depends on the library.
      </p>
      {references.map((r) => (
        <label className="custom-reference" key={r}>
          <Package size={16} />
          <span>{r}</span>
          <input
            type="checkbox"
            checked={project.references.includes(r)}
            onChange={(e) => onAddReference(r, e.target.checked)}
          />
        </label>
      ))}
      <button
        className="subtle full"
        disabled={busy}
        onClick={() => upload.current?.click()}
      >
        <Upload size={15} />
        {busy ? "Reading assembly metadata…" : "Import reference DLL"}
      </button>
      <input
        ref={upload}
        hidden
        type="file"
        accept=".dll"
        onChange={async (e) => {
          const file = e.target.files?.[0];
          if (!file) return;
          setBusy(true);
          setError("");
          try {
            const fd = new FormData();
            fd.append("file", file);
            const r = await fetch("/api/references", {
              method: "POST",
              headers: { "X-BlockForge": "1" },
              body: fd,
            });
            const result = await r.json();
            if (!r.ok) throw new Error(result.error);
            setReferences(await api("/references"));
            onAddReference(result.file, true);
            onCatalogReload();
          } catch (err: any) {
            setError(err.message);
          } finally {
            setBusy(false);
            e.target.value = "";
          }
        }}
      />
      {error && <p className="inline-error">{error}</p>}
      <div className="modal-note">
        API catalog reads metadata without running imported DLL code.
      </div>
      <div className="modal-footer">
        <button className="primary" onClick={onClose}>
          Done
        </button>
      </div>
    </Modal>
  );
}
export function ReleaseDialog({
  project,
  build,
  current,
  onClose,
  onBuild,
  onSource,
  onProject,
}: {
  project: Project;
  build: BuildResult | null;
  current: boolean;
  onClose: () => void;
  onBuild: () => void;
  onSource: () => void;
  onProject: () => void;
}) {
  const ready = build?.success && current;
  return (
    <Modal
      title="Package your mod"
      subtitle="Create a release archive for distribution, or export editable source."
      onClose={onClose}
      wide
    >
      <div className="release-identity">
        <div className="release-icon">
          <Package size={30} />
        </div>
        <div>
          <h3>{project.name}</h3>
          <span>Version {project.version} · .NET Framework 4.8</span>
        </div>
        <span className={"build-pill " + (ready ? "success" : "")}>
          {ready ? <CheckCircle2 size={13} /> : <AlertCircle size={13} />}{" "}
          {ready ? "Build verified" : "Build required"}
        </span>
      </div>
      <div className="release-files">
        <span>RELEASE CONTENTS</span>
        <code>scripts/{project.name}.dll</code>
        <code>
          README.md <small>Installation & dependencies</small>
        </code>
        <code>
          manifest.json <small>Version & source fingerprint</small>
        </code>
      </div>
      <p className="muted">
        Framework runtimes are listed as prerequisites. Test the compiled mod in
        your target GTA V edition and game build before uploading it to a mod
        hosting site.
      </p>
      {ready ? (
        <a
          className="primary full"
          href={"/api/builds/" + build.id + "/release"}
          download
        >
          <Download size={16} /> Download release ZIP
        </a>
      ) : (
        <button className="primary full" onClick={onBuild}>
          Build current project
        </button>
      )}
      <div className="export-options">
        <button className="subtle" onClick={onSource}>
          <FileCode2 size={16} /> Export C# project
        </button>
        <button className="subtle" onClick={onProject}>
          <Layers size={16} /> Export visual project
        </button>
      </div>
      <div className="modal-note">
        Release packaging is local. Uploading or publishing to a hosting service
        is a separate step.
      </div>
    </Modal>
  );
}
export function HelpDialog({ onClose }: { onClose: () => void }) {
  return (
    <Modal
      title="Your modding workspace"
      subtitle="Write behavior with blocks. Build and ship real C#."
      onClose={onClose}
      wide
    >
      <div className="help-steps">
        {[
          [
            "01",
            "Choose a method",
            "Use Initialize for startup, OnTick for frame updates, and OnKeyDown for keyboard input.",
          ],
          [
            "02",
            "Place and connect syntax",
            "Click blocks in the library or drag them into a method. Use the inspector to choose values and comparisons. Nest blocks with “Add inside this block.”",
          ],
          [
            "03",
            "Build, fix, and package",
            "Build uses Roslyn and your actual reference DLLs. Click compiler errors to select the responsible block. Package a successful build as a release ZIP.",
          ],
        ].map(([n, title, desc]) => (
          <div key={n}>
            <span>{n}</span>
            <div>
              <strong>{title}</strong>
              <p>{desc}</p>
            </div>
          </div>
        ))}
      </div>
      <div className="section-label">
        <Keyboard size={13} /> KEYBOARD SHORTCUTS
      </div>
      <div className="shortcut-grid">
        {[
          ["Ctrl S", "Save project"],
          ["Ctrl B", "Build DLL"],
          ["Ctrl Space", "Add block"],
          ["Ctrl Z", "Undo"],
          ["Ctrl Shift Z", "Redo"],
          ["Ctrl D", "Duplicate block"],
          ["Delete", "Delete selected block"],
          ["Ctrl Shift F", "Search project"],
        ].map(([key, label]) => (
          <div key={key}>
            <span>{label}</span>
            <kbd>{key}</kbd>
          </div>
        ))}
      </div>
      <div className="help-links">
        <a
          href="https://github.com/scripthookvdotnet/scripthookvdotnet"
          target="_blank"
          rel="noreferrer"
        >
          <BookOpen size={14} /> SHVDN documentation <ArrowUpRight size={13} />
        </a>
        <a
          href="https://github.com/LemonUIbyLemon/LemonUI/wiki/Quick-Start"
          target="_blank"
          rel="noreferrer"
        >
          LemonUI guide <ArrowUpRight size={13} />
        </a>
        <a
          href="https://github.com/Bob74/iFruitAddon2"
          target="_blank"
          rel="noreferrer"
        >
          iFruitAddon2 <ArrowUpRight size={13} />
        </a>
      </div>
    </Modal>
  );
}
