import { useMemo, useRef, useEffect } from "react";
import { useVirtualizer } from "@tanstack/react-virtual";
import {
  Plus,
  ChevronRight,
  ChevronDown,
  GripVertical,
  MessageSquare,
  GitBranch,
  Repeat2,
  Variable,
  Code2,
  PanelTop,
  Phone,
  Car,
  Globe2,
  Zap,
  Layers,
  CornerDownRight,
  ArrowDown,
} from "lucide-react";
import { flatten, registry } from "../shared/model.mjs";
import type { Block, Method } from "./types";
export const categoryClass = (cat: string) =>
  ({
    "World & player": "world",
    Entities: "entities",
    "Control flow": "flow",
    "Events & input": "events",
    Variables: "variables",
    "C#": "csharp",
    LemonUI: "lemon",
    iFruitAddon2: "phone",
    "GTA natives": "native",
  })[cat] || "csharp";
export const categoryIcons: Record<string, any> = {
  "World & player": Globe2,
  Entities: Car,
  "Control flow": GitBranch,
  "Events & input": Zap,
  Variables: Variable,
  "C#": Code2,
  LemonUI: PanelTop,
  iFruitAddon2: Phone,
  "GTA natives": Layers,
};
export function BlockIcon({
  kind,
  size = 16,
}: {
  kind: string;
  size?: number;
}) {
  const d = registry[kind];
  const Icon =
    kind === "notify"
      ? MessageSquare
      : kind === "repeat"
        ? Repeat2
        : categoryIcons[d?.category] || Code2;
  return <Icon size={size} />;
}
export function displayValue(v: any): string {
  if (v == null) return "null";
  if (Array.isArray(v)) return v.map(displayValue).join(", ");
  if (typeof v === "object") {
    if (v.kind === "binary")
      return (
        displayValue(v.left) +
        " " +
        ({ "==": "equals", "!=": "≠", "&&": "and", "||": "or" }[
          v.op as string
        ] || v.op) +
        " " +
        displayValue(v.right)
      );
    if (v.kind === "vector")
      return [v.x, v.y, v.z].map(displayValue).join(", ");
    if (v.kind === "null") return "null";
    if (v.kind === "text") return "“" + v.value + "”";
    if (v.kind === "not") return "not " + displayValue(v.value);
    return String(v.value ?? "");
  }
  return String(v);
}
export function summary(b: Block) {
  const def = registry[b.kind];
  return def.fields
    .filter((f: any) => b.values[f.key] !== "" && f.type !== "args")
    .slice(0, 3)
    .map((f: any) => ({
      label: f.label,
      value: displayValue(b.values[f.key]),
    }));
}
export default function BlockCanvas({
  method,
  selected,
  onSelect,
  onAdd,
  onCollapse,
  onDrop,
  zoom,
  errors,
}: {
  method: Method;
  selected: string | null;
  onSelect: (id: string) => void;
  onAdd: () => void;
  onCollapse: (id: string) => void;
  onDrop: (data: any, target: string | null, mode: string) => void;
  zoom: number;
  errors: Set<string>;
}) {
  const scroll = useRef<HTMLDivElement>(null);
  const rows = useMemo(
    () =>
      flatten(method.blocks) as {
        block: Block;
        depth: number;
        parent: string | null;
        branch: string;
      }[],
    [method.blocks],
  );
  const size = Math.round(82 * zoom);
  const virtual = useVirtualizer({
    count: rows.length,
    getScrollElement: () => scroll.current,
    estimateSize: () => size,
    overscan: 8,
  });
  useEffect(() => {
    virtual.measure();
  }, [size]);
  useEffect(() => {
    const index = rows.findIndex((r) => r.block.id === selected);
    if (index >= 0) virtual.scrollToIndex(index, { align: "auto" });
  }, [selected, method.id]);
  function drop(e: React.DragEvent, target: string | null, mode: string) {
    e.preventDefault();
    e.stopPropagation();
    e.currentTarget.classList.remove("drop-target");
    try {
      onDrop(
        JSON.parse(e.dataTransfer.getData("application/blockforge")),
        target,
        mode,
      );
    } catch {}
  }
  return (
    <div
      ref={scroll}
      className="canvas-scroll"
      data-testid="block-canvas"
      onDragOver={(e) => e.preventDefault()}
      onDrop={(e) => drop(e, null, "end")}
    >
      <div className="flow-entry">
        <span className="flow-dot" />
        <span>
          {method.event === "constructor"
            ? "SCRIPT START"
            : method.event === "fields"
              ? "CLASS MEMBERS"
              : method.event === "tick"
                ? "EVERY FRAME"
                : method.event === "keyDown"
                  ? "KEY DOWN EVENT"
                  : method.event === "aborted"
                    ? "SCRIPT ABORTED"
                    : "METHOD ENTRY"}
        </span>
        <span className="flow-line" />
      </div>
      {!rows.length && (
        <div className="canvas-empty">
          <div className="empty-icon">
            <Layers size={28} />
          </div>
          <h3>Build this behavior visually</h3>
          <p>
            Add a block, then fill in its properties.
            <br />
            Drag blocks to reorder or nest them.
          </p>
          <button className="primary" onClick={onAdd}>
            <Plus size={15} /> Add your first block
          </button>
        </div>
      )}
      <div style={{ height: virtual.getTotalSize(), position: "relative" }}>
        {virtual.getVirtualItems().map((row) => {
          const { block: b, depth, branch } = rows[row.index];
          const def = registry[b.kind];
          return (
            <div
              key={b.id}
              className="virtual-block"
              style={{
                position: "absolute",
                top: 0,
                left: 0,
                width: "100%",
                height: row.size,
                transform: `translateY(${row.start}px)`,
              }}
            >
              <div className="sequence-number">
                {String(row.index + 1).padStart(2, "0")}
              </div>
              <div
                role="button"
                tabIndex={0}
                aria-label={def.label + " block"}
                data-block-id={b.id}
                className={
                  "syntax-block " +
                  categoryClass(def.category) +
                  (selected === b.id ? " selected" : "") +
                  (b.disabled ? " disabled" : "") +
                  (errors.has(b.id) ? " has-error" : "")
                }
                style={{
                  marginLeft: Math.min(depth, 12) * 22 + 30,
                  marginRight: 24,
                  height: size - 13,
                }}
                onClick={() => onSelect(b.id)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") onSelect(b.id);
                }}
                draggable
                onDragStart={(e) => {
                  e.dataTransfer.setData(
                    "application/blockforge",
                    JSON.stringify({ id: b.id }),
                  );
                  e.dataTransfer.effectAllowed = "move";
                }}
                onDragOver={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  e.currentTarget.classList.add("drop-target");
                }}
                onDragLeave={(e) =>
                  e.currentTarget.classList.remove("drop-target")
                }
                onDrop={(e) => {
                  const box = e.currentTarget.getBoundingClientRect();
                  drop(
                    e,
                    b.id,
                    e.clientY < box.top + box.height * 0.35
                      ? "before"
                      : def.container
                        ? "inside"
                        : "after",
                  );
                }}
              >
                <div className="block-grip">
                  <GripVertical size={13} />
                </div>
                <div className="block-symbol">
                  <BlockIcon kind={b.kind} />
                </div>
                <div className="block-body">
                  <div className="block-title">
                    <strong>{def.label}</strong>
                    {branch === "otherwise" && (
                      <span className="branch-label">
                        {b.kind === "try" ? "catch" : "otherwise"}
                      </span>
                    )}
                    {b.disabled && (
                      <span className="branch-label">disabled</span>
                    )}
                  </div>
                  <div className="block-values">
                    {summary(b).map((s: any, i: number) => (
                      <span key={i} title={s.label + ": " + s.value}>
                        {s.value.length > 60
                          ? s.value.slice(0, 60) + "…"
                          : s.value}
                      </span>
                    ))}
                  </div>
                </div>
                {def.container ? (
                  <button
                    className="collapse-block"
                    title={b.collapsed ? "Expand block" : "Collapse block"}
                    onClick={(e) => {
                      e.stopPropagation();
                      onCollapse(b.id);
                    }}
                  >
                    {b.collapsed ? (
                      <ChevronRight size={15} />
                    ) : (
                      <ChevronDown size={15} />
                    )}
                    <span>{b.children.length + b.otherwise.length}</span>
                  </button>
                ) : (
                  <ChevronRight className="block-chevron" size={14} />
                )}
              </div>
              {depth > 0 && (
                <CornerDownRight
                  className="nesting-arrow"
                  size={13}
                  style={{ left: Math.min(depth, 12) * 22 + 12 }}
                />
              )}
            </div>
          );
        })}
      </div>
      {!!rows.length && (
        <button className="add-block-line" onClick={onAdd}>
          <Plus size={15} /> Add block <span>Ctrl Space</span>
        </button>
      )}
      <div className="flow-exit">
        <ArrowDown size={12} />{" "}
        {method.event === "fields" ? "END OF MEMBERS" : "RETURN CONTROL"}
      </div>
    </div>
  );
}
