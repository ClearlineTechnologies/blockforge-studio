import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { spawn } from "node:child_process";
import { randomUUID, createHash } from "node:crypto";
import { generateProject } from "../shared/generator.mjs";
export const root = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
);
export const data = process.env.BLOCKFORGE_DATA
  ? path.resolve(process.env.BLOCKFORGE_DATA)
  : path.join(root, ".data");
export const sdk = path.join(root, "sdk");
export const refs = path.join(root, "toolchain/net48/build/.NETFramework/v4.8");
export const compiler = path.join(
  root,
  "toolchain/compiler/tasks/net472/csc.exe",
);
export const custom = path.join(data, "references");
export async function exists(f) {
  try {
    await fs.access(f);
    return true;
  } catch {
    return false;
  }
}
export async function run(
  exe,
  args,
  { cwd = root, timeout = 60000, maxOutput = 16 * 1024 * 1024 } = {},
) {
  return new Promise((resolve, reject) => {
    const p = spawn(exe, args, { cwd, windowsHide: true, shell: false });
    let output = "";
    let timed = false;
    const timer = setTimeout(() => {
      timed = true;
      p.kill();
    }, timeout);
    p.stdout.on("data", (d) => {
      output += d;
      if (output.length > maxOutput) p.kill();
    });
    p.stderr.on("data", (d) => {
      output += d;
      if (output.length > maxOutput) p.kill();
    });
    p.on("error", (e) => {
      clearTimeout(timer);
      reject(e);
    });
    p.on("close", (code) => {
      clearTimeout(timer);
      resolve({
        code: timed ? -1 : code,
        output: output + (timed ? "\nCompilation timed out." : ""),
      });
    });
  });
}
export function referencesFor(p) {
  return [
    path.join(sdk, "ScriptHookVDotNet3.dll"),
    ...(p.frameworks.includes("lemon")
      ? [path.join(sdk, "LemonUI.SHVDN3.dll")]
      : []),
    ...(p.frameworks.includes("ifruit")
      ? [path.join(sdk, "iFruitAddon2.dll")]
      : []),
    ...p.references.map((r) => path.join(custom, r)),
  ];
}
export async function buildProject(project) {
  const started = performance.now();
  const generated = generateProject(project),
    id = randomUUID(),
    dir = path.join(data, "builds", id);
  await fs.mkdir(dir, { recursive: true });
  const sources = [];
  for (const f of generated.files) {
    const name = path.join(dir, f.name);
    await fs.writeFile(name, f.source);
    sources.push(name);
  }
  const info = path.join(dir, "AssemblyInfo.cs");
  await fs.writeFile(
    info,
    '[assembly: System.Reflection.AssemblyVersion("' +
      project.version +
      '")]\n',
  );
  sources.push(info);
  const referenceFiles = [
    ...[
      "mscorlib",
      "System",
      "System.Core",
      "System.Drawing",
      "System.Windows.Forms",
      "System.Xml",
      "System.Xml.Linq",
      "System.Data",
      "Microsoft.CSharp",
    ].map((n) => path.join(refs, n + ".dll")),
    ...referencesFor(project),
  ];
  const diagnostics = [...generated.diagnostics];
  for (const r of [compiler, ...referenceFiles])
    if (!(await exists(r)))
      diagnostics.push({
        severity: "error",
        code: "BF001",
        message: "Missing compiler or reference: " + path.basename(r),
      });
  let output = "",
    exitCode = 1;
  if (!diagnostics.some((d) => d.severity === "error")) {
    const rsp = [
      "/nologo",
      "/target:library",
      "/langversion:latest",
      "/optimize+",
      "/deterministic+",
      "/nostdlib+",
      "/fullpaths",
      "/utf8output",
      '/out:"' + path.join(dir, project.name + ".dll") + '"',
      ...referenceFiles.map((r) => '/reference:"' + r + '"'),
      ...sources.map((s) => '"' + s + '"'),
    ].join("\n");
    await fs.writeFile(path.join(dir, "build.rsp"), rsp);
    const result = await run(compiler, ["@" + path.join(dir, "build.rsp")]);
    output = result.output;
    exitCode = result.code;
    for (const line of output.split(/\r?\n/)) {
      const m = line.match(
        /^(.*?)\((\d+),(\d+)\):\s*(error|warning)\s+(\w+):\s*(.*)$/,
      );
      if (m) {
        const f = path.basename(m[1]);
        diagnostics.push({
          file: f,
          line: +m[2],
          column: +m[3],
          severity: m[4],
          code: m[5],
          message: m[6],
          blockId: generated.files.find((x) => x.name === f)?.map[+m[2]],
        });
      }
    }
    if (exitCode !== 0 && !diagnostics.some((d) => d.severity === "error"))
      diagnostics.push({
        severity: "error",
        code: "BF002",
        message: output || "Compiler failed without diagnostics.",
      });
  }
  const result = {
    id,
    success: exitCode === 0,
    duration: Math.round(performance.now() - started),
    lineCount: generated.lineCount,
    diagnostics,
    output,
    projectHash: createHash("sha256")
      .update(JSON.stringify(project))
      .digest("hex"),
    builtAt: new Date().toISOString(),
    name: project.name,
    version: project.version,
  };
  await fs.writeFile(
    path.join(dir, "result.json"),
    JSON.stringify(result, null, 2),
  );
  await fs.writeFile(
    path.join(dir, "project.blockforge.json"),
    JSON.stringify(project, null, 2),
  );
  return result;
}
let inspectorPromise;
export function ensureInspector() {
  return (inspectorPromise ??= (async () => {
    const exe = path.join(data, "Inspect.exe");
    await fs.mkdir(data, { recursive: true });
    const result = await run(compiler, [
      "/nologo",
      "/target:exe",
      "/out:" + exe,
      "/reference:System.Web.Extensions.dll",
      "/reference:System.Xml.Linq.dll",
      path.join(root, "server/Inspect.cs"),
    ]);
    if (result.code !== 0) throw new Error(result.output);
    return exe;
  })());
}
export async function inspectAssembly(file) {
  const exe = await ensureInspector();
  const r = await run(exe, [file, sdk, custom], { timeout: 30000 });
  if (r.code !== 0) throw new Error(r.output);
  return JSON.parse(r.output);
}
