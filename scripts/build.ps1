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
Remove-Item Env:\MOZ_AUTOMATION -ErrorAction SilentlyContinue
$env:MOZ_ARTIFACT_FILE = "$env:TEMP\target.zip"

if (-not (Test-Path $env:MOZ_ARTIFACT_FILE)) {
    Write-Host "[*] target.zip missing from TEMP. Downloading official Taskcluster artifact..."
    $artifactUrl = "https://firefoxci.taskcluster-artifacts.net/bd9WgLGgTzeNoMvHpBx2Wg/1/public/build/target.zip"
    curl.exe -L -o $env:MOZ_ARTIFACT_FILE $artifactUrl
}

# Ensure non-interactive machrc is written without BOM
$machrcDir = Join-Path $env:USERPROFILE ".mozbuild"
if (-not (Test-Path $machrcDir)) {
    New-Item -ItemType Directory -Path $machrcDir -Force | Out-Null
}
$machrcPath = Join-Path $machrcDir "machrc"
@"
[mach_telemetry]
is_enabled = False
is_set_up = True
[build]
telemetry = false
"@ | Set-Content -Path $machrcPath -Encoding ascii -Force

$pythonExe = Join-Path $env:MOZILLABUILD "python3\python3.exe"
$machScript = Join-Path $enginePath "mach"

if ($Clobber) {
    Write-Host "[*] Clobbering previous build..."
    Set-Location $enginePath
    & $pythonExe $machScript clobber
    Set-Location $workspaceRoot
}

Write-Host "[*] Executing artifact build via mach in $enginePath..."
$buildTimer = [System.Diagnostics.Stopwatch]::StartNew()

Set-Location $enginePath
& $pythonExe $machScript build
$exitCode = $LASTEXITCODE
Set-Location $workspaceRoot

$buildTimer.Stop()

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
