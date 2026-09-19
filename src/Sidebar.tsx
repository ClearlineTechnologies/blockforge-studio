import { useMemo, useRef, useState } from "react";
import { useVirtualizer } from "@tanstack/react-virtual";
import {
  Folder,
  FileCode2,
  Plus,
  ChevronDown,
  ChevronRight,
  Zap,
  Box,
  Search,
  Braces,
  Layers,
  ArrowUpRight,
  Package,
  CheckCircle2,
} from "lucide-react";
import { definitions, categories, registry, walk } from "../shared/model.mjs";
import { BlockIcon, categoryClass, summary } from "./BlockCanvas";
import type { Project, ApiMember, Block } from "./types";
export function Library({
  query,
  setQuery,
  onAdd,
}: {
  query: string;
  setQuery: (q: string) => void;
  onAdd: (kind: string) => void;
}) {
  const [collapsed, setCollapsed] = useState<string[]>([]);
  return (
    <>
      <div className="sidebar-heading">
        BLOCK LIBRARY <span>{definitions.length}</span>
      </div>
      <div className="search-box">
        <Search size={14} />
        <input
          aria-label="Search blocks"
          placeholder="Find a block…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        <kbd>/</kbd>
      </div>
      <div className="library-scroll">
        {categories.map((cat) => {
          const ds = definitions.filter(
            (d) =>
              d.category === cat &&
              (!query ||
                (d.label + " " + d.category + " " + (d.description || ""))
                  .toLowerCase()
                  .includes(query.toLowerCase())),
          );
          if (!ds.length) return null;
          return (
            <div className={"library-category " + categoryClass(cat)} key={cat}>
              <button
                className="category-heading"
                onClick={() =>
                  setCollapsed((c) =>
                    c.includes(cat) ? c.filter((x) => x !== cat) : [...c, cat],
                  )
                }
              >
                {collapsed.includes(cat) && !query ? (
                  <ChevronRight size={12} />
                ) : (
                  <ChevronDown size={12} />
                )}
                <span className="category-dot" />
                {cat}
                <small>{ds.length}</small>
              </button>
              {(!collapsed.includes(cat) || query) &&
                ds.map((d) => (
                  <button
                    className="library-block"
                    key={d.kind}
                    title={d.description || d.label}
                    draggable
                    onDragStart={(e) => {
                      e.dataTransfer.setData(
                        "application/blockforge",
                        JSON.stringify({ kind: d.kind }),
                      );
                      e.dataTransfer.effectAllowed = "copy";
                    }}
                    onClick={() => onAdd(d.kind)}
                  >
                    <BlockIcon kind={d.kind} size={14} />
                    <span>{d.label}</span>
                    <Plus size={12} />
                  </button>
                ))}
            </div>
          );
        })}
        {!definitions.some((d) =>
          (d.label + " " + d.category + " " + (d.description || ""))
            .toLowerCase()
            .includes(query.toLowerCase()),
        ) && <p className="empty-message">No blocks match this search.</p>}
      </div>
      <div className="sidebar-footnote">
        Click to insert. Drag to place precisely.
      </div>
    </>
  );
}
export function Explorer({
  project,
  fileId,
  methodId,
  onSelect,
  onAddFile,
  onAddMethod,
  onOpen,
  onSettings,
}: {
  project: Project;
  fileId: string;
  methodId: string;
  onSelect: (file: string, method?: string) => void;
  onAddFile: () => void;
  onAddMethod: () => void;
  onOpen: () => void;
  onSettings: () => void;
}) {
  const [closed, setClosed] = useState<string[]>([]);
  return (
    <>
      <div className="sidebar-heading">
        EXPLORER{" "}
        <div>
          <button title="New script" onClick={onAddFile}>
            <Plus size={15} />
          </button>
          <button title="Open project" onClick={onOpen}>
            <Folder size={14} />
          </button>
        </div>
      </div>
      <button className="project-root" onClick={onSettings}>
        <ChevronDown size={13} />
        <Box size={15} />
        <span>{project.name}</span>
      </button>
      <div className="explorer-files">
        {project.files.map((f) => (
          <div key={f.id}>
            <div
              className={"file-tree-row " + (fileId === f.id ? "active" : "")}
            >
              <button
                title="Expand or collapse script"
                onClick={() =>
                  setClosed((c) =>
                    c.includes(f.id)
                      ? c.filter((x) => x !== f.id)
                      : [...c, f.id],
                  )
                }
              >
                {closed.includes(f.id) ? (
                  <ChevronRight size={12} />
                ) : (
                  <ChevronDown size={12} />
                )}
              </button>
              <button className="file-tree-name" onClick={() => onSelect(f.id)}>
                <FileCode2 size={15} />
                <span>{f.name}</span>
              </button>
            </div>
            {!closed.includes(f.id) &&
              f.methods.map((m) => (
                <button
                  key={m.id}
                  className={
                    "method-tree-row " + (methodId === m.id ? "selected" : "")
                  }
                  onClick={() => onSelect(f.id, m.id)}
                >
                  {m.event === "fields" ? (
                    <Braces size={13} />
                  ) : m.event === "method" ? (
                    <Box size={13} />
                  ) : (
                    <Zap size={13} />
                  )}
                  <span>{m.name}</span>
                  <small>{m.blocks.length}</small>
                </button>
              ))}
          </div>
        ))}
      </div>
      <button className="add-method" onClick={onAddMethod}>
        <Plus size={13} /> New method
      </button>
      <div className="explorer-bottom">
        <div className="section-label">PROJECT REFERENCES</div>
        <div className="reference-row">
          <CheckCircle2 size={12} /> ScriptHookVDotNet 3 <span>3.6.0</span>
        </div>
        {project.frameworks.includes("lemon") && (
          <div className="reference-row">
            <CheckCircle2 size={12} /> LemonUI <span>2.2.0</span>
          </div>
        )}
        {project.frameworks.includes("ifruit") && (
          <div className="reference-row">
            <CheckCircle2 size={12} /> iFruitAddon2 <span>3.1.1</span>
          </div>
        )}
        {project.references.map((r) => (
          <div key={r} className="reference-row">
            <Package size={12} />
            {r}
          </div>
        ))}
        <div className="target-card">
          <span className="cs-badge">C#</span>
          <div>
            <strong>GTA V · Single-player</strong>
            <span>.NET Framework 4.8</span>
          </div>
        </div>
      </div>
    </>
  );
}
export function ApiBrowser({
  catalog,
  onAdd,
  onReload,
}: {
  catalog: any[] | null;
  onAdd: (member: ApiMember) => void;
  onReload: () => void;
}) {
  const [query, setQuery] = useState(""),
    [assembly, setAssembly] = useState("all");
  const parent = useRef<HTMLDivElement>(null);
  const all = useMemo(
    () => (catalog || []).flatMap((c) => c.members || []) as ApiMember[],
    [catalog],
  );
  const members = useMemo(
    () =>
      all.filter(
        (m) =>
          (assembly === "all" || m.assembly === assembly) &&
          (!query ||
            (m.type + "." + m.name + " " + m.description)
              .toLowerCase()
              .includes(query.toLowerCase())),
      ),
    [all, query, assembly],
  );
  const virtual = useVirtualizer({
    count: members.length,
    getScrollElement: () => parent.current,
    estimateSize: () => 76,
    overscan: 5,
  });
  return (
    <>
      <div className="sidebar-heading">
        FRAMEWORK API{" "}
        <button title="Refresh API catalog" onClick={onReload}>
          <Package size={14} />
        </button>
      </div>
      <div className="search-box">
        <Search size={14} />
        <input
          aria-label="Search framework API"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Type, method, or property…"
        />
      </div>
      <select
        className="api-filter"
        aria-label="Filter framework"
        value={assembly}
        onChange={(e) => setAssembly(e.target.value)}
      >
        <option value="all">All installed frameworks</option>
        {(catalog || [])
          .filter((c) => c.assembly)
          .map((c) => (
            <option key={c.assembly}>{c.assembly}</option>
          ))}
      </select>
      <div className="api-count">
        {catalog
          ? members.length.toLocaleString() + " members · read from assemblies"
          : "Reading assembly metadata…"}
      </div>
      {(catalog || [])
        .filter((c) => c.error)
        .map((c) => (
          <p className="inline-error" key={c.file}>
            {c.file}: {c.error}
          </p>
        ))}
      <div className="api-list" ref={parent}>
        <div style={{ height: virtual.getTotalSize(), position: "relative" }}>
          {virtual.getVirtualItems().map((row) => {
            const m = members[row.index];
            return (
              <button
                key={row.key}
                className="api-member"
                style={{
                  position: "absolute",
                  top: 0,
                  left: 0,
                  width: "100%",
                  height: row.size,
                  transform: `translateY(${row.start}px)`,
                }}
                onClick={() => onAdd(m)}
                title={m.description || m.type + "." + m.name}
              >
                <div>
                  <span className="api-kind">
                    {m.kind === "property"
                      ? "P"
                      : m.kind === "constructor"
                        ? "N"
                        : "M"}
                  </span>
                  <strong>{m.name}</strong>
                  <Plus size={12} />
                </div>
                <span>{m.type}</span>
                <code>
                  {m.kind === "method"
                    ? "(" +
                      m.parameters
                        .map((p) => p.type.split(".").pop())
                        .join(", ") +
                      ") → "
                    : ""}
                  {m.returnType.split(".").pop()}
                </code>
              </button>
            );
          })}
        </div>
      </div>
      <div className="sidebar-footnote">
        Public API metadata. Instance methods need a target object.
      </div>
    </>
  );
}
export function ProjectSearch({
  project,
  onSelect,
}: {
  project: Project;
  onSelect: (file: string, method: string, block: string) => void;
}) {
  const [query, setQuery] = useState("");
  const results = useMemo(() => {
    const all: { file: string; method: string; name: string; block: Block }[] =
      [];
    if (query.length < 2) return all;
    for (const f of project.files)
      for (const m of f.methods)
        walk(m.blocks, (b: Block) => {
          if (
            (registry[b.kind].label + " " + JSON.stringify(b.values))
              .toLowerCase()
              .includes(query.toLowerCase())
          )
            all.push({
              file: f.id,
              method: m.id,
              name: f.name + " / " + m.name,
              block: b,
            });
        });
    return all;
  }, [project, query]);
  return (
    <>
      <div className="sidebar-heading">SEARCH PROJECT</div>
      <div className="search-box">
        <Search size={14} />
        <input
          autoFocus
          aria-label="Search project"
          placeholder="Search blocks and values…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
      </div>
      <div className="api-count">
        {query.length < 2
          ? "Enter at least two characters"
          : results.length.toLocaleString() + " matches"}
      </div>
      <div className="library-scroll">
        {results.slice(0, 200).map((r) => (
          <button
            key={r.block.id}
            className="search-result"
            onClick={() => onSelect(r.file, r.method, r.block.id)}
          >
            <strong>
              {registry[r.block.kind].label}
              <ArrowUpRight size={12} />
            </strong>
            <span>{r.name}</span>
            <code>{summary(r.block)[0]?.value}</code>
          </button>
        ))}
        {results.length > 200 && (
          <p className="empty-message">
            Showing first 200 matches. Refine your search.
          </p>
        )}
      </div>
    </>
  );
}
