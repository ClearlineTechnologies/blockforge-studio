$ErrorActionPreference = 'Stop'
$appRoot = [IO.Path]::GetFullPath((Join-Path $PSScriptRoot '..'))
$runtimeRoot = Join-Path $appRoot 'runtime'
New-Item -ItemType Directory -Force $runtimeRoot | Out-Null
$archive = Join-Path $runtimeRoot 'npm-11.6.0.tgz'
Invoke-WebRequest -Uri 'https://registry.npmjs.org/npm/-/npm-11.6.0.tgz' -OutFile $archive -UseBasicParsing
if ((Get-FileHash -LiteralPath $archive -Algorithm SHA256).Hash -ne 'DDF7E6E42AE5B9E28D84945D1C37188F9A741AF492507B513B3E80AF5AEBA4F1') { throw 'npm archive checksum mismatch.' }
$tempRoot = Join-Path $runtimeRoot 'npm-extract'
New-Item -ItemType Directory -Force $tempRoot | Out-Null
tar -xzf $archive -C $tempRoot
if ($LASTEXITCODE -ne 0) { throw 'Could not extract npm.' }
New-Item -ItemType Directory -Force (Join-Path $runtimeRoot 'npm') | Out-Null
Copy-Item (Join-Path $tempRoot 'package\*') -Destination (Join-Path $runtimeRoot 'npm') -Recurse -Force
