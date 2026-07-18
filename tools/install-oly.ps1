$ErrorActionPreference = 'Stop'
$src = 'C:\Users\eswar\AppData\Local\Programs\FearlessMath\resources\content-packs\cbse-class3-5-en-v1\concepts'
$repo = 'C:\Users\eswar\AppData\Roaming\Claude\local-agent-mode-sessions\480831a7-1d8b-4338-9001-1dd6869e279c\b006c522-eca0-46e8-a751-4083e67297c4\local_174c6bdb-303f-4317-a93e-71145724184b\outputs\fearless-math\content-packs\cbse-class3-5-en-v1\concepts'
$names = @('oly-vieta-formulas','oly-generating-functions','oly-recurrence-relations','oly-roots-of-unity','oly-graph-theory-basics','oly-euler-planar-graphs','oly-combinatorial-identities','oly-projective-cross-ratio')
if (!(Test-Path $src)) { Write-Output 'DST_MISSING'; exit 1 }
foreach ($n in $names) {
  Copy-Item -Path (Join-Path $repo ($n + '.json')) -Destination $src -Force
}
$count = (Get-ChildItem $src -Filter 'oly-*.json').Count
Write-Output ("OLY_FILES_TOTAL=" + $count)
