# BlockForge Studio 0.1.0

First public release of the Windows visual C# IDE for GTA V single-player mod development.

## Download and use

Download **BlockForge-0.1.0-win-x64.zip**, extract it, and open **BlockForge/BlockForge.exe**. Keep the extracted folder intact. Windows with .NET Framework 4.8 is required.

The ZIP includes the IDE, Node/npm, pinned dependencies, the Roslyn C# compiler, framework SDKs, source, and offline rebuild instructions. **No Codex, OpenAI, or GitHub account is needed to run it.** Download **SHA256SUMS.txt** to verify the archive.

## Included

- Structured blocks for C#, GTA world/player/entities, LemonUI, and iFruitAddon2.
- Nested conditions and loops, typed values, project search, drag placement, undo/redo, and disk autosave.
- Actual assembly API browser and custom .NET DLL references.
- Generated C# view, real DLL compilation, mapped compiler diagnostics, and mod release ZIP exports.
- Large-project tests above 15,000 generated lines, including a single method with 15,000 visual blocks.

This is a working early release. It does not include a GTA debugger, automatic arbitrary C# import-to-block conversion, or native FiveM/RAGE Plugin Hook project targets. Generated mods still need in-game testing for the intended GTA V edition and build.

Application source is MIT licensed. Third-party components retain their own licenses. See README.md, VALIDATION.md, THIRD-PARTY.md, and RECOVERY.md in the download or repository.
