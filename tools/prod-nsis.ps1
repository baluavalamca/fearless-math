$ErrorActionPreference = 'Stop'
$junction = 'C:\fmbuild'
Set-Location $junction
$env:NODE_PRESERVE_SYMLINKS = '1'
$env:NODE_PRESERVE_SYMLINKS_MAIN = '1'
Write-Output '=== ELECTRON-BUILDER --win (preserve-symlinks, short path) ==='
& npx electron-builder --win
if ($LASTEXITCODE -ne 0) { Write-Output "EB_FAILED exit=$LASTEXITCODE"; exit 1 }
Write-Output '=== OUTPUT ==='
Get-ChildItem "$junction\release" -File -ErrorAction SilentlyContinue | Where-Object { $_.Extension -in '.exe','.blockmap','.yml' } | ForEach-Object { Write-Output ($_.Name + '  ' + [math]::Round($_.Length/1MB,1) + ' MB') }
Write-Output 'NSIS_DONE'
