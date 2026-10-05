# scripts/sync-extensions.ps1: Bundles and configures Crush Defusers, uBlock Origin, and SponsorBlock
[CmdletBinding()]
param(
    [string]$TargetDir = "engine\objdir-crush\dist\bin"
)

$ErrorActionPreference = "Stop"

$workspaceRoot = Split-Path -Parent $PSScriptRoot
$distBin = Join-Path $workspaceRoot $TargetDir
$repoDist = Join-Path $workspaceRoot "distribution"
$repoExts = Join-Path $repoDist "extensions"

$destDist = Join-Path $distBin "distribution"
$destExts = Join-Path $destDist "extensions"
$destPrefs = Join-Path $distBin "browser\defaults\preferences"

New-Item -ItemType Directory -Path $repoExts -Force | Out-Null
New-Item -ItemType Directory -Path $destExts -Force | Out-Null
New-Item -ItemType Directory -Path $destPrefs -Force | Out-Null

$ublockFile = Join-Path $repoExts "uBlock0@raymondhill.net.xpi"
$sbFile = Join-Path $repoExts "sponsorBlocker@ajay.app.xpi"

if (-not (Test-Path $ublockFile)) {
    Write-Host "[*] Fetching signed uBlock Origin XPI from Mozilla AMO..."
    curl.exe -s -L -o $ublockFile "https://addons.mozilla.org/firefox/downloads/latest/ublock-origin/latest.xpi"
}

if (-not (Test-Path $sbFile)) {
    Write-Host "[*] Fetching signed SponsorBlock XPI from Mozilla AMO..."
    curl.exe -s -L -o $sbFile "https://addons.mozilla.org/firefox/downloads/latest/sponsorblock/latest.xpi"
}

# Copy baseline blockers to distribution
Copy-Item $ublockFile (Join-Path $destExts "uBlock0@raymondhill.net.xpi") -Force
Copy-Item $sbFile (Join-Path $destExts "sponsorBlocker@ajay.app.xpi") -Force

# Package Crush ASR Clarity Engine extension
$claritySrc = Join-Path $repoDist "extensions\crush-clarity"
if (-not (Test-Path $claritySrc)) {
    $claritySrc = Join-Path $workspaceRoot "extensions\crush-clarity"
}
$clarityXpiDest = Join-Path $destExts "crush-clarity@crush.browser.xpi"
$clarityXpiRepo = Join-Path $repoExts "crush-clarity@crush.browser.xpi"

if (Test-Path $claritySrc) {
    if (Test-Path $clarityXpiDest) { Remove-Item $clarityXpiDest -Force }
    if (Test-Path $clarityXpiRepo) { Remove-Item $clarityXpiRepo -Force }
    Add-Type -AssemblyName System.IO.Compression.FileSystem
    [System.IO.Compression.ZipFile]::CreateFromDirectory($claritySrc, $clarityXpiRepo)
    Copy-Item $clarityXpiRepo $clarityXpiDest -Force
    $profileExts = Join-Path $workspaceRoot "sandbox\s3_google_signin_drm\profile\extensions"
    if (-not (Test-Path $profileExts)) {
        New-Item -ItemType Directory -Path $profileExts -Force | Out-Null
    }
    Copy-Item $clarityXpiRepo (Join-Path $profileExts "crush-clarity@crush.browser.xpi") -Force
    Write-Host "[*] Packaged Crush ASR Clarity Engine to $clarityXpiRepo and deployed to profile"
}

# 1b. Deploy UDM binaries & Native Messaging Host Manifest
$udmReleaseDir = Join-Path $workspaceRoot "sandbox\s4_udm_ipc_stub\target\release"
$udmBinDir = Join-Path $workspaceRoot "distribution\bin"
if (-not (Test-Path $udmBinDir)) {
    New-Item -ItemType Directory -Path $udmBinDir -Force | Out-Null
}

$udmDaemon = Join-Path $udmReleaseDir "udm-daemon.exe"
$udmBridge = Join-Path $udmReleaseDir "udm-bridge.exe"
if ((Test-Path $udmDaemon) -and (Test-Path $udmBridge)) {
    Copy-Item $udmDaemon (Join-Path $udmBinDir "udm-daemon.exe") -Force
    Copy-Item $udmBridge (Join-Path $udmBinDir "udm-bridge.exe") -Force

    $manifestDir = Join-Path $distBin "native-messaging-hosts"
    if (-not (Test-Path $manifestDir)) {
        New-Item -ItemType Directory -Path $manifestDir -Force | Out-Null
    }
    $bridgePathEscaped = ((Join-Path $udmBinDir "udm-bridge.exe") -replace '\\', '\\')
    $nativeManifest = @"
{
  "name": "crush_udm",
  "description": "Crush Sovereign Browser Universal Download Manager Native Messaging Bridge",
  "path": "$bridgePathEscaped",
  "type": "stdio",
  "allowed_extensions": [
    "crush-clarity@crush.browser"
  ]
}
"@
    Set-Content -Path (Join-Path $manifestDir "crush_udm.json") -Value $nativeManifest -Encoding UTF8
    Write-Host "[*] Deployed UDM binaries and native messaging host manifest"
}

