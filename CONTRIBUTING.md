# Contributing

BlockForge is an early visual C# IDE for GTA V single-player mods. Bug reports and focused pull requests are welcome.

Use Windows with .NET Framework 4.8 and Node.js 24.19.0. Install dependencies with `npm ci`, restore versioned framework/compiler packages with `powershell -ExecutionPolicy Bypass -File scripts/setup-toolchain.ps1`, and run `npm run dev`.

Before submitting a change, run `npm run build` and `npm test`. Changes to blocks should include a meaningful generator or compiler test. UI behavior can be exercised with `tests/workflows.mjs` against an isolated server as described in `VALIDATION.md`.

Do not commit `.data`, credentials, private mods, downloaded SDKs, or generated release archives. Keep dependency versions locked. Do not present compilation as proof of in-game compatibility.

Contributions are provided under the repository's MIT license. Third-party components retain their own licenses.
