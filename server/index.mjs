import express from "express";
import multer from "multer";
import fs from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";
import JSZip from "jszip";
import { createProject, validateProject } from "../shared/model.mjs";
import { generateProject, projectXml } from "../shared/generator.mjs";
import {
  root,
  data,
  sdk,
  custom,
  refs,
  compiler,
  exists,
  buildProject,
  inspectAssembly,
} from "./compiler.mjs";
const app = express(),
  port = Number(process.env.PORT || 4173),
  projects = path.join(data, "projects");
await Promise.all(
  [projects, custom, path.join(data, "builds")].map((f) =>
    fs.mkdir(f, { recursive: true }),
  ),
);
app.use((req, res, next) => {
  const host = req.headers.host;
  if (!["127.0.0.1:" + port, "localhost:" + port].includes(host))
    return res.status(403).json({ error: "Local access only." });
  const origin = req.headers.origin;
  if (
    origin &&
    !["http://127.0.0.1:" + port, "http://localhost:" + port].includes(origin)
  )
    return res.status(403).json({ error: "Cross-origin access is disabled." });
  if (
    req.path.startsWith("/api") &&
    !["GET", "HEAD"].includes(req.method) &&
    req.headers["x-blockforge"] !== "1"
  )
    return res
      .status(403)
      .json({ error: "Missing application request header." });
  next();
});
app.use(express.json({ limit: "32mb" }));
const safeId = (id) => {
  if (!/^[\w-]{1,80}$/.test(id)) throw new Error("Invalid ID.");
  return id;
};
async function readProject(id) {
  return JSON.parse(
    await fs.readFile(path.join(projects, safeId(id) + ".json"), "utf8"),
  );
}
async function saveProject(p) {
  validateProject(p);
  const f = path.join(projects, p.id + ".json");
  if (await exists(f)) await fs.copyFile(f, f + ".bak");
  const temp = f + "." + randomUUID() + ".tmp";
  await fs.writeFile(
    temp,
    JSON.stringify({ ...p, updatedAt: new Date().toISOString() }),
  );
  await fs.rename(temp, f);
}
if (!(await fs.readdir(projects)).some((f) => f.endsWith(".json")))
  await saveProject(createProject("LosSantosEssentials"));
