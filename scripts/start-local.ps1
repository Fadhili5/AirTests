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

  try {
    if (Test-Path $outLog) { Remove-Item $outLog -Force -ErrorAction Stop }
  } catch {
    $outLog = Join-Path $runDir ("{0}-{1}.out.log" -f $Name, (Get-Date -Format "yyyyMMddHHmmss"))
  }

  try {
    if (Test-Path $errLog) { Remove-Item $errLog -Force -ErrorAction Stop }
  } catch {
    $errLog = Join-Path $runDir ("{0}-{1}.err.log" -f $Name, (Get-Date -Format "yyyyMMddHHmmss"))
  }

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

function Wait-ForPort {
  param(
    [int]$Port,
    [int]$TimeoutSeconds = 45
  )

  $deadline = (Get-Date).AddSeconds($TimeoutSeconds)
  while ((Get-Date) -lt $deadline) {
    $listener = Get-NetTCPConnection -LocalPort $Port -State Listen -ErrorAction SilentlyContinue
    if ($listener) {
      return
    }
    Start-Sleep -Milliseconds 500
  }

  throw "Port $Port did not open within $TimeoutSeconds seconds."
}

$started = @()
$started += Start-OrAtmProcess -Name "broker" -Command "set MQTT_PORT=1883&& npm.cmd --workspace broker run dev"
Wait-ForPort -Port 1883

$started += Start-OrAtmProcess -Name "backend" -Command "set AUTH_DISABLED=true&& set REDIS_DISABLED=true&& set POSTGRES_DISABLED=true&& set RISK_SERVICE_DISABLED=true&& set ONE_RECORD_ENABLED=false&& set OVERRIDE_ALLOWABLE_EXPOSURE_MINUTES=5&& set WARNING_THRESHOLD_PERCENT=80&& set MQTT_URL=mqtt://127.0.0.1:1883&& npm.cmd --workspace backend run start:local"
Wait-ForPort -Port 3000

$started += Start-OrAtmProcess -Name "frontend" -Command "set VITE_AUTH_DISABLED=true&& set VITE_API_URL=http://localhost:3000&& set VITE_SOCKET_URL=http://localhost:3000&& npm.cmd --workspace frontend run build&& npm.cmd --workspace frontend run preview -- --host 0.0.0.0 --port 5173 --strictPort"
Wait-ForPort -Port 5173

$started += Start-OrAtmProcess -Name "simulator" -Command "set MQTT_URL=mqtt://127.0.0.1:1883&& set PUBLISH_INTERVAL_MS=5000&& set ALERT_DEMO_MODE=true&& set SCENARIO=heatwave&& npm.cmd --workspace simulator run dev"

$started | ConvertTo-Json | Set-Content (Join-Path $runDir "pids.json")

Write-Host "AeroSentinel X local stack started."
Write-Host "Dashboard: http://localhost:5173"
Write-Host "API: http://localhost:3000"
Write-Host "Logs: $runDir"
