# bootstrap_env.ps1: Sets up MozillaBuild environment for Spike S1
[CmdletBinding()]
param()

$ErrorActionPreference = "Stop"

$mozillaBuildPath = "C:\mozilla-build"
$startShell = Join-Path $mozillaBuildPath "start-shell.bat"

if (Test-Path $startShell) {
    Write-Host "[OK] MozillaBuild is already installed at $mozillaBuildPath"
    exit 0
}

Write-Host "[*] MozillaBuild not detected. Downloading MozillaBuildSetup-Latest.exe..."
$installerUrl = "https://ftp.mozilla.org/pub/mozilla/libraries/win32/MozillaBuildSetup-Latest.exe"
$tempInstaller = Join-Path $env:TEMP "MozillaBuildSetup-Latest.exe"

curl.exe -L --progress-bar -o $tempInstaller $installerUrl

if (-not (Test-Path $tempInstaller)) {
    Write-Error "Failed to download installer from $installerUrl"
    exit 1
}

$sevenZip = "C:\Program Files\7-Zip\7z.exe"
if (Test-Path $sevenZip) {
    Write-Host "[*] Extracting MozillaBuild directly via 7-Zip into $mozillaBuildPath..."
    & $sevenZip x -y "-o$mozillaBuildPath" $tempInstaller | Out-Null
} else {
    Write-Host "[*] Running silent installation to $mozillaBuildPath (NSIS /S)..."
    & cmd.exe /c "$tempInstaller /S /D=$mozillaBuildPath"
}

Remove-Item -Path $tempInstaller -Force -ErrorAction SilentlyContinue

if (Test-Path $startShell) {
    Write-Host "[SUCCESS] MozillaBuild installed successfully at $mozillaBuildPath"
    exit 0
} else {
    Write-Error "MozillaBuild installation failed: $startShell not found"
    exit 1
}