app.get("/api/status", async (req, res) =>
  res.json({
    app: "blockforge-studio",
    compiler: await exists(compiler),
    target: ".NET Framework 4.8",
    version: "0.1.0",
    frameworks: await Promise.all(
      [
        ["shvdn", "ScriptHookVDotNet 3", "3.6.0", "ScriptHookVDotNet3.dll"],
        ["lemon", "LemonUI", "2.2.0", "LemonUI.SHVDN3.dll"],
        ["ifruit", "iFruitAddon2", "3.1.1", "iFruitAddon2.dll"],
      ].map(async ([id, name, version, file]) => ({
        id,
        name,
        version,
        file,
        installed: await exists(path.join(sdk, file)),
      })),
    ),
  }),
);
app.get("/api/projects", async (req, res) => {
  const list = [];
  for (const f of await fs.readdir(projects)) {
    if (!f.endsWith(".json")) continue;
    try {
      const p = JSON.parse(await fs.readFile(path.join(projects, f), "utf8"));
      list.push({
        id: p.id,
        name: p.name,
        version: p.version,
        updatedAt: p.updatedAt,
        files: p.files.length,
      });
    } catch {}
  }
  res.json(
    list.sort((a, b) => (b.updatedAt || "").localeCompare(a.updatedAt || "")),
  );
});
app.get("/api/projects/:id", async (req, res) =>
  res.json(await readProject(req.params.id)),
);
app.put("/api/projects/:id", async (req, res) => {
  if (req.params.id !== req.body.id) throw new Error("Project ID mismatch.");
  await saveProject(req.body);
  res.json({ saved: true });
});
app.post("/api/projects", async (req, res) => {
  const p = req.body.project || createProject(req.body.name, req.body.template);
  if (await exists(path.join(projects, safeId(p.id) + ".json")))
    p.id = randomUUID();
  await saveProject(p);
  res.json(p);
});
app.post("/api/shutdown", (req, res) => {
  res.json({ stopped: true });
  setTimeout(() => process.exit(0), 250);
});
app.post("/api/generate", (req, res) =>
  res.json(generateProject(req.body.project)),
);
let busy = false;
app.post("/api/build", async (req, res) => {
  if (busy)
    return res
      .status(409)
      .json({ error: "A build is already running. Please wait." });
  busy = true;
  try {
    res.json(await buildProject(req.body.project));
  } finally {
    busy = false;
  }
});
app.get("/api/references", async (req, res) =>
  res.json((await fs.readdir(custom)).filter((f) => f.endsWith(".dll"))),
);
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 32 * 1024 * 1024, files: 1 },
  fileFilter: (req, file, cb) =>
    cb(null, /^[\w.-]+\.dll$/i.test(file.originalname)),
});
app.post("/api/references", upload.single("file"), async (req, res) => {
  if (!req.file) throw new Error("Choose a .NET DLL with a simple filename.");
  const name = req.file.originalname;
  if (
    (await exists(path.join(sdk, name))) ||
    (await exists(path.join(custom, name)))
  )
    throw new Error("An assembly with that filename is already installed.");
  const tmp = path.join(custom, randomUUID() + ".dll");
  try {
    await fs.writeFile(tmp, req.file.buffer);
    const catalog = await inspectAssembly(tmp);
    await fs.rename(tmp, path.join(custom, name));
    res.json({
      file: name,
      assembly: catalog.assembly,
      count: catalog.members.length,
    });
  } finally {
    await fs.rm(tmp, { force: true });
  }
});
const catalogCache = new Map();
app.get("/api/catalog", async (req, res) => {
  const names = [
    "ScriptHookVDotNet3.dll",
    "LemonUI.SHVDN3.dll",
    "iFruitAddon2.dll",
    ...(await fs.readdir(custom)).filter((f) => f.endsWith(".dll")),
  ];
  const results = [];
  for (const name of names) {
    if (!catalogCache.has(name)) {
      const file = path.join(
        name === "ScriptHookVDotNet3.dll" ||
          name === "LemonUI.SHVDN3.dll" ||
          name === "iFruitAddon2.dll"
          ? sdk
          : custom,
        name,
      );
      try {
        catalogCache.set(name, {
          ...(await inspectAssembly(file)),
          file: name,
        });
      } catch (e) {
        results.push({ file: name, error: e.message, members: [] });
        continue;
      }
    }
    results.push(catalogCache.get(name));
  }
  res.json(results);
});
function instructions(p) {
  return `# ${p.name} ${p.version}\n\n${p.description || ""}\n\nAuthor: ${p.author || "Not specified"}\n\n## Install\n\nThis is a GTA V single-player ScriptHookVDotNet 3 mod targeting .NET Framework 4.8.\n\n1. Install a Script Hook V and ScriptHookVDotNet runtime compatible with your exact game edition and build.\n2. Copy scripts/${p.name}.dll into the game's scripts directory.\n${p.frameworks.includes("lemon") ? "3. Install LemonUI.SHVDN3 2.2.0 (or a compatible version) into scripts.\n" : ""}${p.frameworks.includes("ifruit") ? "4. Install iFruitAddon2 3.1.1 (or a compatible version) into scripts.\n" : ""}${p.references.length ? "Additional assemblies required: " + p.references.join(", ") + "\n" : ""}\nFramework DLLs and game loaders are not included in this release archive. Verify redistribution permissions before bundling third-party libraries.\n\n## Dependencies\n\n- https://github.com/scripthookvdotnet/scripthookvdotnet\n- https://github.com/LemonUIbyLemon/LemonUI\n- https://github.com/Bob74/iFruitAddon2\n\n## Build from source\n\nOpen project.blockforge.json in BlockForge and press Build. Or place required reference DLLs in lib/ and build the .csproj using a .NET SDK with net48 reference assemblies restored from NuGet.\n\nCompiled against SHVDN API 3.6.0. In-game compatibility is separate from compilation. Test on the intended GTA V edition and build before publishing.\n`;
}
app.post("/api/export/source", async (req, res) => {
  const p = validateProject(req.body.project),
    generated = generateProject(p),
    zip = new JSZip();
  for (const f of generated.files) zip.file(f.name, f.source);
  zip.file(p.name + ".csproj", projectXml(p));
  zip.file("project.blockforge.json", JSON.stringify(p, null, 2));
  zip.file("README.md", instructions(p));
  zip.file(
    "lib/REFERENCES.txt",
    "Place ScriptHookVDotNet3.dll and enabled framework DLLs in this folder. They are available in your BlockForge/sdk directory; custom assemblies are in .data/references.",
  );
  res
    .type("application/zip")
    .setHeader(
      "Content-Disposition",
      'attachment; filename="' + p.name + '-source.zip"',
    );
  res.send(await zip.generateAsync({ type: "nodebuffer" }));
});
app.get("/api/builds/:id/release", async (req, res) => {
  const dir = path.join(data, "builds", safeId(req.params.id));
  const result = JSON.parse(
    await fs.readFile(path.join(dir, "result.json"), "utf8"),
  );
  if (!result.success) throw new Error("This build did not succeed.");
  const p = JSON.parse(
      await fs.readFile(path.join(dir, "project.blockforge.json"), "utf8"),
    ),
    zip = new JSZip();
  zip.file(
    "scripts/" + p.name + ".dll",
    await fs.readFile(path.join(dir, p.name + ".dll")),
  );
  zip.file("README.md", instructions(p));
  zip.file(
    "manifest.json",
    JSON.stringify(
      {
        name: p.name,
        version: p.version,
        author: p.author,
        target: "net48",
        api: "ScriptHookVDotNet3 3.6.0",
        frameworks: p.frameworks,
        customReferences: p.references,
        sourceHash: result.projectHash,
        builtAt: result.builtAt,
      },
      null,
      2,
    ),
  );
  res
    .type("application/zip")
    .setHeader(
      "Content-Disposition",
      'attachment; filename="' + p.name + "-" + p.version + '.zip"',
    );
  res.send(await zip.generateAsync({ type: "nodebuffer" }));
});
app.use("/api", (err, req, res, next) =>
  res.status(400).json({ error: err.message || "Request failed." }),
);
if (process.argv.includes("--production")) {
  app.use(express.static(path.join(root, "dist")));
  app.get("/{*path}", (req, res) =>
    res.sendFile(path.join(root, "dist/index.html")),
  );
} else {
  const { createServer } = await import("vite");
  const vite = await createServer({
    server: { middlewareMode: true },
    appType: "spa",
  });
  app.use(vite.middlewares);
}
app.listen(port, "127.0.0.1", () =>
  console.log("BlockForge Studio is ready at http://127.0.0.1:" + port),
);
