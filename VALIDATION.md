# Verification record

The deliverable is the BlockForge IDE. Generated mod projects mentioned here are test fixtures used to exercise it.

## Compiler and document tests

`node --test tests/engine.test.mjs` covers:

- String escaping and expression operators.
- Nested block identity, cloning, order, lookup, and collapsed views.
- Invalid project IDs/references and excessive nesting rejection.
- Generated C# source maps and `.csproj` export.
- Missing framework references and incorrect event placement diagnostics.
- Actual compilation of the empty, LemonUI, and iFruitAddon2 templates.
- Actual compilation covering the curated statement block types.
- A deliberately invalid `int = string` assignment producing Roslyn CS0029 and identifying its block.
- Reading real public member metadata from the three installed modding framework assemblies.
- A 15,010-block document across 10 files: **15,730 generated lines**, successful compilation, and JSON round-trip.

Measured on this machine during development: 54 ms for large-project generation plus serialization/validation round-trip, approximately 3.6 seconds for its compile. These are local observations, not universal timing guarantees.

## Browser workflows

`node tests/workflows.mjs`, against a separate production server on port 4174, passed:

- Creating a new project through the UI.
- Adding a conditional, a nested notification, and an alternate-branch subtitle.
- Editing values, duplicating, outdenting, deleting, undoing, and redoing.
- Saving to disk and verifying values after a page reload.
- Building a real DLL through the UI.
- Downloading and inspecting both release and C# source archives. The release DLL has a PE `MZ` header; the manifest, README, source, and project files are present.
- Producing a real Roslyn type error and clicking it to select the responsible block.
- Dragging a block from the library into the method.
- Opening and editing **15,000 root blocks in a single method**. Only **14 rows** were rendered initially. Scrolling reached row 15,000; an edit to that row persisted to disk.
- Compiling the large single-method project: **15,033 lines**, successful compilation in approximately **3.4 seconds**.
- Zero browser `pageerror` events during these workflows.

`tests/ui-smoke.mjs` also verified the generated-source view, compiler output, framework catalog (2,688 members), and current-build release availability.

## Scope of verification

The interface was inspected at desktop viewport sizes using browser screenshots. The production frontend build and Windows launcher compilation were successful. No generated mod was executed inside GTA V. Game behavior, runtime compatibility, debugger attachment, and public hosting publication are outside these completed checks.

For repeatable UI tests, start an isolated server first:

```powershell
$env:PORT='4174'
$env:BLOCKFORGE_DATA='C:\path\to\a\separate\test-data-folder'
node server/index.mjs --production
```

In a second terminal, run `node tests/workflows.mjs`. Chrome must be installed for the headless UI tests. Test data remains in the separate directory.
