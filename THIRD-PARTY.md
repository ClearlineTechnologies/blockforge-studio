# Third-party components

BlockForge was created in this workspace. The following dependencies retain their upstream licenses and notices. The IDE's generated mod release ZIPs do not include these runtimes or SDK DLLs.

| Component | Source / notices |
| --- | --- |
| ScriptHookVDotNet 3.6.0 API | https://github.com/scripthookvdotnet/scripthookvdotnet — zlib license, copied into `licenses/ScriptHookVDotNet.txt` |
| LemonUI.SHVDN3 2.2.0 | https://github.com/LemonUIbyLemon/LemonUI — NuGet package declares MIT |
| iFruitAddon2 3.1.1 | https://github.com/Bob74/iFruitAddon2 — MIT license at the v3.1.1 release tag; copied into `licenses/iFruitAddon2.txt` |
| Roslyn compiler 4.14.0 | https://github.com/dotnet/roslyn — MIT; NuGet metadata and notices retained in `toolchain/compiler` |
| .NET Framework reference assemblies | Microsoft.NETFramework.ReferenceAssemblies.net48 1.0.3; metadata retained in `toolchain/net48` |
| Node.js | Bundled `runtime/node.exe`; Node.js and dependency license text in `licenses/Node.js.txt` |
| React, React DOM, Monaco, Lucide, TanStack Virtual, Express, JSZip, Multer | Package versions pinned in `package-lock.json`; license files retained in `node_modules` |
| DM Sans, IBM Plex Mono | Locally bundled fontsource packages; font license files retained in `node_modules/@fontsource-variable/dm-sans` and `node_modules/@fontsource/ibm-plex-mono` |
| Vite, TypeScript, Playwright | Development and verification tooling; license files retained in `node_modules` |

Official download URLs and SHA-256 checks for the compiler and framework archives are recorded in `scripts/setup-toolchain.ps1`.
