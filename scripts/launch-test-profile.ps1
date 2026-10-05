# scripts/launch-test-profile.ps1: Spawns Crush in an isolated profile with policies and extensions
[CmdletBinding()]
param(
    [string]$Url = "https://www.youtube.com",
    [switch]$KillStale
)

$ErrorActionPreference = "Stop"

$workspaceRoot = Split-Path -Parent $PSScriptRoot
$firefoxExe = Join-Path $workspaceRoot "engine\objdir-crush\dist\bin\firefox.exe"
$profileDir = Join-Path $workspaceRoot "sandbox\s3_google_signin_drm\profile"

if (-not (Test-Path $firefoxExe)) {
    Write-Error "Firefox binary not found at $firefoxExe. Run scripts/build.ps1 first."
    exit 1
}

# Close any running instance if KillStale is set or if parent.lock is held
$stale = Get-Process firefox -ErrorAction SilentlyContinue | Where-Object { $_.Path -like "*crush*" }
if ($stale) {
    if ($KillStale -or (Test-Path (Join-Path $profileDir "parent.lock"))) {
        Write-Host "[*] Closing stale Crush processes to apply new policies, extensions, and preferences..."
        $stale | Stop-Process -Force
        Start-Sleep -Milliseconds 800
    }
}

# Ensure extensions, preferences, and policies are synchronized
$syncScript = Join-Path $PSScriptRoot "sync-extensions.ps1"
if (Test-Path $syncScript) {
    & powershell -ExecutionPolicy Bypass -File $syncScript
}

if (-not (Test-Path $profileDir)) {
    New-Item -ItemType Directory -Path $profileDir -Force | Out-Null
    Write-Host "[*] Initialized clean test profile directory at $profileDir"
}

Write-Host "[*] Launching Crush with isolated test profile at $Url..."
Start-Process -FilePath $firefoxExe -ArgumentList @("-no-remote", "-profile", "`"$profileDir`"", "`"$Url`"")
