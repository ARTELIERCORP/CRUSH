# Implementation Plan: Phase 2 Adblocking & Crush Defusers

## 1. Diagnosis
During Phase 0, we compiled and bootstrapped the vanilla Gecko engine (`firefox.exe` v157.0) to validate artifact builds (S1), Google OAuth BotGuard bypass (S3), and Rust UDM IPC (S4). 
Because `engine/objdir-crush/dist/bin/distribution/` did not yet exist, Firefox launched with zero extensions and default unblocked networking. When the user tested YouTube and web pages, all native video ads, pre-rolls, and banners were served normally.

## 2. Architecture & Approach
We deploy a two-layer adblocking architecture:
1. **Layer 1: Enterprise Baseline Blocker (uBlock Origin & SponsorBlock)**
   - Pre-installed via Firefox Enterprise Policy (`distribution/policies.json`) with `installation_mode: force_installed`.
   - Bundled locally as signed `.xpi` packages in `distribution/extensions/` to ensure instant zero-network activation on first run.
   - Provides network-level blocking of ad servers, tracking telemetry, cosmetic element hiding, and YouTube sponsor segment skipping.
2. **Layer 2: Crush Native Defusers (`crush-defusers@crush.browser`)**
   - Built as an in-tree WebExtension utilizing Gecko's unrestricted `browser.webRequest.filterResponseData` API.
   - **YouTube Innertube Inoculation**:
     - Intercepts `*://*.youtube.com/youtubei/v1/player*` API responses.
     - Modifies streaming JSON to delete `adPlacements`, `adSlots`, and `playerAds` before the YouTube player script parses it.
     - Content script injects property trap on `window.ytInitialPlayerResponse` to sanitize initial HTML payload.
     - Eliminates YouTube's 17-second empty buffer trap and loading spinner.
   - **Link-Locker & Shortener Annihilator**:
     - Fast-forwards 15-30 second countdown timers on shortener gates (AdLinkFly, OuO, ShrinkEarn) by warping timing functions.
     - Auto-triggers progression buttons/forms.
     - Hides deceptive "fake download" button vectors.

## 3. Implementation Steps

### Step 1: Distribution Manifest & Policies
- Create `distribution/policies.json` in the engine distribution root.
- Configure:
  - `DisableAppUpdate: true`
  - `DisableTelemetry: true`
  - `ExtensionSettings`:
    - `uBlock0@raymondhill.net`: `force_installed`
    - `sponsorBlocker@ajay.app`: `force_installed`
    - `crush-defusers@crush.browser`: `force_installed`

### Step 2: Bundle Signed XPIs
- Download official signed XPI packages from Mozilla AMO:
  - `distribution/extensions/uBlock0@raymondhill.net.xpi` (4.43 MB)
  - `distribution/extensions/sponsorBlocker@ajay.app.xpi` (1.78 MB)

### Step 3: Build `crush-defusers` Extension
- Directory: `extensions/crush-defusers/`
  - `manifest.json`: Manifest V2 with `webRequest`, `webRequestBlocking`, `<all_urls>`
  - `background.js`: Innertube `filterResponseData` stream transformer
  - `content_scripts/yt_inoculate.js`: DOM/Object trap for `ytInitialPlayerResponse` + playback unfreezer
  - `content_scripts/link_annihilator.js`: Shortener timer warp and button bypass
- Add packaging script to compile `extensions/crush-defusers/` into `distribution/extensions/crush-defusers@crush.browser.xpi`.

### Step 4: Engine Default Preferences
- Create `engine/objdir-crush/dist/bin/browser/defaults/preferences/crush.js`:
  - `pref("extensions.autoDisableScopes", 0);` (prevent disabling sideloaded/enterprise extensions)
  - `pref("privacy.trackingprotection.enabled", true);`
  - `pref("privacy.donottrackheader.enabled", true);`

### Step 5: Update Build & Packaging Scripts
- Update `scripts/build.ps1` to automatically copy `distribution/` and build `crush-defusers.xpi` into `dist/bin/distribution/` on every rebuild.
- Update `.github/workflows/build-release.yml` so CI packages `distribution/` into the release archive.

## 4. Verification Plan
- **Verification Command**:
  - Run `firefox.exe -headless -profile <testDir>` and parse `extensions.json` to confirm `uBlock0@raymondhill.net`, `sponsorBlocker@ajay.app`, and `crush-defusers@crush.browser` all have `active: True` and `userDisabled: False`.
  - Launch with `scripts/launch-test-profile.ps1 -Url "https://www.youtube.com"`:
    - Verify uBlock Origin icon and SponsorBlock icon are active in toolbar.
    - Play videos with ads: verify video plays immediately with 0 ads, 0 buffer delays, and sponsor segments skipped.
