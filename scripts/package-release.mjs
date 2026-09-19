import fs from "node:fs/promises";
import path from "node:path";
import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { root } from "../server/compiler.mjs";
const version = JSON.parse(
  await fs.readFile(path.join(root, "package.json"), "utf8"),
).version;
const output = path.join(root, "release");
await fs.mkdir(output, { recursive: true });
const stage = await fs.mkdtemp(path.join(output, "stage-"));
const app = path.join(stage, "BlockForge");
await fs.mkdir(app);
const directories = [
  "src",
  "shared",
  "server",
  "scripts",
  "public",
  "licenses",
  "tests",
  "node_modules",
  "dist",
];
const files = [
  "package.json",
  "package-lock.json",
  "tsconfig.json",
  "vite.config.ts",
  "index.html",
  "README.md",
  "LICENSE",
  "THIRD-PARTY.md",
  "VALIDATION.md",
  "RECOVERY.md",
  "CONTRIBUTING.md",
  ".nvmrc",
  "BlockForge.exe",
  "Start-BlockForge.cmd",
  "Stop-BlockForge.cmd",
  "Rebuild-BlockForge.cmd",
];
for (const name of directories)
  await fs.cp(path.join(root, name), path.join(app, name), {
    recursive: true,
    filter: (source) => {
      const relative = path.relative(root, source).split(path.sep);
      return !relative.some((part) =>
        [".vite", ".vite-temp", ".cache"].includes(part),
      );
    },
  });
await fs.mkdir(path.join(app, "runtime"), { recursive: true });
await fs.copyFile(
  path.join(root, "runtime/node.exe"),
  path.join(app, "runtime/node.exe"),
);
await fs.cp(path.join(root, "runtime/npm"), path.join(app, "runtime/npm"), {
  recursive: true,
});
for (const name of files)
  await fs.copyFile(path.join(root, name), path.join(app, name));
for (const name of ["compiler", "net48"])
  await fs.cp(
    path.join(root, "toolchain", name),
    path.join(app, "toolchain", name),
    { recursive: true },
  );
await fs.mkdir(path.join(app, "sdk"), { recursive: true });
for (const name of [
  "ScriptHookVDotNet3.dll",
  "ScriptHookVDotNet3.xml",
  "LemonUI.SHVDN3.dll",
  "LemonUI.SHVDN3.xml",
  "iFruitAddon2.dll",
])
  await fs.copyFile(path.join(root, "sdk", name), path.join(app, "sdk", name));
await fs.access(path.join(app, "runtime/npm/bin/npm-cli.js"));
// Inspect the staged allowlist. A private project folder must never enter a release.
for (const forbidden of [".data", ".git", ".env"]) {
  try {
    await fs.access(path.join(app, forbidden));
    throw new Error("Private data found in release: " + forbidden);
  } catch (e) {
    if (e.code !== "ENOENT") throw e;
  }
}
const archive = path.join(output, `BlockForge-${version}-win-x64.zip`);
execFileSync("tar", ["-a", "-cf", archive, "-C", stage, "BlockForge"], {
  stdio: "inherit",
  windowsHide: true,
});
const hash = createHash("sha256")
  .update(await fs.readFile(archive))
  .digest("hex");
await fs.writeFile(
  path.join(output, "SHA256SUMS.txt"),
  `${hash}  ${path.basename(archive)}\n`,
);
console.log(
  JSON.stringify({
    archive,
    sha256: hash,
    bytes: (await fs.stat(archive)).size,
    stage,
  }),
);

