import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import path from "node:path";
import {
  createProject,
  script,
  method,
  block,
  literal,
  ref,
  binary,
  cloneBlock,
  findBlock,
  findLocation,
  flatten,
  countBlocks,
  validateProject,
  definitions,
} from "../shared/model.mjs";
import {
  generateProject,
  expression,
  projectXml,
} from "../shared/generator.mjs";
import { buildProject, inspectAssembly, sdk } from "../server/compiler.mjs";

test("expressions preserve literal values and reject unknown operators", () => {
  assert.equal(
    expression(literal('quote " slash \\ new\nline')),
    '"quote \\" slash \\\\ new\\nline"',
  );
  assert.equal(expression(binary(literal(5), ">=", literal(3))), "(5 >= 3)");
  assert.equal(expression(literal(false)), "false");
  assert.throws(() =>
    expression({
      kind: "binary",
      op: "eval",
      left: literal(1),
      right: literal(2),
    }),
  );
});
test("nested blocks preserve order, identity and independent clones", () => {
  const child = block("notify"),
    parent = block("if", {}, [child]);
  const copy = cloneBlock(parent);
  assert.notEqual(copy.id, parent.id);
  assert.notEqual(copy.children[0].id, child.id);
  assert.equal(findBlock([parent], child.id), child);
  assert.equal(findLocation([parent], child.id).list, parent.children);
  assert.deepEqual(
    flatten([parent]).map((r) => r.depth),
    [0, 1],
  );
  parent.collapsed = true;
  assert.equal(flatten([parent]).length, 1);
});
test("project validation catches broken IDs, invalid references and excessive nesting", () => {
  const p = createProject("Validation", "blank");
  p.references = ["../outside.dll"];
  assert.throws(() => validateProject(p), /assembly/);
  p.references = [];
  p.files.push(structuredClone(p.files[0]));
  assert.throws(() => validateProject(p), /duplicate/);
  const deep = createProject("Deep", "blank");
  let list = deep.files[0].methods[1].blocks;
  for (let i = 0; i < 66; i++) {
    const b = block("if");
    list.push(b);
    list = b.children;
  }
  assert.throws(() => validateProject(deep), /nesting/);
});
test("generation maps statements to block IDs and exports a net48 project", () => {
  const p = createProject("Mapped", "starter"),
    g = generateProject(p),
    first = p.files[0].methods[1].blocks[0];
  const line =
    g.files[0].source
      .split("\n")
      .findIndex((l) => l.includes("Notification.Show")) + 1;
  assert.equal(g.files[0].map[line], first.id);
  assert.match(projectXml(p), /<TargetFramework>net48<\/TargetFramework>/);
  assert.match(projectXml(p), /LemonUI.SHVDN3/);
  first.disabled = true;
  assert.doesNotMatch(
    generateProject(p).files[0].source,
    /Notification.Show\("~b~/,
  );
});
test("dependency and event placement diagnostics identify responsible block", () => {
  const p = createProject("Invalid", "blank"),
    b = block("menu");
  p.files[0].methods[1].blocks.push(b, block("key"));
  const ds = generateProject(p).diagnostics;
  assert.ok(ds.some((d) => d.code === "BF100" && d.blockId === b.id));
  assert.ok(ds.some((d) => d.code === "BF103"));
});
test("actual starter and phone templates compile to managed DLLs", async () => {
  for (const template of ["starter", "phone", "blank"]) {
    const p = createProject("Compile" + template, template),
      r = await buildProject(p);
    assert.equal(r.success, true, JSON.stringify(r.diagnostics));
  }
});
test("all curated statement blocks compile against the real frameworks", async () => {
  const p = createProject("BlockCoverage", "starter");
  p.frameworks.push("ifruit");
  const f = p.files[0];
  f.methods[0].blocks.push(block("field"), block("member"));
  f.methods[1].blocks.push(
    block("phone"),
    block("contact"),
    block("menuCheckbox"),
  );
  f.methods[2].blocks.push(block("phoneUpdate"));
  const bs = [
    block("subtitle"),
    block("wanted"),
    block("health"),
    block("armor"),
    block("money"),
    block("invincible"),
    block("teleport"),
    block("weather"),
    block("time"),
    block("vehicle"),
    block("ped"),
    block("deleteEntity"),
    block("repair"),
    block("blip"),
    block("weapon"),
    block("variable"),
    block("assign"),
    block("increment"),
    block("new"),
    block("comment"),
    block("raw", { code: 'System.Console.WriteLine("Compiled");' }),
    block("menuVisible"),
    block("phoneClose"),
    block("native"),
  ];
  bs.push(
    block("ifElse", {}, [block("notify")]),
    block("repeat", {}, [block("continue"), block("break")]),
    block("while", {}, [block("break")]),
    block("foreach", {}, [block("comment")]),
    block("try", {}, [block("comment")]),
    block("wait"),
    block("call", { method: "Helper" }),
    block("api", {
      member: "System.Console.WriteLine",
      args: [literal("Hello")],
    }),
    block("return"),
  );
  f.methods.push(method("Coverage", "method", bs), method("Helper"));
  const r = await buildProject(p);
  assert.equal(r.success, true, JSON.stringify(r.diagnostics));
});
test("Roslyn type errors retain file, line, code and block identity", async () => {
  const p = createProject("TypeError", "blank"),
    b = block("variable", { type: "int", value: literal("not an integer") });
  p.files[0].methods[1].blocks.push(b);
  const r = await buildProject(p);
  assert.equal(r.success, false);
  assert.ok(
    r.diagnostics.some(
      (d) => d.code === "CS0029" && d.blockId === b.id && d.line > 0,
    ),
  );
});
test("installed APIs expose real metadata for SHVDN, LemonUI and iFruitAddon2", async () => {
  const sh = await inspectAssembly(path.join(sdk, "ScriptHookVDotNet3.dll"));
  assert.ok(
    sh.members.some(
      (m) => m.type === "GTA.World" && m.name === "CreateVehicle",
    ),
  );
  const lemon = await inspectAssembly(path.join(sdk, "LemonUI.SHVDN3.dll"));
  assert.ok(
    lemon.members.some(
      (m) => m.type === "LemonUI.ObjectPool" && m.name === "Process",
    ),
  );
  const phone = await inspectAssembly(path.join(sdk, "iFruitAddon2.dll"));
  assert.ok(
    phone.members.some(
      (m) => m.type === "iFruitAddon2.CustomiFruit" && m.name === "Update",
    ),
  );
});
test("15,000 visual statements generate, serialize, reopen and compile", async () => {
  const p = createProject("LargeProject", "blank");
  p.files = [];
  for (let fileIndex = 0; fileIndex < 10; fileIndex++) {
    const f = script("Module" + fileIndex);
    f.methods[0].blocks.push(block("field", { name: "total" }));
    for (let mi = 0; mi < 10; mi++) {
      const blocks = [];
      for (let i = 0; i < 150; i++)
        blocks.push(
          block("increment", { target: ref("total"), value: literal(1) }),
        );
      f.methods.push(method("Process" + mi, "method", blocks));
    }
    p.files.push(f);
  }
  const started = performance.now();
  const reopened = JSON.parse(JSON.stringify(p));
  validateProject(reopened);
  const g = generateProject(reopened);
  const generationMs = Math.round(performance.now() - started);
  assert.equal(countBlocks(reopened), 15010);
  assert.ok(g.lineCount > 13494);
  const r = await buildProject(reopened);
  assert.equal(r.success, true, JSON.stringify(r.diagnostics));
  const result = {
    blocks: countBlocks(p),
    lines: g.lineCount,
    files: p.files.length,
    generationAndRoundTripMs: generationMs,
    compileMs: r.duration,
    success: r.success,
  };
  await fs.mkdir(
    path.resolve(process.env.BLOCKFORGE_TEST_OUTPUT || "test-results"),
    { recursive: true },
  );
  await fs.writeFile(
    path.resolve("test-results/large-project.json"),
    JSON.stringify(p),
  );
  await fs.writeFile(
    path.resolve("test-results/performance.json"),
    JSON.stringify(result, null, 2),
  );
  console.log("LARGE_PROJECT", JSON.stringify(result));
});
