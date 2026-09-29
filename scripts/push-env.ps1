# Copies variables from .env.local into the linked Vercel project (Production).
# Run from the kargo-hiring folder:  powershell -ExecutionPolicy Bypass -File scripts\push-env.ps1
$skip = @("VERCEL_OIDC_TOKEN")
$lines = Get-Content ".env.local" | Where-Object { $_ -match '^\s*[A-Z_]+=' }

foreach ($line in $lines) {
  $i = $line.IndexOf("=")
  $name = $line.Substring(0, $i).Trim()
  $value = $line.Substring($i + 1).Trim().Trim('"')
  if ($skip -contains $name -or $value -eq "") { continue }
  Write-Host "Setting $name ..."
  npx vercel env add $name production --value "$value" --force --yes | Out-Null
  if ($LASTEXITCODE -ne 0) { Write-Host "  failed: $name" -ForegroundColor Red }
}
Write-Host "Done. Variables now in Vercel:"
npx vercel env ls production
