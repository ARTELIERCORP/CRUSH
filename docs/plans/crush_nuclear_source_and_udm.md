# Plan: Crush Nuclear Source Build, UDM Integration & ASR Black Screen Resolution

## 1. Diagnosis
- **ASR Black Screen Root Cause**:
  1. *Dual GPU Mismatch*: Setting `webgl.power-preference-override: -1` and `powerPreference: 'low-power'` forced WebGL2 onto the integrated GPU while Windows Media Foundation (WMF) hardware video decoding (`media.hardware-video-decoding.force-enabled: true`) ran on the primary display adapter. When WebGL attempted to import the D3D11 NV12 texture across adapter boundaries, Gecko logged `"Resource has no data (yet?). Uploading zeros."`, populating `srcTex` with pure black.
  2. *Canvas Display Blocking*: In `clarity_overlay.js`, `this.canvas.style.display = 'block'` made the canvas visible immediately, placing an opaque black canvas directly over the playing video.
  3. *Shader Weighting Edge Case*: In `FS_EASU`, calculating Lanczos weights without an explicit zero-fallback on low-contrast flat fields risked `NaN` outputs, which IEEE 754 WebGL fragment pipelines clamp to black.
- **Debloat & Frontend Extensibility Invariants**:
  1. *Zero Mozilla Corporate Baggage*: Strip Telemetry, Normandy, CrashReporter, Updater, Maintenance Service, and Default Browser Agent at compile time via `mozconfig.nuclear`.
  2. *Preserve NSS / WebCrypto*: Do NOT strip NSS or WebCrypto primitives, ensuring Google OAuth login (`accounts.google.com`) and Passkeys/WebAuthn remain 100% functional.
  3. *Unconstrained UI/UX Customization*: Keep `toolkit.legacyUserProfileCustomizations.stylesheets = true`, `xpinstall.signatures.required = false`, and Gecko's full layout engine intact so userChrome.css, userContent.css, React, and Tailwind can modify and style the entire browser interface.
  4. *Privacy-Preserving Threat Defense*: Replace background Google Safe Browsing pings with local uBlock Origin threat lists + Quad9 DNS-over-HTTPS (`https://dns.quad9.net/dns-query`) for zero-telemetry phishing and malware blocking.
- **UDM Subsystem**:
  1. Release binaries `udm-daemon.exe` and `udm-bridge.exe` compiled cleanly in `sandbox/s4_udm_ipc_stub/target/release/`.
  2. Register native messaging manifest `crush_udm.json` so Crush WebExtensions can dispatch multi-threaded downloads directly to the high-performance Rust daemon.

---

## 2. Unknowns & Verifications
- *Unknown*: Does standard WebGL2 texture upload work seamlessly without forcing adapter override?
  *Check*: Remove `webgl.power-preference-override: -1` and context `powerPreference: 'low-power'`, ensuring WebGL2 and the compositor share the unified D3D11 device.
- *Unknown*: Can UDM native messaging communicate on Windows without administrator privileges?
  *Check*: Windows Gecko supports user-level native messaging manifests via `Software\Mozilla\NativeMessagingHosts\crush_udm` in `HKCU` or registry-free in `<app-dir>/defaults/pref/` and distribution paths.

---

## 3. Changes
1. **`extensions/crush-clarity/asr_pipeline.js`**:
   - Remove `powerPreference: 'low-power'` to match the compositor and video decoder GPU adapter.
   - Robustify `FS_EASU` and `FS_RCAS` against divide-by-zero or `NaN` edge cases.
   - Add error reporting and texture validation.
2. **`extensions/crush-clarity/clarity_overlay.js`**:
   - Ensure canvas display is only unhidden when a valid non-zero frame is rendered.
   - If an error occurs during frame upload, fall back gracefully without obscuring the native video.
3. **`scripts/sync-extensions.ps1` & Preferences**:
   - Remove `webgl.power-preference-override: -1`.
   - Set Quad9 DoH (`network.trr.mode: 2`, `network.trr.uri: "https://dns.quad9.net/dns-query"`).
   - Ensure standard Firefox User-Agent is preserved on Google Auth domains.
   - Bundle `udm-daemon.exe` and `udm-bridge.exe` into the browser distribution directory.
4. **`engine/mozconfig.nuclear` & GitHub Workflow**:
   - Confirm verified compile flags for cloud release compilation on GitHub Actions.
   - Validate that NSS, WebCrypto, WebRender, and CSS styling engines are fully enabled.

---

## 4. Verification Check
- Syntax validation on JS/CSS via `node -c`.
- Execute `scripts/sync-extensions.ps1` to deploy extension and preferences.
- Verify `udm-bridge.exe` and `udm-daemon.exe` exist in `distribution/bin/`.
- Launch test profile via `scripts/launch-test-profile.ps1`.

---

## 5. Risk
- Low. Changes are strictly isolated to extension scripts, profile preferences, and CI release workflow files.
