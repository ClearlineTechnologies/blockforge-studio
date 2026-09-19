import { useRef, useEffect } from "react";
import Editor, { loader } from "@monaco-editor/react";
import * as monaco from "monaco-editor";
import EditorWorker from "monaco-editor/esm/vs/editor/editor.worker?worker";
import type { Diagnostic } from "./types";
import { Copy, FileCode2 } from "lucide-react";
(self as any).MonacoEnvironment = {
  getWorker() {
    return new EditorWorker();
  },
};
loader.config({ monaco });
monaco.editor.defineTheme("blockforge", {
  base: "vs-dark",
  inherit: true,
  rules: [
    { token: "comment", foreground: "687C77" },
    { token: "keyword", foreground: "C9A1EF" },
    { token: "string", foreground: "A9C99B" },
    { token: "number", foreground: "E4B47B" },
    { token: "type", foreground: "88C9CD" },
  ],
  colors: {
    "editor.background": "#11151b",
    "editor.foreground": "#c0c8d3",
    "editorLineNumber.foreground": "#414e5e",
    "editorLineNumber.activeForeground": "#91a3b6",
    "editor.selectionBackground": "#2a454a",
    "editor.lineHighlightBackground": "#172029",
    "editorCursor.foreground": "#88dcc0",
    "editorWidget.background": "#1a222c",
    "editorGutter.background": "#11151b",
  },
});
export default function CodePane({
  source,
  name,
  map,
  selected,
  diagnostics,
  onSelect,
  onCopy,
}: {
  source: string;
  name: string;
  map: Record<number, string>;
  selected: string | null;
  diagnostics: Diagnostic[];
  onSelect: (id: string) => void;
  onCopy: () => void;
}) {
  const editor = useRef<monaco.editor.IStandaloneCodeEditor | null>(null);
  const decorations = useRef<monaco.editor.IEditorDecorationsCollection | null>(
    null,
  );
  const mapRef = useRef(map);
  mapRef.current = map;
  useEffect(() => {
    if (!editor.current) return;
    const lines = Object.entries(map)
      .filter(([, id]) => id === selected)
      .map(([n]) => +n);
    decorations.current?.clear();
    if (lines.length) {
      decorations.current = editor.current.createDecorationsCollection([
        {
          range: new monaco.Range(Math.min(...lines), 1, Math.max(...lines), 1),
          options: { isWholeLine: true, className: "selected-source-line" },
        },
      ]);
      editor.current.revealLineInCenterIfOutsideViewport(lines[0]);
    }
  }, [selected, map]);
  useEffect(() => {
    const model = editor.current?.getModel();
    if (model)
      monaco.editor.setModelMarkers(
        model,
        "build",
        diagnostics
          .filter((d) => d.file === name && d.line)
          .map((d) => ({
            severity:
              d.severity === "error"
                ? monaco.MarkerSeverity.Error
                : monaco.MarkerSeverity.Warning,
            message: d.code + ": " + d.message,
            startLineNumber: d.line!,
            endLineNumber: d.line!,
            startColumn: d.column || 1,
            endColumn: (d.column || 1) + 2,
          })),
      );
  }, [diagnostics, name, source]);
  return (
    <div className="code-pane">
      <div className="pane-heading">
        <span>
          <FileCode2 size={14} /> {name}
        </span>
        <div>
          <span className="generated-label">GENERATED</span>
          <button title="Copy C# source" onClick={onCopy}>
            <Copy size={14} />
          </button>
        </div>
      </div>
      <Editor
        height="100%"
        language="csharp"
        path={name}
        value={source}
        theme="blockforge"
        options={{
          readOnly: true,
          fontSize: 12,
          fontFamily: "Cascadia Code, Consolas, monospace",
          minimap: { enabled: true, scale: 1 },
          scrollBeyondLastLine: false,
          automaticLayout: true,
          padding: { top: 18 },
          lineNumbersMinChars: 4,
          renderLineHighlight: "all",
          wordWrap: "off",
          smoothScrolling: true,
          overviewRulerLanes: 0,
        }}
        onMount={(e) => {
          editor.current = e;
          e.onMouseDown((ev) => {
            const line = ev.target.position?.lineNumber;
            if (line && mapRef.current[line]) onSelect(mapRef.current[line]);
          });
        }}
      />
      <div className="code-note">
        Source follows your blocks. Click a line to select its block.
      </div>
    </div>
  );
}
