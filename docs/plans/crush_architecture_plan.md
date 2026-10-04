# Crush Browser — Architecture Plan (Approved)

## 1. Engine Foundation: Gecko Release Patch-Queue Fork
- Base: Upstream Firefox Release source tree (`gecko-dev` / `mozilla-firefox/firefox`).
- Front-end Overlay: Pure HTML/CSS/JS located in `overlay/browser/components/crush/`.
- Build Mode: Mozilla Artifact Builds (`ac_add_options --enable-artifact-builds`) locally, downloading pre-compiled C++ components for sub-2-minute UI rebuilds without local C++ compilation.
- CI Mode: GitHub Actions matrix on public repository for free and unlimited build minutes.

## 2. UDM (Ultimate Download Manager) Integration
- Inter-Process Communication:
  - Browser $\to$ `udm-bridge.exe` via WebExtension Native Messaging (`stdio`, JSON length-prefixed protocol).
  - `udm-bridge.exe` $\to$ `udm-daemon.exe` via Windows Named Pipe (`\\.\pipe\crush-udm-<SID>`).
- Expired Link Renewal (HTTP 403 / 410):
  - On link expiration, daemon signals extension to request renewed origin URL.
  - Prior to appending bytes, daemon validates a 64KiB overlap hash between $[N-64\text{KiB}, N)$ against the partial file on disk.

## 3. Annoyance & Ad Blocking Strategy
- Baseline Lists: uBlock Origin bundled unmodified.
- YouTube Defuser: Interception of `/youtubei/v1/player` and `/next` JSON payloads via `filterResponseData` before page scripts execute.
- Twitch SSAI Defuser: Interception and dynamic splicing of HLS playlist streams.
- Link-Locker Annihilator: Script injection to neutralize countdown timers and bypass intermediate redirect forms.

## 4. Phased Roadmap
- Phase 0: Verification Spikes (S1: Artifact build loop; S2: Free CI workflow; S3: Google sign-in/DRM; S4: UDM bridge IPC).
- Phase 1: Clean repository structure and build orchestration scripts.
- Phase 2: UDM clean rewrite in Rust (`udm-proto`, `udm-core`, `udm-engine`, `udm-daemon`, `udm-bridge`).
- Phase 3: Crush Shield extension defusers.
- Phase 4: Custom UI overlay (Obsidian theme, vertical tab rail, side dock, split view).
- Phase 5: Installer and automated release distribution.
