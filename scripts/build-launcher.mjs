import fs from "node:fs/promises";
import path from "node:path";
import { createHash } from "node:crypto";
import { root, compiler, run } from "../server/compiler.mjs";
await fs.mkdir(path.join(root, "runtime"), { recursive: true });
const nodePath = path.join(root, "runtime/node.exe");
if (path.resolve(process.execPath).toLowerCase() !== nodePath.toLowerCase()) {
  const digest = async (file) =>
    createHash("sha256")
      .update(await fs.readFile(file))
      .digest("hex");
  let identical = false;
  try {
    identical = (await digest(nodePath)) === (await digest(process.execPath));
  } catch (e) {
    if (e.code !== "ENOENT") throw e;
  }
  if (!identical) await fs.copyFile(process.execPath, nodePath);
}
const result = await run(compiler, [
  "/nologo",
  "/target:winexe",
  "/out:" + path.join(root, "BlockForge.exe"),
  "/reference:System.Windows.Forms.dll",
  path.join(root, "scripts/Launcher.cs"),
]);
if (result.code !== 0) throw new Error(result.output);
console.log("BlockForge.exe and runtime/node.exe are ready.");
