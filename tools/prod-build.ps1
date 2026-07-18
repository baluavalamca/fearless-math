$ErrorActionPreference = 'Stop'
$repo = 'C:\Users\eswar\AppData\Roaming\Claude\local-agent-mode-sessions\480831a7-1d8b-4338-9001-1dd6869e279c\b006c522-eca0-46e8-a751-4083e67297c4\local_174c6bdb-303f-4317-a93e-71145724184b\outputs\fearless-math'
$junction = 'C:\fmbuild'

# Step A: vite build from the REAL path (rollup html plugin needs CWD == config root)
Set-Location $repo
Write-Output '=== VITE BUILD (real path) ==='
& npx vite build
if ($LASTEXITCODE -ne 0) { Write-Output "VITE_FAILED exit=$LASTEXITCODE"; exit 1 }

# Ensure short-path junction for NSIS
if (Test-Path $junction) {
  $item = Get-Item $junction -Force
  if ($item.Target -ne $repo) { cmd /c rmdir $junction | Out-Null; cmd /c mklink /J $junction "$repo" | Out-Null }
} else {
  cmd /c mklink /J $junction "$repo" | Out-Null
}
Write-Output "JUNCTION_READY $junction"

# Step B: electron-builder --win from the JUNCTION (short paths for NSIS)
Set-Location $junction
Write-Output '=== ELECTRON-BUILDER --win (junction path) ==='
& npx electron-builder --win
if ($LASTEXITCODE -ne 0) { Write-Output "EB_FAILED exit=$LASTEXITCODE"; exit 1 }

Write-Output '=== OUTPUT ==='
foreach ($d in @('dist','release','out')) {
  $p = Join-Path $junction $d
  if (Test-Path $p) {
    Get-ChildItem $p -File -ErrorAction SilentlyContinue | Where-Object { $_.Extension -in '.exe','.blockmap','.yml' } | ForEach-Object { Write-Output ($d + '\' + $_.Name + '  ' + [math]::Round($_.Length/1MB,1) + ' MB') }
  }
}
Write-Output 'BUILD_DONE'
