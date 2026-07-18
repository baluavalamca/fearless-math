$ErrorActionPreference = 'Stop'
$repo = 'C:\Users\eswar\AppData\Roaming\Claude\local-agent-mode-sessions\480831a7-1d8b-4338-9001-1dd6869e279c\b006c522-eca0-46e8-a751-4083e67297c4\local_174c6bdb-303f-4317-a93e-71145724184b\outputs\fearless-math'
$junction = 'C:\fmbuild'

Set-Location $repo
Write-Output '=== TESTS ==='
& npm test
if ($LASTEXITCODE -ne 0) { Write-Output "TESTS_FAILED"; exit 1 }
Write-Output '=== VALIDATE CONTENT (en) ==='
& npm run validate-content
if ($LASTEXITCODE -ne 0) { Write-Output "VALIDATE_FAILED"; exit 1 }
Write-Output '=== VALIDATE i18n PARITY ==='
& npm run validate-i18n
if ($LASTEXITCODE -ne 0) { Write-Output "I18N_FAILED"; exit 1 }

Write-Output '=== VITE BUILD (real path, local vite) ==='
& npm run build
if ($LASTEXITCODE -ne 0) { Write-Output "VITE_FAILED"; exit 1 }

if (Test-Path $junction) {
  $item = Get-Item $junction -Force
  if ($item.Target -ne $repo) { cmd /c rmdir $junction | Out-Null; cmd /c mklink /J $junction "$repo" | Out-Null }
} else { cmd /c mklink /J $junction "$repo" | Out-Null }

Set-Location $junction
$env:NODE_PRESERVE_SYMLINKS = '1'
$env:NODE_PRESERVE_SYMLINKS_MAIN = '1'
Write-Output '=== ELECTRON-BUILDER --win (junction + preserve-symlinks) ==='
& npx electron-builder --win
if ($LASTEXITCODE -ne 0) { Write-Output "EB_FAILED"; exit 1 }

Write-Output '=== OUTPUT ==='
Get-ChildItem "$junction\release" -File -ErrorAction SilentlyContinue | Where-Object { $_.Extension -in '.exe','.yml' } | ForEach-Object { Write-Output ($_.Name + '  ' + [math]::Round($_.Length/1MB,1) + ' MB') }
Write-Output 'BUILD_DONE'
