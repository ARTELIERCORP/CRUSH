# Plan: Crush Sovereign Browser Debloat, Fan Silence, Zero Frame-Shift & Halo-Free FSR

## Diagnosis
1. **1 GB+ RAM on 1 Tab**: Gecko defaults `fission.autostart: true` and `media.rdd-process.enabled: true`. This spawns 6+ independent processes (`firefox.exe`) for content isolation and remote data decoding, each allocating 150-200 MB base runtime memory.
2. **Fan Spinning at 100% (High Power)**: In `engine/dom/canvas/WebGLContext.cpp` line 323, `webgl.power-preference-override > 0` forces `High_performance` (discrete GPU), while `< 0` forces `Low_power` (integrated GPU). `crush.js` set this to `1`, waking the NVIDIA RTX 3050. Furthermore, `clarity_overlay.js` called `getBoundingClientRect()` 60 times/sec inside `step()`, causing continuous CPU layout thrashing.
3. **Canvas Frame Shift**: `canvas` was inside `.html5-video-container` while calculating offsets relative to `offsetParent` (`#movie_player`), causing duplicate offset calculation on letterboxed/theater modes.
4. **Oversharpened Halo Mess**: `FS_EASU` permitted 24% ringing headroom, `FS_RCAS` multiplied RGB by an unsharp mask scalar `yFinal / e`, and inverted coordinate gradients stretched Lanczos kernels across edges instead of along them.

## Changes
1. **Engine Preferences (`crush.js` & `user.js`)**:
   - `webgl.power-preference-override`: `-1` (Forces low-power iGPU; keeps discrete GPU asleep).
   - `fission.autostart`: `false` (Consolidates processes into lean single-content model).
   - `media.rdd-process.enabled`: `false` (Eliminates separate RDD decoder process).
   - `dom.ipc.processCount`: `1` & `dom.ipc.processCount.webIsolated`: `1`.
   - `browser.cache.disk.enable`: `false` & `browser.cache.memory.capacity`: `16384` (16 MB).
   - `media.memory_caches_combined_limit_kb`: `32768` (32 MB).
2. **Overlay Controller (`clarity_overlay.js`)**:
   - Attach canvas directly to `this.player` (`#movie_player`) with exact relative coordinates to `<video>`.
   - Replace 60 FPS `getBoundingClientRect()` thrashing with a `ResizeObserver` on `this.video` (0% CPU during playback).
   - Use `texSubImage2D` in WebGL2 pipeline to avoid texture reallocation churn.
3. **Shader Pipeline (`asr_pipeline.js`)**:
   - Pass 1 (EASU): Fix coordinate gradient tensor; enforce strict AMD anti-ringing clamp `clamp(reconRGB, min4, max4)` with zero overshoot.
   - Pass 2 (RCAS): True AMD RGB RCAS formulation with per-channel 5-tap neighborhood clamp `clamp(rcasRgb, mn, mx)`. Purge `lumaScale` scalar multiplier.

## Verification
- L0: File syntax validation via `node -c`.
- L1: Verify all files are strictly under 400 lines (Rule 10).
- L2: Sync extensions and test profile with exit code 0; inspect process memory and GPU telemetry.
