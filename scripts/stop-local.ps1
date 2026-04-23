$ErrorActionPreference = "Stop"

$root = Split-Path -Parent $PSScriptRoot
$pidFile = Join-Path $root ".local-run\pids.json"

if (-not (Test-Path $pidFile)) {
  Write-Host "No local AeroSentinel X process file found."
  exit 0
}

$entries = Get-Content $pidFile | ConvertFrom-Json

foreach ($entry in $entries) {
  try {
    taskkill /PID $entry.pid /T /F | Out-Null
    Write-Host "Stopped $($entry.name) ($($entry.pid))"
  } catch {
    Write-Host "Process $($entry.name) ($($entry.pid)) was already stopped"
  }
}

$ports = 1883, 3000, 5173, 5174, 5175
foreach ($port in $ports) {
  $listeners = Get-NetTCPConnection -LocalPort $port -State Listen -ErrorAction SilentlyContinue |
    Select-Object -ExpandProperty OwningProcess -Unique
  foreach ($listener in $listeners) {
    try {
      taskkill /PID $listener /T /F | Out-Null
      Write-Host "Stopped listener on port $port ($listener)"
    } catch {
      Write-Host "Listener on port $port already stopped"
    }
  }
}

Remove-Item $pidFile -Force