$clarityUri = "file:///" + ($clarityXpiRepo -replace '\\', '/')

# Generate and sync branding assets from logo.png if needed
$brandingGenScript = Join-Path $PSScriptRoot "generate-branding-assets.ps1"
$mainIco = Join-Path $distBin "chrome\icons\default\main-window.ico"
if ((Test-Path $brandingGenScript) -and (-not (Test-Path $mainIco))) {
    & powershell -ExecutionPolicy Bypass -File $brandingGenScript
}


# Write Crush default preferences
$crushPrefsContent = @'
// Crush Browser default preferences

// 1. Extension & Signing Unlocks
pref("xpinstall.signatures.required", false);
pref("extensions.autoDisableScopes", 0);

// 2. Complete Telemetry, Normandy & Data Reporting Purge
pref("toolkit.telemetry.enabled", false);
pref("toolkit.telemetry.unified", false);
pref("toolkit.telemetry.archive.enabled", false);
pref("toolkit.telemetry.bhrPing.enabled", false);
pref("toolkit.telemetry.firstShutdownPing.enabled", false);
pref("toolkit.telemetry.newProfilePing.enabled", false);
pref("toolkit.telemetry.shutdownPingSender.enabled", false);
pref("toolkit.telemetry.updatePing.enabled", false);
pref("toolkit.telemetry.server", "");
pref("datareporting.healthreport.uploadEnabled", false);
pref("datareporting.policy.dataSubmissionEnabled", false);
pref("app.shield.optoutstudy.enabled", false);
pref("app.normandy.enabled", false);
pref("app.normandy.api_url", "");
pref("experiments.activeExperiment", false);
pref("experiments.supported", false);
pref("breakpad.reportURL", "");
pref("browser.tabs.crashReporting.sendReport", false);
pref("browser.crashReports.unsubmittedCheck.enabled", false);

// 3. Network, Captive Portal, & Speculative Connection Purge (Zero ghost sockets)
pref("network.http.speculative-parallel-limit", 0);
pref("network.dns.disablePrefetch", true);
pref("network.prefetch-next", false);
pref("network.captive-portal-service.enabled", false);
pref("network.connectivity-service.enabled", true);
pref("browser.safebrowsing.downloads.remote.enabled", false);
pref("browser.search.suggest.enabled", false);
pref("browser.urlbar.suggest.quicksuggest.sponsored", false);
pref("browser.urlbar.suggest.quicksuggest.nonsponsored", false);
pref("browser.newtabpage.activity-stream.feeds.telemetry", false);
pref("browser.newtabpage.activity-stream.telemetry", false);
pref("browser.newtabpage.activity-stream.feeds.snippets", false);
pref("browser.newtabpage.activity-stream.feeds.section.topstories", false);
pref("browser.newtabpage.activity-stream.section.highlights.includePocket", false);
pref("browser.newtabpage.activity-stream.showSponsored", false);
pref("browser.newtabpage.activity-stream.showSponsoredTopSites", false);
pref("extensions.pocket.enabled", false);
pref("browser.shell.checkDefaultBrowser", false);
pref("privacy.trackingprotection.enabled", true);
pref("privacy.donottrackheader.enabled", true);

// 4. GPU Hardware Acceleration & Video Performance (D3D11 + DirectComposition, zero SWGL)
pref("gfx.webrender.all", true);
pref("layers.acceleration.force-enabled", true);
pref("gfx.webrender.enable-angle", true);
pref("gfx.webrender.require-angle", true);
pref("gfx.webrender.dcomp-win.enabled", true);
pref("gfx.direct3d11.reuse-decoder-device", true);
pref("media.hardware-video-decoding.enabled", true);
pref("media.hardware-video-decoding.force-enabled", true);

// 5. WebGPU & WebGL Unified D3D11 Pipeline (Single GPU device, zero cross-adapter texture drops)
pref("dom.webgpu.enabled", true);
pref("dom.webgpu.wgpu-backend", "dx12,vulkan");

// 5a. Quad9 DNS-over-HTTPS (Private, telemetry-free malware/phishing domain protection)
pref("network.trr.mode", 2);
pref("network.trr.uri", "https://dns.quad9.net/dns-query");
pref("network.trr.custom_uri.select", "https://dns.quad9.net/dns-query");
pref("network.trr.bootstrapAddress", "9.9.9.9");

// 5b. Google Sign-In & Security Landmine Protections (100% genuine auth)
pref("marionette.enabled", false);
pref("privacy.resistFingerprinting", false);

