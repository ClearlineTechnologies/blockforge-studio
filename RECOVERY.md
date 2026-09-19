# Recovering BlockForge without the original machine or account

## Download and run

The public repository and release downloads are readable without signing into GitHub:

- Repository: https://github.com/ClearlineTechnologies/blockforge-studio
- Releases: https://github.com/ClearlineTechnologies/blockforge-studio/releases

Download `BlockForge-0.1.0-win-x64.zip` and `SHA256SUMS.txt` from the versioned release. Check the ZIP's SHA-256 hash using `Get-FileHash`, extract the archive, and open `BlockForge/BlockForge.exe` on Windows with .NET Framework 4.8.

The ZIP includes the application, source, pinned JS dependencies, Node.js and npm, compiler, framework reference assemblies, SDK DLLs, and license notices. It does not contain the original developer's projects, account credentials, or private data. It can run without OpenAI, Codex, a GitHub login, or a package registry connection.

## Rebuild offline from the Windows release

Run `Rebuild-BlockForge.cmd` from the extracted folder. It invokes the included npm/dependencies and C# compiler. Windows and .NET Framework 4.8 are still operating-system prerequisites; those are not embedded in this app archive.

## Rebuild from source

Clone or download the public source. Install the Node version in `.nvmrc`, then run:

```powershell
npm ci
powershell -ExecutionPolicy Bypass -File scripts/setup-toolchain.ps1
npm run build
npm test
npm run launcher
npm start
```

Source-only builds fetch packages from npm, NuGet, GitHub, and nodejs.org. Versions are pinned and framework archive checksums are recorded. The Windows ZIP is the stronger recovery copy because it already contains those dependencies.

## Keep independent copies

Losing access to the original account does not stop anonymous downloads while the public repository remains available. Account deletion, repository deletion, hosting policy changes, and platform outages can remove that copy. No GitHub setting promises ten years of retention.

For durable preservation, retain the versioned ZIP, SHA256SUMS, and source in more than one place. Anyone can fork or mirror the MIT-licensed application source. A complete Git backup can be created without logging in:

```powershell
git clone --mirror https://github.com/ClearlineTechnologies/blockforge-studio.git
git -C blockforge-studio.git bundle create ../blockforge-studio.bundle --all
```

Git history alone does not include GitHub release binaries. Save the release ZIP separately. Third-party dependencies retain their upstream license terms.
