$ErrorActionPreference = "Stop"

$root = Split-Path -Parent $PSScriptRoot
$pidFile = Join-Path $root ".local-run\pids.json"

if (-not (Test-Path $pidFile)) {
  Write-Host "No local OR-ATM process file found."
  exit 0
}

$entries = Get-Content $pidFile | ConvertFrom-Json

foreach ($entry in $entries) {
  try {
    Stop-Process -Id $entry.pid -Force -ErrorAction Stop
    Write-Host "Stopped $($entry.name) ($($entry.pid))"
  } catch {
    Write-Host "Process $($entry.name) ($($entry.pid)) was already stopped"
  }
}

Remove-Item $pidFile -Force