// 6. Responsive Process Model & High-Efficiency Scheduling
pref("layout.frame_rate", -1);
pref("layers.offmainthreadcomposition.frame-rate", -1);
pref("nglayout.initialpaint.delay", 0);
pref("browser.sessionhistory.max_total_viewers", 2);
pref("browser.tabs.unloadOnLowMemory", true);
pref("dom.ipc.processPriorityManager.enabled", true);
pref("accessibility.force_disabled", 1);

// 7. UI Theme, Native Vertical Tabs & Fluid Animations
pref("toolkit.legacyUserProfileCustomizations.stylesheets", true);
pref("sidebar.revamp", true);
pref("sidebar.verticalTabs", true);
pref("sidebar.visibility", "always-show");
pref("sidebar.animation.enabled", false);
pref("sidebar.expandOnHover", false);
pref("browser.tabs.hoverPreview.enabled", false);
pref("browser.toolbars.bookmarks.visibility", "never");
pref("browser.bookmarks.addedImportButton", true);
pref("browser.tabs.drawInTitlebar", true);
pref("media.videocontrols.picture-in-picture.video-toggle.enabled", false);
'@
Set-Content -Path (Join-Path $destPrefs "crush.js") -Value $crushPrefsContent -Encoding ASCII

# Ensure signature check bypass in AddonSettings.sys.mjs
$addonSettingsPaths = @(
    (Join-Path $distBin "modules\addons\AddonSettings.sys.mjs"),
    (Join-Path $workspaceRoot "engine\toolkit\mozapps\extensions\internal\AddonSettings.sys.mjs")
)

foreach ($asPath in $addonSettingsPaths) {
    if (Test-Path $asPath) {
        $content = Get-Content $asPath -Raw
        if ($content -match 'if \(AppConstants\.MOZ_REQUIRE_SIGNING && !Cu\.isInAutomation\)') {
            $updated = $content -replace 'if \(AppConstants\.MOZ_REQUIRE_SIGNING && !Cu\.isInAutomation\)', 'if (false && AppConstants.MOZ_REQUIRE_SIGNING && !Cu.isInAutomation)'
            Set-Content -Path $asPath -Value $updated -Encoding UTF8 -NoNewline
        }
    }
}

# Write policies.json with baseline blockers and telemetry lockdowns
$policiesJson = @"
{
  "policies": {
    "DisableAppUpdate": true,
    "DisableTelemetry": true,
    "DisableProfileImport": true,
    "DisableFirefoxStudies": true,
    "DisableFeedbackCommands": true,
    "DisablePocket": true,
    "DisableDefaultBrowserAgent": true,
    "OverrideFirstRunPage": "",
    "OverridePostUpdatePage": "",
    "UserMessaging": {
      "WhatsNew": false,
      "ExtensionRecommendations": false,
      "FeatureRecommendations": false,
      "UrlbarInterventions": false,
      "SkipOnboarding": true,
      "MoreFromMozilla": false
    },
    "ExtensionSettings": {
      "uBlock0@raymondhill.net": {
        "installation_mode": "force_installed",
        "install_url": "https://addons.mozilla.org/firefox/downloads/latest/ublock-origin/latest.xpi"
      },
      "sponsorBlocker@ajay.app": {
        "installation_mode": "force_installed",
        "install_url": "https://addons.mozilla.org/firefox/downloads/latest/sponsorblock/latest.xpi"
      },
      "crush-clarity@crush.browser": {
        "installation_mode": "force_installed",
        "install_url": "$clarityUri"
      }
    },
    "3rdparty": {
      "Extensions": {
        "uBlock0@raymondhill.net": {
          "adminSettings": {
            "userSettings": {
              "autoUpdate": true
            },
            "selectedFilterLists": [
              "user-filters",
              "ublock-filters",
              "ublock-badware",
              "ublock-privacy",
              "ublock-quick-fixes",
              "ublock-unbreak",
              "easylist",
              "easyprivacy"
            ],
            "userFilters": "www.youtube.com##tp-yt-paper-toast:has(a[href*=\"support.google.com/youtube\"])\nwww.youtube.com##tp-yt-paper-toast:has(a[href*=\"ad_blocker\"])\nwww.youtube.com##yt-notification-action-renderer:has(a[href*=\"troubleshoot_playback\"])\nwww.youtube.com###player-ads\nwww.youtube.com##ytd-ad-slot-renderer\nwww.youtube.com##.ytp-ad-overlay-container"
          }
        }
      }
    }
  }
}
"@
Set-Content -Path (Join-Path $destDist "policies.json") -Value $policiesJson -Encoding UTF8
Set-Content -Path (Join-Path $repoDist "policies.json") -Value $policiesJson -Encoding UTF8

Write-Host "[SUCCESS] Synchronized extensions, preferences, and policies to $destDist"
