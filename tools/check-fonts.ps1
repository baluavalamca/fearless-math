$b = 'C:\Users\eswar\AppData\Roaming\Claude\local-agent-mode-sessions\480831a7-1d8b-4338-9001-1dd6869e279c\b006c522-eca0-46e8-a751-4083e67297c4\local_174c6bdb-303f-4317-a93e-71145724184b\outputs\fearless-math\node_modules\@fontsource'
foreach ($n in @('noto-sans-devanagari','noto-sans-telugu')) {
  $p = Join-Path (Join-Path $b $n) '400.css'
  if (Test-Path $p) { Write-Output ($n + ' OK') } else { Write-Output ($n + ' MISSING') }
}
