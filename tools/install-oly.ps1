$ErrorActionPreference = 'Stop'
$src = 'C:\Users\eswar\AppData\Local\Programs\FearlessMath\resources\content-packs\cbse-class3-5-en-v1\concepts'
# Source repo concepts folder:
$repo = 'C:\Users\eswar\AppData\Roaming\Claude\local-agent-mode-sessions\480831a7-1d8b-4338-9001-1dd6869e279c\b006c522-eca0-46e8-a751-4083e67297c4\local_174c6bdb-303f-4317-a93e-71145724184b\outputs\fearless-math\content-packs\cbse-class3-5-en-v1\concepts'
$names = @('oly-modular-arithmetic','oly-euclidean-gcd','oly-fermat-little-theorem','oly-diophantine-equations','oly-inequalities-amgm','oly-functional-equations','oly-pigeonhole','oly-inclusion-exclusion','oly-invariants-parity','oly-cyclic-quadrilaterals','oly-power-of-a-point','oly-ceva-menelaus')
if (!(Test-Path $src)) { Write-Output 'DST_MISSING'; exit 1 }
foreach ($n in $names) {
  Copy-Item -Path (Join-Path $repo ($n + '.json')) -Destination $src -Force
}
$count = (Get-ChildItem $src -Filter 'oly-*.json').Count
Write-Output ("OLY_FILES_INSTALLED=" + $count)
