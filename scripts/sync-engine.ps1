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
ac_add_options --disable-tests
mk_add_options MOZ_OBJDIR=@TOPSRCDIR@/objdir-crush
"@

Set-Content -Path $mozconfigPath -Value $mozconfigContent -Encoding ascii -Force
Write-Host "[OK] Written artifact build mozconfig to $mozconfigPath"

# Ensure target.zip is available for artifact builds
$targetZip = Join-Path $env:TEMP "target.zip"
if (-not (Test-Path $targetZip)) {
    Write-Host "[*] Fetching Firefox $Version win64-opt artifact package (target.zip)..."
    $artifactUrl = "https://firefoxci.taskcluster-artifacts.net/bd9WgLGgTzeNoMvHpBx2Wg/1/public/build/target.zip"
    curl.exe -L -o $targetZip $artifactUrl
    Write-Host "[OK] target.zip fetched to $targetZip"
} else {
    Write-Host "[OK] target.zip already cached at $targetZip"
}

# Ensure non-interactive machrc is written to prevent stdin prompts
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

# Ensure MSYS2 tmp directory exists so bash never warns and breaks mozconfig parser
$mbPath = if ($env:MOZILLABUILD) { $env:MOZILLABUILD } else { "C:\mozilla-build" }
if (Test-Path $mbPath) {
    New-Item -ItemType Directory -Path (Join-Path $mbPath "msys2\tmp"), (Join-Path $mbPath "msys2\var\tmp") -Force | Out-Null
}

# Ensure Gecko VCS detection identifies engine as a Git repository
if (-not (Test-Path (Join-Path $enginePath ".git"))) {
    Write-Host "[*] Initializing git repository in $enginePath for artifact VCS discovery..."
    git -C $enginePath init -q
    git -C $enginePath config user.name "Crush CI"
    git -C $enginePath config user.email "ci@crush.browser"
}

# Patch artifacts.py and artifact_commands.py for decoupled tarball trees
$artifactsPy = Join-Path $enginePath "python\mozbuild\mozbuild\artifacts.py"
if (Test-Path $artifactsPy) {
    $content = Get-Content $artifactsPy -Raw
    if ($content -notmatch "git = which\(`"git`"\)") {
        $content = $content -replace 'if \(hg and git\) or \(not hg and not git\):', "if not hg and not git:`n            from mozfile import which`n            git = which(`"git`") or `"git`"`n        if (hg and git) or (not hg and not git):"
        Set-Content -Path $artifactsPy -Value $content -Encoding ascii -Force
        Write-Host "[OK] Patched artifacts.py with git fallback"
    }
}

$artifactCmdsPy = Join-Path $enginePath "python\mozbuild\mozbuild\artifact_commands.py"
if (Test-Path $artifactCmdsPy) {
    $content = Get-Content $artifactCmdsPy -Raw
    if ($content -notmatch "git = which\(`"git`"\)") {
        $content = $content -replace 'topsrcdir = command_context\.substs\.get', "if not hg and not git:`n        from mozfile import which`n        git = which(`"git`") or `"git`"`n`n    topsrcdir = command_context.substs.get"
        Set-Content -Path $artifactCmdsPy -Value $content -Encoding ascii -Force
        Write-Host "[OK] Patched artifact_commands.py with git fallback"
    }
}

$machPath = Join-Path $enginePath "mach"
if (Test-Path $machPath) {
    Write-Host "[SUCCESS] Mach entrypoint verified at $machPath"
    exit 0
} else {
    Write-Error "Mach entrypoint missing at $machPath"
    exit 1
}

