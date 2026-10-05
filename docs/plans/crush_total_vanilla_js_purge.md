# Plan: Crush Total Vanilla JS Purge (TypeScript + Tailwind Everywhere)

## 1. Diagnosis
- **Legacy Extension Scripts**:
  1. `extensions/crush-clarity/asr_pipeline.js` (351 lines) and `clarity_overlay.js` (371 lines) are written in legacy plain JavaScript.
  2. `extensions/crush-clarity/clarity_hud.css` (193 lines) is written in ad-hoc vanilla CSS.
  3. `extensions/crush-defusers/` (`background.js`, `yt_inoculate.js`, `link_annihilator.js`) is legacy dead code blocked in `distribution/policies.json` (`installation_mode: blocked`) and superseded by uBlock Origin rules.
  4. `ui/postcss.config.js` and `ui/tailwind.config.js` are plain JS config files.
- **Architectural Goal**:
  1. 100% of frontend source code written in strict TypeScript (`.ts`, `.tsx`) and styled with Tailwind CSS.
  2. Vite compiles both the browser UI pages (`sidebar.html`, `udm.html`) and the extension content scripts (`asr_pipeline.ts`, `clarity_overlay.tsx`) into self-contained bundles.
  3. Delete all `.js` files from source directories (`extensions/`, `ui/`).

---

## 2. Unknowns & Verifications
- *Unknown*: Can Vite compile extension scripts as IIFE bundles while preserving browser globals?
  *Check*: Configure Vite with a multi-input or dedicated extension build script targeting IIFE format without external dependency conflicts.
- *Unknown*: Does Tailwind CSS support `tailwind.config.ts` without additional loaders?
  *Check*: Modern Tailwind v3 supports TypeScript configuration out of the box when imported by Vite. Inlining PostCSS into `vite.config.ts` allows deleting `postcss.config.js`.

---

## 3. Changes
1. **`ui/src/extension/asr_pipeline.ts`**:
   - Port `CrushAsrPipeline` with strict WebGL2, uniform, and texture types.
   - Embed AMD FSR 1.0 EASU Lanczos and RCAS fragment shaders.
   - Keep file size <= 350 lines (Rule 10).
2. **`ui/src/extension/clarity_overlay.tsx`**:
   - Port in-player controller to TypeScript.
   - Render `<AsrHud />` with Tailwind CSS classes.
   - Attach split-screen divider and observer logic.
   - Keep file size <= 350 lines (Rule 10).
3. **`ui/tailwind.config.ts` & `ui/vite.config.ts`**:
   - Rename `tailwind.config.js` to `tailwind.config.ts`.
   - Embed PostCSS plugin configuration directly into `vite.config.ts` and delete `postcss.config.js`.
   - Configure extension build targets.
4. **Purge Vanilla JS**:
   - Delete `extensions/crush-clarity/asr_pipeline.js`, `clarity_overlay.js`, `clarity_hud.css`.
   - Delete `extensions/crush-defusers/` (legacy dead code).
   - Update `scripts/sync-extensions.ps1` to package from Vite's compiled extension output.

---

## 4. Verification Check
- `npm run build` in `ui/` executes `tsc` and `vite build` with exit code 0.
- `scripts/sync-extensions.ps1` succeeds with exit code 0.
- PowerShell scan for `*.js` in source folders confirms zero remaining vanilla JS source files.

---

## 5. Risk
- Low. Behavior is strictly preserved; extension bundle outputs are verified before packaging.
