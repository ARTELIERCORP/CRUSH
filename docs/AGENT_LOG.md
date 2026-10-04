# Agent Log: Crush Sovereign Browser

## 2026-10-04 — Architecture Approval & Repository Inception
- **Task**: Architectural consultation and implementation plan for Crush Sovereign Browser.
- **Change**: Formulated comprehensive architectural plan (`crush_architecture_plan.md`) choosing Path A (Gecko Release fork with HTML/CSS overlay and native messaging UDM daemon) over Chromium forks (due to upstream MV2 removal, C++ Views UI friction, and multi-hour CI builds).
- **Verification level**: L3 (User reviewed and approved architecture and plan).
- **Fix class**: ROOT-CAUSE. Identified that Chromium's architecture intrinsically blocks MV2 response-body inspection (`filterResponseData`) and rapid front-end iteration, whereas Gecko natively preserves both.
- **Decisions**:
  1. Engine: Gecko Release (upstream patch-queue fork, not downstream fork of Zen/Floorp).
  2. Visibility: Public on GitHub for unlimited free GitHub Actions runner minutes.
  3. Distribution: Personal daily driver + public non-commercial (satisfying SponsorBlock CC BY-NC-SA 4.0 license).
  4. Baseline blocker: Bundle uBlock Origin unmodified; layer proprietary Crush defusers (YouTube Innertube, Twitch SSAI, Link Gate Annihilator) on top.
  5. Dev loop: Artifact builds (`--enable-artifact-builds`) for sub-2-minute local UI iteration without C++ compilation.
  6. UDM architecture: Split into stateless `udm-bridge.exe` (native messaging stdio) and background `udm-daemon.exe` (named pipe `\\.\pipe\crush-udm-<SID>`) with 64KiB overlap hash check on link renewal.
- **Rejected approaches**:
  - Electron 33: Rejected due to Google BotGuard VM (`bscframe`) rejecting bare `content/` shell with `/v3/signin/rejected`.
  - Chromium sideloading: Rejected due to `--load-extension` flag removal in branded builds and lack of UI customizability in C++ Views.
  - Chromium source fork: Rejected due to upstream MV2 removal, C++ Views compilation overhead, and 6-hour GitHub Actions timeout limits.
- **Follow-ups**:
  - Spike S1: Bootstrap MozillaBuild environment, shallow clone engine, verify artifact build dev loop.
  - Spike S2: Author and measure GitHub Actions release workflow.
  - Spike S3: Verify Google OAuth sign-in and Widevine DRM in clean profile.
  - Spike S4: Implement Rust `udm-bridge` and `udm-daemon` IPC ping-pong.
