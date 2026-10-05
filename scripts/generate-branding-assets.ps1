# scripts/generate-branding-assets.ps1: Converts logo.png into multi-res ICO and PNG sets
[CmdletBinding()]
param(
    [string]$SourceLogo = "logo.png"
)

$ErrorActionPreference = "Stop"
$workspaceRoot = Split-Path -Parent $PSScriptRoot
$logoPath = Join-Path $workspaceRoot $SourceLogo

if (-not (Test-Path $logoPath)) {
    Write-Error "Source logo file not found at $logoPath"
    exit 1
}

Add-Type -AssemblyName System.Drawing

function Resize-Image {
    param(
        [System.Drawing.Image]$Image,
        [int]$Width,
        [int]$Height
    )
    $destRect = New-Object System.Drawing.Rectangle(0, 0, $Width, $Height)
    $destImage = New-Object System.Drawing.Bitmap($Width, $Height, [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
    $destImage.SetResolution($Image.HorizontalResolution, $Image.VerticalResolution)

    $graphics = [System.Drawing.Graphics]::FromImage($destImage)
    $graphics.CompositingMode = [System.Drawing.Drawing2D.CompositingMode]::SourceOver
    $graphics.CompositingQuality = [System.Drawing.Drawing2D.CompositingQuality]::HighQuality
    $graphics.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
    $graphics.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
    $graphics.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality

    $graphics.DrawImage($Image, $destRect, 0, 0, $Image.Width, $Image.Height, [System.Drawing.GraphicsUnit]::Pixel)
    $graphics.Dispose()
    return $destImage
}

function New-MultiFrameIco {
    param(
        [System.Drawing.Image]$SourceImage,
        [int[]]$Sizes,
        [string]$OutputPath
    )
    $msList = @()
    foreach ($size in $Sizes) {
        $resized = Resize-Image -Image $SourceImage -Width $size -Height $size
        $ms = New-Object System.IO.MemoryStream
        $resized.Save($ms, [System.Drawing.Imaging.ImageFormat]::Png)
        $resized.Dispose()
        $msList += @{ Size = $size; Stream = $ms }
    }

    $fs = New-Object System.IO.FileStream($OutputPath, [System.IO.FileMode]::Create)
    $bw = New-Object System.IO.BinaryWriter($fs)

    # ICONDIR header
    $bw.Write([uint16]0)                   # idReserved
    $bw.Write([uint16]1)                   # idType (1 = icon)
    $bw.Write([uint16]$msList.Count)       # idCount

    $offset = 6 + ($msList.Count * 16)

    # ICONDIRENTRY list
    foreach ($item in $msList) {
        $bSize = if ($item.Size -ge 256) { [byte]0 } else { [byte]$item.Size }
        $bw.Write([byte]$bSize)            # bWidth
        $bw.Write([byte]$bSize)            # bHeight
        $bw.Write([byte]0)                 # bColorCount
        $bw.Write([byte]0)                 # bReserved
        $bw.Write([uint16]1)               # wPlanes
        $bw.Write([uint16]32)              # wBitCount
        $bw.Write([uint32]$item.Stream.Length) # dwBytesInRes
        $bw.Write([uint32]$offset)         # dwImageOffset
        $offset += $item.Stream.Length
    }

    # Image data
    foreach ($item in $msList) {
        $bytes = $item.Stream.ToArray()
        $bw.Write($bytes)
        $item.Stream.Dispose()
    }

    $bw.Flush()
    $bw.Dispose()
    $fs.Dispose()
}

Write-Host "[*] Ingesting $logoPath..."
$srcImg = [System.Drawing.Image]::FromFile($logoPath)

$pngSizes = @(16, 22, 24, 32, 48, 64, 128, 256, 384, 512)
$generatedPngs = @{}

foreach ($size in $pngSizes) {
    $bmp = Resize-Image -Image $srcImg -Width $size -Height $size
    $ms = New-Object System.IO.MemoryStream
    $bmp.Save($ms, [System.Drawing.Imaging.ImageFormat]::Png)
    $bmp.Dispose()
    $generatedPngs[$size] = $ms.ToArray()
    $ms.Dispose()
}

# Target directories
$nightlyBranding = Join-Path $workspaceRoot "engine\browser\branding\nightly"
$nightlyContent = Join-Path $nightlyBranding "content"
$distBranding = Join-Path $workspaceRoot "engine\objdir-crush\dist\bin\browser\chrome\browser\content\branding"
$distChromeIcons = Join-Path $workspaceRoot "engine\objdir-crush\dist\bin\chrome\icons\default"
$profileChromeIcons = Join-Path $workspaceRoot "sandbox\s3_google_signin_drm\profile\chrome\icons\default"

$dirs = @($nightlyBranding, $nightlyContent, $distBranding, $distChromeIcons, $profileChromeIcons)
foreach ($dir in $dirs) {
    if (-not (Test-Path $dir)) {
        New-Item -ItemType Directory -Path $dir -Force | Out-Null
    }
}

# 1. Write multi-resolution PNGs to source branding and dist branding
$pngTargets = @{
    "default16.png" = 16
    "default22.png" = 22
    "default24.png" = 24
    "default32.png" = 32
    "default48.png" = 48
    "default64.png" = 64
    "default128.png" = 128
    "default256.png" = 256
    "icon16.png" = 16
    "icon32.png" = 32
    "icon48.png" = 48
    "icon64.png" = 64
    "icon128.png" = 128
    "about.png" = 256
    "about-logo.png" = 256
    "about-logo@2x.png" = 512
    "about-logo-private.png" = 256
    "about-logo-private@2x.png" = 512
}

foreach ($entry in $pngTargets.GetEnumerator()) {
    $bytes = $generatedPngs[$entry.Value]
    [System.IO.File]::WriteAllBytes((Join-Path $nightlyBranding $entry.Key), $bytes)
    [System.IO.File]::WriteAllBytes((Join-Path $nightlyContent $entry.Key), $bytes)
    [System.IO.File]::WriteAllBytes((Join-Path $distBranding $entry.Key), $bytes)
}

# 2. Write multi-frame ICO files
$icoSizes = @(16, 24, 32, 48, 64, 128, 256)
$icoFiles = @(
    (Join-Path $nightlyBranding "firefox.ico"),
    (Join-Path $nightlyBranding "document.ico"),
    (Join-Path $nightlyBranding "newtab.ico"),
    (Join-Path $nightlyBranding "newwindow.ico"),
    (Join-Path $nightlyBranding "pbmode.ico"),
    (Join-Path $nightlyContent "document.ico"),
    (Join-Path $distBranding "document.ico"),
    (Join-Path $distChromeIcons "main-window.ico"),
    (Join-Path $profileChromeIcons "main-window.ico")
)

foreach ($icoPath in $icoFiles) {
    New-MultiFrameIco -SourceImage $srcImg -Sizes $icoSizes -OutputPath $icoPath
}

$srcImg.Dispose()
Write-Host "[SUCCESS] Generated multi-resolution ICO and PNG branding assets from $logoPath"
