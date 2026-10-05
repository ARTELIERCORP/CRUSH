# scripts/build.ps1: Triggers artifact build using MozillaBuild
[CmdletBinding()]
param(
    [string]$TargetDir = "engine",
    [switch]$Clobber
)

$ErrorActionPreference = "Stop"

$workspaceRoot = Split-Path -Parent $PSScriptRoot
$enginePath = Join-Path $workspaceRoot $TargetDir
$machPs1 = Join-Path $enginePath "mach.ps1"

if (-not (Test-Path $machPs1)) {
    Write-Error "mach.ps1 not found at $machPs1. Please run scripts/sync-engine.ps1 first."
    exit 1
}

$env:MOZILLABUILD = "C:\mozilla-build"
$env:MACH_PS1_USE_MOZILLABUILD = "1"
$env:USE_MINTTY = "0"
$env:MSYS2_PATH_TYPE = "inherit"
$env:DISABLE_TELEMETRY = "1"
$env:MOZ_ARTIFACT_FILE = "$env:TEMP\target.zip"

$pythonExe = Join-Path $env:MOZILLABUILD "python3\python3.exe"
$machScript = Join-Path $enginePath "mach"

if ($Clobber) {
    Write-Host "[*] Clobbering previous build..."
    Push-Location $enginePath
    try {
        & $pythonExe $machScript clobber
    } finally {
        Pop-Location
    }
}

Write-Host "[*] Executing artifact build via mach in $enginePath..."
$buildTimer = [System.Diagnostics.Stopwatch]::StartNew()

Push-Location $enginePath
try {
    & $pythonExe $machScript build
} finally {
    Pop-Location
}

$buildTimer.Stop()
$exitCode = $LASTEXITCODE

if ($exitCode -eq 0) {
    Write-Host "[SUCCESS] Build completed successfully in $($buildTimer.Elapsed.TotalSeconds.ToString('F1'))s"
    
    $syncScript = Join-Path $PSScriptRoot "sync-extensions.ps1"
    if (Test-Path $syncScript) {
        Write-Host "[*] Synchronizing extensions and policies..."
        & powershell -ExecutionPolicy Bypass -File $syncScript
    }
} else {
    Write-Error "Build failed with exit code $exitCode after $($buildTimer.Elapsed.TotalSeconds.ToString('F1'))s"
}

exit $exitCode
