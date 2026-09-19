import { chromium, expect } from "@playwright/test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import path from "node:path";
import JSZip from "jszip";
import { createProject, block, ref, literal, uid } from "../shared/model.mjs";
const base = process.env.TEST_URL || "http://127.0.0.1:4174";
const out = path.resolve(process.env.BLOCKFORGE_TEST_OUTPUT || "test-results");
await fs.mkdir(out, { recursive: true });
const browser = await chromium.launch({ channel: "chrome", headless: true });
const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } }),
  errors = [];
page.on("pageerror", (e) => errors.push(e.message));
const post = async (url, body) => {
  const r = await page.request.post(base + "/api" + url, {
    headers: { "X-BlockForge": "1" },
    data: body,
  });
  assert.ok(r.ok(), await r.text());
  return r.json();
};
try {
  await page.goto(base);
  await page.locator("h1").filter({ hasText: "Initialize" }).waitFor();
  await page.locator(".project-picker").click();
  await page.getByRole("button", { name: "New project", exact: true }).click();
  await page.getByLabel("Project name", { exact: true }).fill("WorkflowTest");
  await page.getByRole("button", { name: /Empty script/ }).click();
  await page
    .getByRole("button", { name: "Create project", exact: true })
    .click();
  await expect(page.locator(".project-picker")).toContainText("WorkflowTest");
  await page.getByRole("button", { name: "Add your first block" }).click();
  await page.getByLabel("Find block to add").fill("If / otherwise");
  await page.locator(".palette-result").click();
  await expect(
    page.getByRole("button", { name: "If / otherwise block", exact: true }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Add inside this block", exact: true })
    .click();
  await page.getByLabel("Find block to add").fill("Show notification");
  await page.locator(".palette-result").click();
  await page
    .getByLabel("Text value", { exact: true })
    .fill("Nested notification survives saving.");
  await page.getByTitle("Duplicate block", { exact: true }).click();
  await expect(page.locator(".syntax-block")).toHaveCount(3);
  await page.getByTitle("Move out of parent", { exact: true }).click();
  await page.getByTitle("Delete block and children", { exact: true }).click();
  await expect(page.locator(".syntax-block")).toHaveCount(2);
  await page.getByTitle("Undo · Ctrl Z", { exact: true }).click();
  await expect(page.locator(".syntax-block")).toHaveCount(3);
  await page.getByTitle("Redo · Ctrl Shift Z", { exact: true }).click();
  await expect(page.locator(".syntax-block")).toHaveCount(2);
  await page
    .getByRole("button", { name: "If / otherwise block", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Add to otherwise", exact: true })
    .click();
  await page.getByLabel("Find block to add").fill("Show subtitle");
  await page.locator(".palette-result").click();
  await page
    .getByLabel("Text value", { exact: true })
    .fill("Alternate branch.");
  await page.getByTitle("Save project · Ctrl S").click();
  await expect(page.locator(".save-indicator")).toHaveText("Saved");
  const list = await (await page.request.get(base + "/api/projects")).json(),
    entry = list.find((p) => p.name === "WorkflowTest");
  assert.ok(entry);
  let saved = await (
    await page.request.get(base + "/api/projects/" + entry.id)
  ).json();
  const init = saved.files[0].methods.find((m) => m.event === "constructor");
  assert.equal(
    init.blocks[0].children[0].values.message.value,
    "Nested notification survives saving.",
  );
  assert.equal(init.blocks[0].otherwise[0].kind, "subtitle");
  await page.reload();
  await expect(page.locator(".project-picker")).toContainText("WorkflowTest");
  await expect(page.locator(".syntax-block")).toHaveCount(3);
  await page.getByRole("button", { name: "Build Ctrl B", exact: true }).click();
  await expect(page.locator(".build-output .success-text")).toBeVisible({
    timeout: 60000,
  });
  await page.getByRole("button", { name: "Package mod", exact: true }).click();
  const [release] = await Promise.all([
    page.waitForEvent("download"),
    page
      .getByRole("link", { name: "Download release ZIP", exact: true })
      .click(),
  ]);
  await release.saveAs(path.join(out, "WorkflowTest-release.zip"));
  const releaseZip = await JSZip.loadAsync(
    await fs.readFile(path.join(out, "WorkflowTest-release.zip")),
  );
  assert.ok(releaseZip.file("scripts/WorkflowTest.dll"));
  const dll = await releaseZip
    .file("scripts/WorkflowTest.dll")
    .async("nodebuffer");
  assert.equal(dll.subarray(0, 2).toString(), "MZ");
  assert.ok(releaseZip.file("manifest.json"));
  assert.ok(releaseZip.file("README.md"));
  const [source] = await Promise.all([
    page.waitForEvent("download"),
    page
      .getByRole("button", { name: "Export C# project", exact: true })
      .click(),
  ]);
  await source.saveAs(path.join(out, "WorkflowTest-source.zip"));
  const sourceZip = await JSZip.loadAsync(
    await fs.readFile(path.join(out, "WorkflowTest-source.zip")),
  );
  assert.ok(sourceZip.file("WorkflowTest.csproj"));
  assert.ok(sourceZip.file("project.blockforge.json"));
  await page.getByTitle("Close dialog").click();
  // A type error must be a real Roslyn diagnostic and select the corresponding block.
  await page.keyboard.press("Control+Space");
  await page.getByLabel("Find block to add").fill("Local variable");
  await page.locator(".palette-result").click();
  const inspector = page.locator(".inspector");
  await inspector.getByLabel("Type", { exact: true }).fill("int");
  await inspector.getByLabel("Value type").selectOption("text");
  await inspector.getByLabel("Text value").fill("deliberate type mismatch");
  await page.getByRole("button", { name: "Build Ctrl B", exact: true }).click();
  await expect(
    page.locator(".diagnostic").filter({ hasText: "CS0029" }),
  ).toBeVisible({ timeout: 60000 });
  await page.locator(".diagnostic").filter({ hasText: "CS0029" }).click();
  await expect(page.locator(".inspector-title")).toContainText(
    "Local variable",
  );
  await page.getByTitle("Delete block and children", { exact: true }).click();
  // Drag a library block into the method using native data transfer.
  await page
    .getByRole("button", { name: "Block library", exact: true })
    .click();
  await page
    .getByLabel("Search blocks", { exact: true })
    .fill("Set wanted level");
  await page.locator(".library-block").dragTo(page.locator(".flow-exit"));
  await expect(
    page.getByRole("button", { name: "Set wanted level block", exact: true }),
  ).toBeVisible();
  await page.getByLabel("Wanted level", { exact: true }).fill("2");
  await page.getByTitle("Save project · Ctrl S").click();
  await expect(page.locator(".save-indicator")).toHaveText("Saved");
  console.log(
    "WORKFLOWS_OK: creation, nesting, alternate branches, undo/redo, autosave, reload, build, compiler mapping, drag/drop, source and release ZIPs",
  );
  // One method with 15,000 rows verifies DOM virtualization independently of the multi-file compiler test.
  const large = createProject("VirtualizationTest", "blank");
  large.files[0].methods[0].blocks.push(block("field", { name: "counter" }));
  large.files[0].methods[1].blocks = Array.from({ length: 15000 }, () =>
    block("increment", { target: ref("counter"), value: literal(1) }),
  );
  const stored = await post("/projects", { project: large });
  await page.evaluate(
    (id) => localStorage.setItem("blockforge.lastProject", id),
    stored.id,
  );
  const started = Date.now();
  await page.reload();
  await expect(page.locator(".statusbar")).toContainText("15,001 blocks", {
    timeout: 60000,
  });
  const rendered = await page.locator(".syntax-block").count();
  assert.ok(
    rendered < 70,
    "Only visible block rows should be rendered, got " + rendered,
  );
  await page.locator(".canvas-scroll").evaluate((el) => {
    el.scrollTop = el.scrollHeight;
  });
  await expect(page.locator(".sequence-number").last()).toHaveText("15000", {
    timeout: 10000,
  });
  await page.locator(".syntax-block").last().click();
  await page.getByLabel("Number value", { exact: true }).fill("2");
  await page.getByTitle("Save project · Ctrl S").click();
  await expect(page.locator(".save-indicator")).toHaveText("Saved", {
    timeout: 10000,
  });
  const storedLarge = await (
    await page.request.get(base + "/api/projects/" + stored.id)
  ).json();
  assert.equal(
    storedLarge.files[0].methods[1].blocks[14999].values.value.value,
    2,
  );
  const build = await post("/build", { project: storedLarge });
  assert.equal(build.success, true, JSON.stringify(build.diagnostics));
  assert.ok(build.lineCount > 13494);
  await page.screenshot({ path: path.join(out, "large-workspace.png") });
  const report = {
    renderedRows: rendered,
    totalRows: 15000,
    uiWorkflowMs: Date.now() - started,
    lines: build.lineCount,
    compileMs: build.duration,
    consoleErrors: errors,
  };
  await fs.writeFile(
    path.join(out, "ui-workflows.json"),
    JSON.stringify(report, null, 2),
  );
  console.log("VIRTUALIZATION_OK", JSON.stringify(report));
  assert.deepEqual(errors, []);
} finally {
  await page
    .screenshot({ path: path.join(out, "last-workflow-screen.png") })
    .catch(() => {});
  await browser.close();
}
