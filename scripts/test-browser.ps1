$ErrorActionPreference = 'Stop'
$env:PORT = '4174'
if ([string]::IsNullOrWhiteSpace($env:RUNNER_TEMP)) { $env:BLOCKFORGE_DATA = Join-Path (Get-Location) 'test-results\browser-data' }
else { $env:BLOCKFORGE_DATA = Join-Path $env:RUNNER_TEMP 'blockforge-browser-tests' }
$server = Start-Process -FilePath (Get-Command node).Source -ArgumentList @('server/index.mjs','--production') -WindowStyle Hidden -PassThru
try {
  $ready = $false
  for ($attempt=0; $attempt -lt 40; $attempt++) {
    try { $status=Invoke-RestMethod 'http://127.0.0.1:4174/api/status' -TimeoutSec 2; if ($status.app -eq 'blockforge-studio') { $ready=$true;break } } catch {}
    Start-Sleep -Milliseconds 250
  }
  if (-not $ready) { throw 'The test server did not start.' }
  node tests/workflows.mjs
  if ($LASTEXITCODE -ne 0) { throw 'Browser workflow tests failed.' }
} finally {
  if (-not $server.HasExited) { Stop-Process -Id $server.Id }
}
