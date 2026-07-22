$ErrorActionPreference = 'Continue'
$junction = 'C:\fmbuild'
$log = 'C:\fmbuild\release\eb-build.log'

Set-Location $junction
$env:NODE_PRESERVE_SYMLINKS = '1'
$env:NODE_PRESERVE_SYMLINKS_MAIN = '1'
& npx electron-builder --win *> $log
if ($LASTEXITCODE -eq 0) { Add-Content $log 'EB_OK' } else { Add-Content $log "EB_FAILED_$LASTEXITCODE" }
