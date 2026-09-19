import { useState, useRef, useEffect, useCallback } from "react";
import type { Project } from "./types";
export async function api(url: string, body?: any, method = "POST") {
  const r = await fetch(
    "/api" + url,
    body === undefined
      ? {}
      : {
          method,
          headers: { "Content-Type": "application/json", "X-BlockForge": "1" },
          body: JSON.stringify(body),
        },
  );
  const data = await r.json();
  if (!r.ok) throw new Error(data.error || r.statusText);
  return data;
}
export function download(blob: Blob, name: string) {
  const url = URL.createObjectURL(blob),
    a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 5000);
}
export function useProject() {
  const [project, setProject] = useState<Project | null>(null),
    [saveState, setSaveState] = useState("Loading"),
    [error, setError] = useState(""),
    [historyVersion, bumpHistory] = useState(0);
  const current = useRef<Project | null>(null),
    past = useRef<Project[]>([]),
    future = useRef<Project[]>([]),
    saved = useRef(""),
    saveQueue = useRef(Promise.resolve()),
    lastEdit = useRef(0),
    savedProject = useRef<string | null>(null);
  const load = useCallback((p: Project) => {
    current.current = p;
    past.current = [];
    future.current = [];
    saved.current = JSON.stringify(p);
    savedProject.current = p.id;
    setProject(p);
    setSaveState("Saved");
    setError("");
    bumpHistory((v) => v + 1);
    localStorage.setItem("blockforge.lastProject", p.id);
  }, []);
  useEffect(() => {
    let active = true;
    api("/projects")
      .then(async (list: any[]) => {
        const last = localStorage.getItem("blockforge.lastProject");
        const id = list.find((p) => p.id === last)?.id || list[0]?.id;
        if (id) {
          const p = await api("/projects/" + id);
          if (active) load(p);
        }
      })
      .catch((e) => setError(e.message));
    return () => {
      active = false;
    };
  }, [load]);
  function edit(fn: (p: Project) => void, coalesce = false) {
    const old = current.current;
    if (!old) return;
    const next = structuredClone(old);
    fn(next);
    if (!coalesce || performance.now() - lastEdit.current > 600) {
      past.current.push(old);
      if (past.current.length > 35) past.current.shift();
    }
    lastEdit.current = coalesce ? performance.now() : 0;
    future.current = [];
    current.current = next;
    setProject(next);
    setSaveState("Unsaved");
    bumpHistory((v) => v + 1);
  }
  const save = useCallback(async () => {
    const p = current.current;
    if (!p) return;
    const text = JSON.stringify(p);
    if (text === saved.current && p.id === savedProject.current) return;
    setSaveState("Saving");
    const operation = saveQueue.current
      .catch(() => {})
      .then(async () => {
        await api("/projects/" + p.id, p, "PUT");
        saved.current = text;
        savedProject.current = p.id;
        if (current.current === p) {
          setSaveState("Saved");
          setError("");
        }
      });
    saveQueue.current = operation;
    try {
      await operation;
    } catch (e: any) {
      setSaveState("Save failed");
      setError(e.message);
      throw e;
    }
  }, []);
  useEffect(() => {
    if (!project) return;
    const timer = setTimeout(() => {
      save().catch(() => {});
    }, 700);
    return () => clearTimeout(timer);
  }, [project, save]);
  useEffect(() => {
    const handler = (e: BeforeUnloadEvent) => {
      if (
        current.current &&
        JSON.stringify(current.current) !== saved.current
      ) {
        e.preventDefault();
        e.returnValue = "";
      }
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, []);
  function undo() {
    if (!past.current.length || !current.current) return;
    future.current.push(current.current);
    const p = past.current.pop()!;
    current.current = p;
    setProject(p);
    setSaveState("Unsaved");
    bumpHistory((v) => v + 1);
  }
  function redo() {
    if (!future.current.length || !current.current) return;
    past.current.push(current.current);
    const p = future.current.pop()!;
    current.current = p;
    setProject(p);
    setSaveState("Unsaved");
    bumpHistory((v) => v + 1);
  }
  return {
    project,
    current,
    load,
    edit,
    save,
    saveState,
    error,
    setError,
    undo,
    redo,
    canUndo: past.current.length > 0,
    canRedo: future.current.length > 0,
    historyVersion,
  };
}
