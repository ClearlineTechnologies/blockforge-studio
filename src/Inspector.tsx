import {
  Copy,
  Trash2,
  ArrowUp,
  ArrowDown,
  IndentIncrease,
  IndentDecrease,
  Layers,
  Plus,
  Settings2,
} from "lucide-react";
import type { Block, Method } from "./types";
import { registry } from "../shared/model.mjs";
import { ExpressionEditor, ArgumentsEditor } from "./Expressions";
import { BlockIcon, categoryClass } from "./BlockCanvas";
export default function Inspector({
  block,
  method,
  variables,
  onChange,
  onAction,
  onAddInside,
  onEditMethod,
}: {
  block: Block | null;
  method: Method;
  variables: string[];
  onChange: (key: string, value: any) => void;
  onAction: (action: string) => void;
  onAddInside: (branch: string) => void;
  onEditMethod: () => void;
}) {
  const def: any = block ? registry[block.kind] : null;
  return (
    <aside className="inspector">
      <div className="pane-heading">
        <span>
          <Settings2 size={14} /> Inspector
        </span>
        <span className="tiny">{block ? "BLOCK" : "METHOD"}</span>
      </div>
      {!block ? (
        <div className="inspector-intro">
          <div className="inspector-hero-icon">
            <Layers size={24} />
          </div>
          <h3>{method.name}</h3>
          <p>Select a block to edit its inputs, conditions, and behavior.</p>
          <div className="info-pair">
            <span>Handler</span>
            <code>{method.event}</code>
          </div>
          <div className="info-pair">
            <span>Blocks</span>
            <code>{method.blocks.length}</code>
          </div>
          <button className="subtle full" onClick={onEditMethod}>
            <Settings2 size={14} /> Configure method
          </button>
          <div className="inspector-tip">
            <strong>A structured C# workspace</strong>
            <p>
              Blocks generate real C#. Use the API browser for additional
              framework members, or a C# source block for advanced logic.
            </p>
          </div>
        </div>
      ) : (
        <div className="inspector-content">
          <div className={"inspector-title " + categoryClass(def.category)}>
            <div className="block-symbol">
              <BlockIcon kind={block.kind} size={19} />
            </div>
            <div>
              <span>{def.category}</span>
              <h3>{def.label}</h3>
            </div>
          </div>
          <p className="field-description">
            {def.description ||
              "Configure this block. Changes update the generated C# automatically."}
          </p>
          {block.values._apiDescription && (
            <p className="api-doc">{block.values._apiDescription}</p>
          )}
          <div className="section-label">PROPERTIES</div>
          {def.fields.map((f: any) => (
            <label className="field" key={f.key}>
              <span>
                {f.label}
                {f.type === "expr" && <small>VALUE</small>}
              </span>
              {f.type === "expr" ? (
                <ExpressionEditor
                  value={block.values[f.key]}
                  variables={variables}
                  onChange={(v) => onChange(f.key, v)}
                />
              ) : f.type === "args" ? (
                <ArgumentsEditor
                  value={block.values[f.key]}
                  variables={variables}
                  names={block.values._argNames || []}
                  onChange={(v) => onChange(f.key, v)}
                />
              ) : f.type === "select" ? (
                <select
                  value={block.values[f.key]}
                  onChange={(e) => onChange(f.key, e.target.value)}
                >
                  {f.options.map((o: string) => (
                    <option key={o}>{o}</option>
                  ))}
                </select>
              ) : f.type === "code" ? (
                <textarea
                  className="mono code-input"
                  rows={8}
                  spellCheck={false}
                  value={block.values[f.key] || ""}
                  onChange={(e) => onChange(f.key, e.target.value)}
                />
              ) : (
                <input
                  type={f.type === "number" ? "number" : "text"}
                  spellCheck={f.type === "text"}
                  className={
                    ["identifier", "type"].includes(f.type) ? "mono" : ""
                  }
                  list={f.type === "type" ? "csharp-types" : undefined}
                  value={block.values[f.key] ?? ""}
                  onChange={(e) =>
                    onChange(
                      f.key,
                      f.type === "number"
                        ? Number(e.target.value)
                        : e.target.value,
                    )
                  }
                />
              )}
            </label>
          ))}
          {def.container && (
            <>
              <div className="section-label">NESTED BLOCKS</div>
              <button
                className="subtle full"
                onClick={() => onAddInside("children")}
              >
                <Plus size={14} /> Add inside this block
              </button>
              {def.otherwise && (
                <button
                  className="subtle full"
                  onClick={() => onAddInside("otherwise")}
                >
                  <Plus size={14} /> Add to{" "}
                  {block.kind === "try" ? "catch" : "otherwise"}
                </button>
              )}
            </>
          )}
          <div className="section-label">ARRANGE</div>
          <div className="arrange-actions">
            {[
              [ArrowUp, "up", "Move up"],
              [ArrowDown, "down", "Move down"],
              [IndentIncrease, "indent", "Nest under previous block"],
              [IndentDecrease, "outdent", "Move out of parent"],
              [Copy, "duplicate", "Duplicate block"],
              [Trash2, "delete", "Delete block and children"],
            ].map(([Icon, action, title]: any) => (
              <button
                key={action}
                title={title}
                onClick={() => onAction(action)}
              >
                <Icon size={15} />
              </button>
            ))}
          </div>
          <label className="toggle-line">
            <input
              type="checkbox"
              checked={!block.disabled}
              onChange={() => onAction("disable")}
            />
            <span>Include in generated code</span>
          </label>
          <div className="block-id">Block {block.id.slice(0, 8)}</div>
        </div>
      )}
      <datalist id="csharp-types">
        {[
          "var",
          "int",
          "float",
          "double",
          "bool",
          "string",
          "GTA.Vehicle",
          "GTA.Ped",
          "GTA.Blip",
          "GTA.Math.Vector3",
          "System.Collections.Generic.List<string>",
          "System.Collections.Generic.Dictionary<string, int>",
        ].map((t) => (
          <option key={t} value={t} />
        ))}
      </datalist>
    </aside>
  );
}
