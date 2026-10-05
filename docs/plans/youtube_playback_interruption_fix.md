# Plan: YouTube Offline & Interruption Stall Resolution

## 1. Diagnosis
1. **Offline Astronaut Screen**: `pref("network.connectivity-service.enabled", false);` was configured in `crush.js` (line 79) and `scripts/sync-extensions.ps1` (line 79). In Gecko, disabling this service causes `navigator.onLine` to return `false` and suppresses network link change events. YouTube listens to these events and immediately displays: "Connect to the internet. You're offline. Check your connection. Retry."
2. **"Experiencing interruptions?" & 5-15s Playback Delay**: Disabling the network connectivity service also prevented uBlock Origin from updating its built-in `ublock-quick-fixes` filter list. When uBlock relies on basic network-level ad blocking without up-to-date quick fixes, YouTube detects the ad segment failure and initiates an intentional anti-adblock backoff delay (5-15 seconds) accompanied by the "Experiencing interruptions?" toast notification before falling back to the video stream.
3. **SponsorBlock In-Player Control Bar Buttons**: In `sponsorBlocker@ajay.app` content script (`js/content.js:306474`), buttons are injected into YouTube's player control bar with class `.playerButton` and IDs `#infoButton`, `#startSegmentButton`, `#cancelSegmentButton`, `#deleteButton`, and `#submitButton`. Previous rules in `userContent.css` suppressed `.skipButtonControlBarContainer` and `.sponsorSkipNotice`, but did not include `.playerButton` or `#infoButton`.

## 2. Proposed Changes
1. **Network Connectivity Restoration**:
   - In `scripts/sync-extensions.ps1` and `dist/bin/browser/defaults/preferences/crush.js`: Set `pref("network.connectivity-service.enabled", true);`.
   - In `sandbox/s3_google_signin_drm/profile/user.js`: Set `user_pref("network.connectivity-service.enabled", true);`.
2. **uBlock Origin Enterprise Configuration**:
   - In `distribution/policies.json` and `scripts/sync-extensions.ps1`: Add `3rdparty/Extensions/uBlock0@raymondhill.net/adminSettings` enabling `ublock-quick-fixes`, `autoUpdate: true`, and custom filter rules to eliminate YouTube interruption banners and ad slots.
3. **SponsorBlock Controls & Toast Purge**:
   - In `sandbox/s3_google_signin_drm/profile/chrome/userContent.css`: Add CSS selectors to hide `.playerButton`, `#infoButton`, `#startSegmentButton`, `button:has(img[src*="SponsorBlocker"])`, and YouTube interruption toast renderers (`tp-yt-paper-toast`, `yt-notification-action-renderer`).

## 3. Verification
1. Run `scripts/sync-extensions.ps1` to sync preferences, policies, and extensions.
2. Validate syntax of `policies.json`, `crush.js`, `user.js`, and `userContent.css`.
3. Verify exit code 0.
