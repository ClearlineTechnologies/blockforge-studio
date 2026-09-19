import { chromium } from "@playwright/test";
import fs from "node:fs/promises";
import path from "node:path";
const out = path.resolve("test-results/ui");
await fs.mkdir(out, { recursive: true });
const browser = await chromium.launch({ channel: "chrome", headless: true });
const page = await browser.newPage({
  viewport: { width: 1600, height: 1000 },
  deviceScaleFactor: 1,
});
const errors = [];
page.on("pageerror", (e) => errors.push(e.message));
page.on("console", (m) => {
  if (m.type() === "error") console.log("CONSOLE", m.text());
});
await page.goto("http://127.0.0.1:4173");
await page
  .getByRole("heading", { name: "Initialize", exact: true, level: 1 })
  .waitFor({ timeout: 60000 });
await page.screenshot({ path: path.join(out, "workspace.png") });
console.log("INITIAL", await page.locator(".statusbar").innerText());
await page.getByRole("button", { name: "Build Ctrl B", exact: true }).click();
await page.locator(".build-output .success-text").waitFor({ timeout: 60000 });
console.log("BUILD", await page.locator(".build-output").innerText());
await page
  .getByRole("button", { name: "Show notification block", exact: true })
  .click();
await page.getByTitle("Split view", { exact: true }).click();
await page.locator(".monaco-editor").waitFor({ timeout: 60000 });
await page.screenshot({ path: path.join(out, "split.png") });
await page
  .getByRole("button", { name: "Framework API browser", exact: true })
  .click();
await page
  .getByText("members · read from assemblies", { exact: false })
  .waitFor({ timeout: 60000 });
console.log("CATALOG", await page.locator(".api-count").innerText());
await page.getByRole("button", { name: "Package mod", exact: true }).click();
console.log("RELEASE", await page.getByRole("dialog").innerText());
await page.screenshot({ path: path.join(out, "release.png") });
console.log("PAGE_ERRORS", JSON.stringify(errors));
await browser.close();
if (errors.length) process.exitCode = 1;
