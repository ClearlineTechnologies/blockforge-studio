$ErrorActionPreference = 'Stop'
$appRoot = [IO.Path]::GetFullPath((Join-Path $PSScriptRoot '..'))
$downloadRoot = Join-Path $appRoot 'toolchain\downloads'
New-Item -ItemType Directory -Force $downloadRoot,(Join-Path $appRoot 'sdk'),(Join-Path $appRoot 'licenses') | Out-Null
$packages = @(
  @{Name='shvdn'; Url='https://github.com/scripthookvdotnet/scripthookvdotnet/releases/download/v3.6.0/ScriptHookVDotNet.zip'; Sha='B6B4B61BCE0437E295EBAB065CA437C95ED938E0169197726150047861478211'; Destination='toolchain\downloads\shvdn'},
  @{Name='lemon'; Url='https://api.nuget.org/v3-flatcontainer/lemonui.shvdn3/2.2.0/lemonui.shvdn3.2.2.0.nupkg'; Sha='AB9488022C5E36B7D923C12C1ADBC03BA2C7E95A2DF96A90E1DC98340AA85C2B'; Destination='toolchain\downloads\lemon'},
  @{Name='ifruit'; Url='https://github.com/Bob74/iFruitAddon2/releases/download/v3.1.1/iFruitAddon2-3.1.1.zip'; Sha='1AF5BE6349E4C8D39973551E5051A72FC354CDFE8B1757DF721629532C1B8579'; Destination='toolchain\downloads\ifruit'},
  @{Name='compiler'; Url='https://api.nuget.org/v3-flatcontainer/microsoft.net.compilers.toolset/4.14.0/microsoft.net.compilers.toolset.4.14.0.nupkg'; Sha='941A9CF3EA618D88D01A3DD6B1A45A06BCF07716A9F81CE4031CAA3EDD24A845'; Destination='toolchain\compiler'},
  @{Name='net48'; Url='https://api.nuget.org/v3-flatcontainer/microsoft.netframework.referenceassemblies.net48/1.0.3/microsoft.netframework.referenceassemblies.net48.1.0.3.nupkg'; Sha='8A7E348538E7EB91351696911689F49E3D4F63F8BAB517432BBE159B8B1104A2'; Destination='toolchain\net48'}
)
foreach ($package in $packages) {
  $archive = Join-Path $downloadRoot ($package.Name + '.zip')
  Write-Host ('Downloading ' + $package.Name)
  Invoke-WebRequest -Uri $package.Url -OutFile $archive -UseBasicParsing
  if ((Get-FileHash -LiteralPath $archive -Algorithm SHA256).Hash -ne $package.Sha) { throw ('Checksum mismatch for ' + $package.Name) }
  Expand-Archive -LiteralPath $archive -DestinationPath (Join-Path $appRoot $package.Destination) -Force
}
Copy-Item (Join-Path $downloadRoot 'shvdn\ScriptHookVDotNet3.*') (Join-Path $appRoot 'sdk') -Force
Copy-Item (Join-Path $downloadRoot 'lemon\lib\net48\LemonUI.SHVDN3.*') (Join-Path $appRoot 'sdk') -Force
Copy-Item -LiteralPath (Join-Path $downloadRoot 'ifruit\iFruitAddon2.dll') -Destination (Join-Path $appRoot 'sdk') -Force
Copy-Item -LiteralPath (Join-Path $downloadRoot 'shvdn\LICENSE.txt') -Destination (Join-Path $appRoot 'licenses\ScriptHookVDotNet.txt') -Force
Write-Host 'Versioned compiler and framework references are installed.'
