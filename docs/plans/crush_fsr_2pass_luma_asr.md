# Plan: FSR 2-Pass Luma Upscaling & Detail Reconstruction (ASR) in Crush

## 1. Context & Architectural Premise
In KIRA (3D NLE), ASR (Atomic Super Resolution) is executed in a single compute shader pass (`CSMain_FusedASR`) utilizing Direct3D 12 zero-copy VRAM surface binding and on-chip Local Data Share (LDS `groupshared float s_Luma[18][18]`). In native D3D12, EASU upscaling and RCAS sharpening share high-speed SRAM within a single dispatch.

In the browser (Gecko / WebGL2), LDS compute shaders are not exposed across pixel shader boundaries. Attempting to evaluate FSR in a single fragment shader across an upscale boundary requires recalculating 12 taps for all 9 neighbors (108 texture fetches per pixel), which collapses GPU throughput. Conversely, naive CSS filters (`contrast`/`saturate`) only alter global tone curves without reconstructing spatial edge frequencies or upscaling pixels ("the trap").

The mathematically correct and high-performance browser architecture is **FSR 2-Pass Luma**:
- **Pass 1 (EASU)**: 12-tap edge-adaptive directional spatial upscaling from video resolution $(W_{in}, H_{in})$ to display viewport $(W_{out}, H_{out})$, rendering reconstructed luma and directional vectors into an offscreen FBO texture (12 taps/pixel).
- **Pass 2 (RCAS)**: Contrast-adaptive sharpening and detail reconstruction running at display resolution on the FBO texture, applying KIRA's asymmetric dark-edge clamp (`e - 0.065` to `e + 0.135`), volumetric 3D macro-clarity, and split-screen compare before presenting directly to the canvas backbuffer (9 taps/pixel).
- **Total tap complexity**: 21 texture taps per pixel vs 108 taps, executing at native 60 FPS with minimal GPU overhead.

---

## 2. Core Components

### Component 1: `asr_pipeline.js` (WebGL2 2-Pass Pipeline)
- **WebGL2 Context**: Initialized with `{ alpha: false, depth: false, antialias: false, powerPreference: "high-performance" }`.
- **Preallocated Resources**:
  - `videoTexture`: Single preallocated `gl.RGBA8` texture updated via `gl.texSubImage2D(gl.TEXTURE_2D, 0, 0, 0, gl.RGBA, gl.UNSIGNED_BYTE, video)` exclusively on `requestVideoFrameCallback`.
  - `easuFBO` + `easuTexture`: Offscreen framebuffer allocated at display resolution (`canvas.width, canvas.height`), utilizing `gl.LINEAR` filtering.
- **Pass 1 Shader (`fs_easu`)**:
  - Samples 12 taps around the subpixel offset.
  - Computes edge gradient direction $(\text{dir}_x, \text{dir}_y)$ and length.
  - Directional Lanczos-like interpolation reconstructs crisp subpixel edges without jagged stair-stepping.
  - Outputs `vec4(reconRGB, reconLuma)`.
- **Pass 2 Shader (`fs_rcas`)**:
  - Reads `easuTexture` at display resolution.
  - Evaluates 3x3 neighborhood contrast (`mn4, mx4`).
  - Remaps sharpness via $2^{-\text{FsrRemapSharpness}(s)}$.
  - Applies KIRA's asymmetric dark-edge clamp (`e - 0.065` to `e + 0.135`) to prevent ringing and dark halos.
  - Evaluates 3.5x macro-radius sampling for volumetric depth clarity.
  - Evaluates split-screen compare (`vUv.x < u_splitPos ? originalBilinear : rcasResult`).
  - Outputs directly to canvas backbuffer.

### Component 2: Hardware Resource & Lifecycle Guards
- **Zero Idle Overhead**: When ASR is OFF, the WebGL canvas is hidden (`display: none`), rendering loop is cancelled, and video plays natively via WebRender direct compositing.
- **`requestVideoFrameCallback` Gating**: The render callback hooks directly to video presentation. When the video is paused, buffering, or tab is hidden, 0 texture uploads and 0 draw calls occur.
- **Display Resolution Clamping**: `canvas.width` and `canvas.height` match the video element's physical display bounds (`video.clientWidth * devicePixelRatio`), clamped to a maximum of 1920x1080 (or 2560x1440 on high-DPI displays). Upscaling lower resolutions (480p, 720p, 1080p) to display size delivers genuine detail reconstruction without wasting bus bandwidth on bloated surfaces.

### Component 3: Liquid Glass HUD Integration (`clarity_overlay.js` & `clarity_hud.css`)
- Minimal frosted liquid glass top bar preserved exactly as requested:
  - Button 1: Popout (PIP)
  - Button 2: `✦ ASR` toggle
  - Button 3: `◧ Compare` expanding pill (animates out only when ASR is ON)
- 2.2-second auto-fade on mouse inactivity.
- Draggable split compare divider updates `u_splitPos` uniform directly on the GPU backbuffer without DOM reflows.

---

## 3. Verification Plan
1. **Shader Correctness**: Verify GLSL 3.00 ES compilation of EASU and RCAS kernels with zero shader compiler warnings.
2. **Visual Proof**: Create an artifact comparison showing:
   - Native bilinear interpolation vs FSR 2-pass luma upscaling and detail reconstruction.
   - Clear edge sharpness without halo artifacts or crushed shadows.
3. **Performance Metrics**:
   - Verify 60 FPS playback on 720p and 1080p YouTube videos.
   - Profile memory usage: content process RAM under 450 MB (no 1.5 GB memory leak).
   - CPU usage under 5% on video playback.
