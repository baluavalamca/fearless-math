$r = 'C:\fmbuild\release'
Get-ChildItem $r -File | Where-Object { $_.Extension -in '.exe','.yml','.blockmap' } | ForEach-Object {
  Write-Output ($_.Name + '  |  ' + [math]::Round($_.Length/1MB,2) + ' MB  |  ' + $_.LastWriteTime)
}
if (Test-Path (Join-Path $r 'win-unpacked\FearlessMath.exe')) { Write-Output 'UNPACKED_EXE_OK' } else { Write-Output 'UNPACKED_EXE_MISSING' }
