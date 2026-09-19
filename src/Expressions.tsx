import type { Expr } from "./types";
import { Plus, X } from "lucide-react";
export const knownReferences = [
  ["Game.Player.Character", "Player character"],
  ["Game.Player.Character.Position", "Player position"],
  ["Game.Player.Character.CurrentVehicle", "Current vehicle"],
  ["Game.Player.Character.Health", "Player health"],
  ["Game.Player.Character.Armor", "Player armor"],
  ["Game.Player.Character.IsDead", "Player is dead"],
  ["Game.Player.WantedLevel", "Wanted level"],
  ["Game.Player.Money", "Player money"],
  ["Game.Player.Handle", "Player handle"],
  ["Game.GameTime", "Game time (ms)"],
  ["World.CurrentTimeOfDay", "World time"],
  ["World.GetAllVehicles()", "All vehicles"],
  ["World.GetAllPeds()", "All pedestrians"],
  ["mainMenu.Visible", "Menu is visible"],
  ["godModeItem.Checked", "Checkbox is checked"],
];
const defaults: Record<string, Expr> = {
  text: { kind: "text", value: "" },
  number: { kind: "number", value: 0 },
  boolean: { kind: "boolean", value: true },
  reference: { kind: "reference", value: "Game.Player.Character" },
  binary: {
    kind: "binary",
    left: { kind: "reference", value: "Game.Player.WantedLevel" },
    op: ">",
    right: { kind: "number", value: 0 },
  },
  not: { kind: "not", value: { kind: "boolean", value: false } },
  null: { kind: "null" },
  vector: {
    kind: "vector",
    x: { kind: "number", value: 0 },
    y: { kind: "number", value: 0 },
    z: { kind: "number", value: 0 },
  },
  raw: { kind: "raw", value: "" },
};
export function ExpressionEditor({
  value,
  onChange,
  variables = [],
  depth = 0,
}: {
  value: Expr;
  onChange: (v: Expr) => void;
  variables?: string[];
  depth?: number;
}) {
  const e = value || { kind: "null" };
  return (
    <div className={"expression depth-" + depth}>
      <select
        aria-label="Value type"
        className="expr-kind"
        value={e.kind}
        onChange={(ev) => onChange(structuredClone(defaults[ev.target.value]))}
      >
        <option value="text">Text</option>
        <option value="number">Number</option>
        <option value="boolean">True / false</option>
        <option value="reference">Variable / property</option>
        <option value="binary">Compare / calculate</option>
        <option value="not">Not</option>
        <option value="vector">3D position</option>
        <option value="null">Null</option>
        <option value="raw">C# expression</option>
      </select>
      {e.kind === "text" && (
        <input
          aria-label="Text value"
          value={e.value ?? ""}
          onChange={(ev) => onChange({ ...e, value: ev.target.value })}
        />
      )}
      {e.kind === "number" && (
        <input
          aria-label="Number value"
          type="number"
          step="any"
          value={e.value ?? 0}
          onChange={(ev) =>
            onChange({
              ...e,
              value: ev.target.value === "" ? "" : Number(ev.target.value),
            })
          }
        />
      )}
      {e.kind === "boolean" && (
        <select
          aria-label="Boolean value"
          value={String(e.value)}
          onChange={(ev) =>
            onChange({ ...e, value: ev.target.value === "true" })
          }
        >
          <option value="true">True</option>
          <option value="false">False</option>
        </select>
      )}
      {e.kind === "reference" && (
        <>
          <select
            aria-label="Choose a variable or property"
            value={
              [...knownReferences.map((x) => x[0]), ...variables].includes(
                e.value,
              )
                ? e.value
                : "__custom"
            }
            onChange={(ev) =>
              onChange({
                ...e,
                value: ev.target.value === "__custom" ? "" : ev.target.value,
              })
            }
          >
            <optgroup label="Project variables">
              {variables.map((v) => (
                <option key={v} value={v}>
                  {v}
                </option>
              ))}
            </optgroup>
            <optgroup label="Game properties">
              {knownReferences.map(([v, label]) => (
                <option key={v} value={v}>
                  {label}
                </option>
              ))}
            </optgroup>
            <option value="__custom">Custom reference…</option>
          </select>
          <input
            aria-label="Reference"
            className="mono"
            value={e.value ?? ""}
            onChange={(ev) => onChange({ ...e, value: ev.target.value })}
          />
        </>
      )}
      {e.kind === "raw" && (
        <textarea
          aria-label="C# expression"
          className="mono"
          value={e.value ?? ""}
          onChange={(ev) => onChange({ ...e, value: ev.target.value })}
        />
      )}
      {e.kind === "binary" && (
        <div className="binary">
          <ExpressionEditor
            value={e.left!}
            onChange={(v) => onChange({ ...e, left: v })}
            variables={variables}
            depth={depth + 1}
          />
          <select
            aria-label="Operator"
            className="operator"
            value={e.op}
            onChange={(ev) => onChange({ ...e, op: ev.target.value })}
          >
            {[
              ["==", "equals"],
              ["!=", "does not equal"],
              [">", "greater than"],
              ["<", "less than"],
              [">=", "at least"],
              ["<=", "at most"],
              ["&&", "and"],
              ["||", "or"],
              ["+", "plus"],
              ["-", "minus"],
              ["*", "multiply"],
              ["/", "divide"],
              ["%", "remainder"],
              ["??", "or fallback"],
            ].map(([v, l]) => (
              <option key={v} value={v}>
                {l}
              </option>
            ))}
          </select>
          <ExpressionEditor
            value={e.right!}
            onChange={(v) => onChange({ ...e, right: v })}
            variables={variables}
            depth={depth + 1}
          />
        </div>
      )}
      {e.kind === "not" && (
        <ExpressionEditor
          value={e.value}
          onChange={(v) => onChange({ ...e, value: v })}
          variables={variables}
          depth={depth + 1}
        />
      )}
      {e.kind === "vector" &&
        ["x", "y", "z"].map((k) => (
          <label key={k}>
            {k.toUpperCase()}
            <ExpressionEditor
              value={e[k as "x"]!}
              onChange={(v) => onChange({ ...e, [k]: v })}
              variables={variables}
              depth={depth + 1}
            />
          </label>
        ))}
    </div>
  );
}
export function ArgumentsEditor({
  value,
  onChange,
  variables,
  names = [],
}: {
  value: Expr[];
  onChange: (v: Expr[]) => void;
  variables: string[];
  names?: string[];
}) {
  return (
    <div className="arguments">
      {(value || []).map((e, i) => (
        <div className="argument" key={i}>
          <div className="argument-head">
            <span>{names[i] || "Argument " + (i + 1)}</span>
            <button
              title="Remove argument"
              onClick={() => onChange(value.filter((_, j) => i !== j))}
            >
              <X size={13} />
            </button>
          </div>
          <ExpressionEditor
            value={e}
            onChange={(v) => onChange(value.map((x, j) => (i === j ? v : x)))}
            variables={variables}
          />
        </div>
      ))}
      <button
        className="subtle full"
        onClick={() =>
          onChange([...(value || []), { kind: "text", value: "" }])
        }
      >
        <Plus size={13} /> Add argument
      </button>
    </div>
  );
}
