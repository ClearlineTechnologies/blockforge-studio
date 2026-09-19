# BlockForge Studio

A local visual C# IDE for developing GTA V single-player mods on Windows. Version 0.1.0.

## Public download

Get the Windows app from [GitHub Releases](https://github.com/ClearlineTechnologies/blockforge-studio/releases). Download the Windows ZIP, extract it, and run BlockForge.exe. No GitHub, Codex, or OpenAI account is required. The app source is MIT licensed.

The release ZIP contains the runtime, compiler, SDKs, source, and pinned dependencies for offline use and rebuilding. The repository source excludes generated binaries and local projects. See [RECOVERY.md](RECOVERY.md) for recovering the app without this machine or account.

## Launch

Double-click **BlockForge.exe** in this folder. Keep the folder intact: the launcher starts the bundled Node runtime and opens the IDE in a Chrome or Edge app window. You can also run **Start-BlockForge.cmd** or open **http://127.0.0.1:4173** once the server is running.

The compiler, reference assemblies, installed modding SDKs, fonts, and editor assets are included. Normal editing and compilation do not require internet access. Windows with .NET Framework 4.8 is required. The launcher uses port 4173; it does not install a system service or modify GTA V.

Closing the editor window leaves its local server available. **Stop-BlockForge.cmd** stops it. Save your work before stopping the server.

## What the IDE does

- Creates and manages multiple mod projects, script files, and methods.
- Edits nested syntax blocks through a searchable library, drag placement, an inspector, and keyboard shortcuts.
- Offers structured values: text, numbers, booleans, variables, game properties, comparisons, arithmetic, logical operations, and 3D vectors.
- Supports initialization, tick, key down/up, aborted, menu click, phone answer, and custom methods.
- Includes blocks for conditions, loops, try/catch, variables, fields, objects, calls, player/world operations, entities, LemonUI, iFruitAddon2, and native calls.
- Reads the public API directly from actual DLL metadata: 2,688 members in the three included assemblies. Search methods, constructors, and readable properties, then insert an invocation or value block.
- Accepts additional .NET assembly references, inspects their metadata without executing their code, and includes enabled references in compilation.
- Generates C# in a background worker; Monaco displays the source with block-to-line mapping.
- Compiles real managed DLLs using the Roslyn C# compiler. Compiler errors include file, line, column, and the responsible block when mapped.
- Saves projects to disk automatically, keeps a previous-save backup, and supports undo/redo and JSON import/export.
- Exports C# projects and release ZIPs containing your compiled DLL, installation README, and version/source manifest.

## Working with blocks

1. Open a script and choose a method. **Initialize** runs at script startup, **OnTick** runs every frame, and **OnKeyDown** receives keyboard events.
2. Open **Block library** in the left rail, or press **Ctrl Space**. Click a block to insert it after the selection.
3. Select a block and edit its inputs in the inspector. Use **Compare / calculate** for conditions without writing C# operators.
4. Use **Add inside this block** for the body of a condition or loop; **Add to otherwise** edits an alternate branch.
5. Drag a block to reorder it. Dropping near a row's top places it before that row; dropping lower on a container nests it. The inspector also provides move, indent, outdent, duplicate, disable, and delete actions.
6. Choose **Split** to see C# alongside the blocks. Click mapped source lines to find their block.
7. Press **Ctrl B** to compile. Click a problem to inspect its block.

**Class fields** hold shared state. Add executable blocks to a method. A key-condition block belongs in a key event. LemonUI needs **Process menus** each tick, and iFruitAddon2 needs **Update phone** each tick. The supplied templates include these lifecycle calls.

The API browser can insert more framework members than the curated library. Instance calls require an existing object as their target. Constructor and method arguments are editable values. C# compilation checks the final argument and return types. Optional trailing parameters are omitted by default; add arguments to supply them.

For constructs that do not yet have a dedicated block, use **C# source** for statements or **C# class member** for fields, properties, and methods. Importing a `.cs` text file inserts its content into the selected scope; it does not automatically parse an arbitrary C# program into visual blocks.

## Build and release

The target is **C# / .NET Framework 4.8 / ScriptHookVDotNet API 3**. The included references are:

| Component | Version | Upstream |
| --- | --- | --- |
| ScriptHookVDotNet API 3 | 3.6.0 | https://github.com/scripthookvdotnet/scripthookvdotnet |
| LemonUI.SHVDN3 | 2.2.0 | https://github.com/LemonUIbyLemon/LemonUI |
| iFruitAddon2 | 3.1.1 | https://github.com/Bob74/iFruitAddon2 |
| Microsoft.Net.Compilers.Toolset | 4.14.0 | https://www.nuget.org/packages/Microsoft.Net.Compilers.Toolset/4.14.0 |
| .NET Framework 4.8 reference assemblies | 1.0.3 | https://www.nuget.org/packages/Microsoft.NETFramework.ReferenceAssemblies.net48/1.0.3 |

Enable optional frameworks in **Frameworks & references**. Curated LemonUI/phone blocks enable their corresponding reference when inserted. Custom references can be uploaded there too. Additional namespaces are configured in **Project settings**.

After a successful build of the current project, open **Package mod → Download release ZIP**. The archive contains:

```
scripts/YourMod.dll
README.md
manifest.json
```

Source changes invalidate the release button until you rebuild. Compiler output is never presented as successful when Roslyn fails. The IDE compiles code; it does not execute your mod during a build.

The release archive lists framework prerequisites rather than redistributing framework runtimes. Install a Script Hook V / ScriptHookVDotNet runtime matching the exact GTA V edition and game build. SHVDN's upstream specifically recommends compiling against stable API versions even where players need a compatible nightly runtime. Compilation against these reference assemblies does not prove in-game compatibility.

Test your mod in GTA V before uploading the ZIP to a mod hosting service. The IDE prepares local releases; it does not submit them to hosting sites or deploy them into the game automatically.

## Large projects

The visual document supports up to 100,000 blocks and 64 levels of nesting. These are validation bounds, not a guarantee that every project near those limits will be fast. The canvas renders only visible rows; C# generation runs in a worker. Use files and methods to organize larger mods.

Verified during development: **15,010 blocks generated 15,730 lines across 10 scripts and compiled successfully**. Those scripts were test fixtures, not the deliverable. The deliverable is this IDE. Performance measurements and browser test results are recorded in `VALIDATION.md`.

## Data and recovery

Projects live in `.data/projects/<project-id>.json`. A `.json.bak` file contains the previous saved version. Each build gets a separate folder under `.data/builds`, with the exact project snapshot, generated sources, compiler response file, DLL on success, and diagnostics. Imported reference DLLs live in `.data/references`.

**Export visual project** makes a portable editable JSON copy. **Export C# project** makes a `.csproj`, source files, and the visual project. Place the required reference DLLs in the exported `lib` directory before building that source with another IDE. Installed reference DLLs are in this folder's `sdk`, and custom references are in `.data/references`.

Auto-save errors are shown in the UI. Do not close the IDE while it reports an unsaved or failed save. Project files are written via a temporary file and rename, with a previous-save backup. Editing the same project simultaneously in multiple windows is not supported; the latest completed save wins.

## Shortcuts

| Shortcut | Action |
| --- | --- |
| Ctrl S | Save |
| Ctrl B | Build DLL |
| Ctrl Space | Add block |
| Ctrl Z / Ctrl Shift Z | Undo / redo document changes |
| Ctrl D | Duplicate selected block |
| Delete | Delete selected block |
| Ctrl Shift F | Search project |
| Escape | Close dialog |

Text inputs retain their normal text-editing undo behavior.

## Development

With Node 22.12+ and npm installed:

```powershell
npm ci
npm run dev
npm run build
npm start
npm test
```

The shipped `runtime/node.exe` can also run `server/index.mjs --production` directly. `package-lock.json` pins the JS dependency graph. `scripts/setup-toolchain.ps1` can restore the versioned compiler and SDK files from their official download endpoints.

Production and development both bind to loopback only. `PORT` overrides port 4173. `BLOCKFORGE_DATA` selects a separate project/build data directory, which is useful for testing. Local API writes require the application header and same-origin access; imported DLL inspection uses reflection-only loading.

The source is organized into `shared` (document model and generator), `src` (React IDE), `server` (persistence, reflection, compilation, ZIP export), and `tests` (compiler and browser verification).

## Current boundaries

This is a working first release, not feature parity with Visual Studio or Rider. There is no live GTA debugger, breakpoints, semantic C# autocomplete, Git integration, automatic arbitrary-C#-to-block conversion, or integrated public hosting login. Generated-source view is read-only; edit through blocks or C# escape-hatch blocks. There is no hardcoded maximum of 13,494 lines.

The built-in runtime target is SHVDN3. Custom .NET references broaden its API access; they do not automatically add FiveM, RAGE Plugin Hook, other game runtimes, or other programming-language build targets. API metadata browsing omits open generic types/methods and ref/out/pointer parameters; those remain accessible through C# blocks when compatible with the target.

Neither the IDE nor its generated starter mods have been run inside GTA V on this machine. No compatibility claim is made for an untested game edition/build. Upstream libraries keep their own licenses; see `THIRD-PARTY.md`.
