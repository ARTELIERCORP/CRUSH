# scripts/build.ps1: Triggers artifact build using MozillaBuild
[CmdletBinding()]
param(
    [string]$TargetDir = "engine",
    [switch]$Clobber
)

$ErrorActionPreference = "Stop"

$workspaceRoot = Split-Path -Parent $PSScriptRoot
$enginePath = Join-Path $workspaceRoot $TargetDir
$bashPath = "C:\mozilla-build\msys2\usr\bin\bash.exe"

if (-not (Test-Path $bashPath)) {
    Write-Error "MozillaBuild bash not found at $bashPath. Please run sandbox/s1_artifact_build/bootstrap_env.ps1 first."
    exit 1
}

if (-not (Test-Path (Join-Path $enginePath "mach"))) {
    Write-Error "Mach not found at $enginePath\mach. Please run scripts/sync-engine.ps1 first."
    exit 1
}

# Convert Windows path to MSYS2 POSIX path
$posixPath = $enginePath.Replace("\", "/").Replace("C:", "/c")

$machCmd = "./mach build"
if ($Clobber) {
    $machCmd = "./mach clobber && $machCmd"
}

$cmd = "export PATH=/c/mozilla-build/python3:/c/mozilla-build/bin:`$PATH; cd '$posixPath' && $machCmd"

Write-Host "[*] Executing mach build in $enginePath..."
$buildTimer = [System.Diagnostics.Stopwatch]::StartNew()

$env:MSYS2_PATH_TYPE = "inherit"
& $bashPath -l -c $cmd

$buildTimer.Stop()
$exitCode = $LASTEXITCODE

if ($exitCode -eq 0) {
    Write-Host "[SUCCESS] Build completed successfully in $($buildTimer.Elapsed.TotalSeconds.ToString('F1'))s"
} else {
    Write-Error "Build failed with exit code $exitCode after $($buildTimer.Elapsed.TotalSeconds.ToString('F1'))s"
}

exit $exitCode
