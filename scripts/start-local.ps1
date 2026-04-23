$ErrorActionPreference = "Stop"

$root = Split-Path -Parent $PSScriptRoot
$runDir = Join-Path $root ".local-run"

if (-not (Test-Path $runDir)) {
  New-Item -ItemType Directory -Path $runDir | Out-Null
}

function Start-OrAtmProcess {
  param(
    [string]$Name,
    [string]$Command
  )

  $outLog = Join-Path $runDir "$Name.out.log"
  $errLog = Join-Path $runDir "$Name.err.log"

  if (Test-Path $outLog) { Remove-Item $outLog -Force }
  if (Test-Path $errLog) { Remove-Item $errLog -Force }

  $process = Start-Process -FilePath "cmd.exe" `
    -ArgumentList "/c", $Command `
    -WorkingDirectory $root `
    -RedirectStandardOutput $outLog `
    -RedirectStandardError $errLog `
    -PassThru

  [PSCustomObject]@{
    name = $Name
    pid = $process.Id
  }
}

$started = @()
$started += Start-OrAtmProcess -Name "broker" -Command "set MQTT_PORT=1883&& npm.cmd --workspace broker run dev"
$started += Start-OrAtmProcess -Name "backend" -Command "set AUTH_DISABLED=true&& set REDIS_DISABLED=true&& set ONE_RECORD_ENABLED=false&& set MQTT_URL=mqtt://127.0.0.1:1883&& npm.cmd --workspace backend run start:local"
$started += Start-OrAtmProcess -Name "frontend" -Command "set VITE_AUTH_DISABLED=true&& set VITE_API_URL=http://localhost:3000&& set VITE_SOCKET_URL=http://localhost:3000&& npm.cmd --workspace frontend run dev -- --host"
$started += Start-OrAtmProcess -Name "simulator" -Command "set MQTT_URL=mqtt://127.0.0.1:1883&& set PUBLISH_INTERVAL_MS=5000&& npm.cmd --workspace simulator run dev"

$started | ConvertTo-Json | Set-Content (Join-Path $runDir "pids.json")

Write-Host "OR-ATM local stack started."
Write-Host "Dashboard: http://localhost:5173"
Write-Host "API: http://localhost:3000"
Write-Host "Logs: $runDir"
