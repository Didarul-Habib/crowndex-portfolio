# CrownDEX V4: writes PUBLIC Supabase connection details for Vite.
# Never put a service_role or secret key in frontend env vars.
$ErrorActionPreference = 'Stop'
& {
  try {
    $Project = 'I:\portfolio-site'
    if (-not (Test-Path -LiteralPath (Join-Path $Project 'package.json'))) { throw 'CrownDEX site not found on I drive.' }
    Set-Location $Project
    Write-Host "`nCROWNDEX / ADMIN BACKEND SETUP" -ForegroundColor Cyan
    Write-Host 'Find your Project URL and publishable key in Supabase > Project Settings > API Keys.' -ForegroundColor Gray
    $Url = (Read-Host 'Supabase Project URL, e.g. https://xxxxx.supabase.co').Trim().TrimEnd('/')
    $Key = (Read-Host 'Supabase PUBLISHABLE key (NOT secret/service_role)').Trim()
    if ($Url -notmatch '^https://[a-z0-9-]+\.supabase\.co$') { throw 'Expected a Supabase HTTPS project URL.' }
    if (-not $Key -or $Key.Length -lt 15 -or $Key.StartsWith('sb_secret_') -or $Key -match 'service_role') { throw 'Secret/service_role keys must NEVER be used in a browser app.' }
    if ($Key.StartsWith('eyJ')) {
      try {
        $Part = $Key.Split('.')[1].Replace('-','+').Replace('_','/')
        $Part = $Part.PadRight([int][Math]::Ceiling($Part.Length/4.0)*4,'=')
        $Payload = [Text.Encoding]::UTF8.GetString([Convert]::FromBase64String($Part)) | ConvertFrom-Json
        if ($Payload.role -ne 'anon') { throw 'This JWT is NOT an anon/publishable client key. Cancelled.' }
      } catch { throw 'Could not safely verify this legacy key. Use the modern sb_publishable_ key.' }
    } elseif (-not $Key.StartsWith('sb_publishable_')) {
      throw 'Please use the sb_publishable_ key (not the secret key).'
    }
    $EnvPath = Join-Path $Project '.env.local'
    $Text = "VITE_SUPABASE_URL=$Url`nVITE_SUPABASE_PUBLISHABLE_KEY=$Key`n"
    [IO.File]::WriteAllText($EnvPath,$Text,[Text.UTF8Encoding]::new($false))
    $ignore = Join-Path $Project '.gitignore'
    if (Test-Path $ignore) {
      $Current = Get-Content $ignore -Raw
      if ($Current -notmatch '(?m)^\.env\.local\s*$' -and $Current -notmatch '(?m)^\.env\.\*\s*$') {
        Add-Content -Path $ignore -Value "`n.env.local" -Encoding utf8
      }
    }
    Write-Host '[OK] Public browser configuration saved in .env.local (not uploaded).' -ForegroundColor Green
    Write-Host 'Next: npm.cmd run build ; npm.cmd run preview' -ForegroundColor Cyan
    Write-Host 'Make sure you ran both schema.sql and promote_admin.sql inside Supabase SQL Editor.' -ForegroundColor Yellow
  } catch { Write-Host "[ERROR] $($_.Exception.Message)" -ForegroundColor Red }
}
