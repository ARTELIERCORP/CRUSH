# scripts/sync-engine.ps1: Clones shallow upstream engine and configures artifact build
[CmdletBinding()]
param(
    [string]$Version = "157.0",
    [string]$TargetDir = "engine"
)

$ErrorActionPreference = "Stop"

$workspaceRoot = Split-Path -Parent $PSScriptRoot
$enginePath = Join-Path $workspaceRoot $TargetDir
$sevenZip = "C:\Program Files\7-Zip\7z.exe"

if (-not (Test-Path $enginePath)) {
    Write-Host "[*] Fetching Firefox Release $Version source tarball from Mozilla CDN..."
    $archiveUrl = "https://archive.mozilla.org/pub/firefox/releases/$Version/source/firefox-$Version.source.tar.xz"
    $tempArchive = Join-Path $env:TEMP "firefox-$Version.source.tar.xz"

    $dlTimer = [System.Diagnostics.Stopwatch]::StartNew()
    if (-not (Test-Path $tempArchive)) {
        curl.exe -L --progress-bar -o $tempArchive $archiveUrl
    } else {
        Write-Host "[OK] Using existing cached source archive at $tempArchive"
    }
    $dlTimer.Stop()
    Write-Host "[OK] Archive ready in $($dlTimer.Elapsed.TotalSeconds.ToString('F1'))s"

    Write-Host "[*] Extracting source tree via 7-Zip stream into $workspaceRoot..."
    $extractTimer = [System.Diagnostics.Stopwatch]::StartNew()
    $extractDest = $workspaceRoot
    cmd.exe /c "`"$sevenZip`" x -so `"$tempArchive`" | `"$sevenZip`" x -si -ttar -o`"$extractDest`""

    $extractedFolder = Join-Path $workspaceRoot "firefox-$Version"
    if (Test-Path $extractedFolder) {
        Rename-Item -Path $extractedFolder -NewName $TargetDir
    }
    $extractTimer.Stop()
    Write-Host "[OK] Extraction completed in $($extractTimer.Elapsed.TotalSeconds.ToString('F1'))s"
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
