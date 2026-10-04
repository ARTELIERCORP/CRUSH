# scripts/sync-engine.ps1: Clones shallow upstream engine and configures artifact build
[CmdletBinding()]
param(
    [string]$Branch = "release",
    [string]$TargetDir = "engine"
)

$ErrorActionPreference = "Stop"

$workspaceRoot = Split-Path -Parent $PSScriptRoot
$enginePath = Join-Path $workspaceRoot $TargetDir

if (-not (Test-Path $enginePath)) {
    Write-Host "[*] Shallow cloning Firefox engine (branch: $Branch) into $enginePath..."
    $cloneTimer = [System.Diagnostics.Stopwatch]::StartNew()
    git clone --depth 1 --branch $Branch https://github.com/mozilla-firefox/firefox $enginePath
    $cloneTimer.Stop()
    Write-Host "[OK] Engine shallow clone completed in $($cloneTimer.Elapsed.TotalSeconds.ToString('F1'))s"
} else {
    Write-Host "[OK] Engine directory already present at $enginePath"
}

# Ensure mozconfig is present for artifact builds
$mozconfigPath = Join-Path $enginePath "mozconfig"
$mozconfigContent = @"
# Crush Browser artifact build configuration
ac_add_options --enable-artifact-builds
mk_add_options MOZ_OBJDIR=@TOPSRCDIR@/objdir-crush
"@

Set-Content -Path $mozconfigPath -Value $mozconfigContent -Encoding utf8 -Force
Write-Host "[OK] Written artifact build mozconfig to $mozconfigPath"

$machPath = Join-Path $enginePath "mach"
if (Test-Path $machPath) {
    Write-Host "[SUCCESS] Mach entrypoint verified at $machPath"
    exit 0
} else {
    Write-Error "Mach entrypoint missing at $machPath"
    exit 1
}
