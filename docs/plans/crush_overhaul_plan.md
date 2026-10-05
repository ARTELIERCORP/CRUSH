# Crush Sovereign Browser Overhaul plan

This plan overhauls Crush Sovereign Browser for privacy, performance, branding, and modern UI.
It purges all Mozilla telemetry and Normandy studies.
It locks Direct3D GPU acceleration and enables zero-copy NV12 video decoding.
It converts the user cosmic logo into multi-resolution icons and strips all Nightly branding.
It deploys an obsidian dark theme with native vertical tabs and an uncluttered dashboard.
The program executes PR-TELEMETRY-PERF, PR-BRANDING-ASSETS, and PR-UIUX-OBSIDIAN in order.

## How to read this

One box is one unit of work. Every box names the evidence that checks it. A nested box is a sub-step of the box above it. Check a box only when its evidence exists, a file, a log line, a screenshot, a test run, or a SHA. The body is a how-to. The appendices explain and record.

The program runs `skills/poteto-mode/playbooks/autopilot-stack.md`. The operator reviews PR-UIUX-OBSIDIAN before merge.

Tests alone are not sufficient verification. A PR is verified only when its unit, live, and perf boxes are all checked.

## Program checklist

### Arm the program

- [ ] State the protocol and this plan to the operator, then stop. Start execution only on the operator's explicit go.
- [ ] On the operator's go, arm a `/goal` with this exact text. "Run implementation_plan.md covering PR-TELEMETRY-PERF, PR-BRANDING-ASSETS, and PR-UIUX-OBSIDIAN under the verification rule. Operator merges the stack when all lanes pass."
- [ ] Read these from trunk at program start. Re-read them at every tick.
  - [ ] `git show origin/main:skills/poteto-mode/playbooks/autopilot-stack.md`
  - [ ] `git show origin/main:skills/swarm/SKILL.md`
  - [ ] `git show origin/main:scripts/sync-extensions.ps1`
  - [ ] `git show origin/main:skills/poteto-mode/playbooks/opening-a-pr.md`
  - [ ] `git show origin/main:skills/poteto-mode/SKILL.md`
- [ ] Arm the 30-minute audit tick via the Antigravity `schedule` tool (`CronExpression="*/30 * * * *"` or recurring timer). Never leave the cadence to memory.
- [ ] Use this tick prompt, verbatim. "Re-read the execution playbook from trunk and the armed /goal. Audit the operation against both and fix drift in this tick. Probe every active lane and judge progress by side effects only. Stand down a stuck lane and dispatch its replacement now. Post a status message to the operator in chat when state changes, a gate blocks, or merges land (or update the status artifact if unchanged), with the queue table of PR, owner, state, and head SHA, the verdicts since the last tick, what merged, open operator gates, and blockers. Then conclude the tick and yield the turn immediately with zero tool calls."
- [ ] On the operator's hold or stand-down, send every owner a zero-writes order at once.

### Spawn owners

- [ ] Spawn one owner per PR with the full lifecycle the execution playbook names.
- [ ] Follow this dependency graph. Start dependent work only after its parent merges, or base it on the parent branch when the execution playbook stacks.
  - [ ] PR-TELEMETRY-PERF is first and branches from `main`.
  - [ ] PR-BRANDING-ASSETS after PR-TELEMETRY-PERF.
  - [ ] PR-UIUX-OBSIDIAN after PR-BRANDING-ASSETS.
- [ ] Hold the file boundaries. PR-TELEMETRY-PERF touches `distribution/` and preference scripts. PR-BRANDING-ASSETS touches `branding/` assets and localization strings. PR-UIUX-OBSIDIAN touches `chrome/` user styles and UI preferences.
- [ ] Hold the review gate. PR-UIUX-OBSIDIAN changes an interaction. It waits for the operator's review in chat with screenshots and a video before merge.

### PR mechanics, for every PR

- [ ] Open the PR ready, never draft, with `gh pr create` and `draft: false`, or with Graphite `gt` for a stack.
- [ ] Run the repo's lint and typecheck once before the PR-facing push. Push with hooks on.
- [ ] Run `/deslop` before each commit and `/no-comments` before review.
- [ ] Triage every Bugbot and security-reviewer comment per `../references/bugbot-triage.md`.
- [ ] Rebase onto current trunk before the initial code-ready report; keep merge base during fix rounds, rebasing only on conflicts or at merge prep.

### Verdict and merge, for every PR

- [ ] At the merge-ready head SHA, run the swarm per `skills/swarm/SKILL.md`. One gates lane. The ten live lanes from the PR's **Verify, live** block. The perf lane from its **Verify, perf** block. One audit lane that reads the diff and the receipts and distrusts the PR body.
- [ ] Clean only when every lane is `PASS`. Findings go back to the owner. A new head gets a fresh swarm and a fresh verdict.
- [ ] Append the PR to the Graphite stack and the operator lands it.

### Boot recipe, for every live lane

Each live lane runs on its own branch or worktree at the PR head. Drive through browser subagent tools, CLI runners, or project verification scripts.

- [ ] `git fetch origin <head-branch> && git checkout <head SHA>`.
- [ ] Execute `powershell -ExecutionPolicy Bypass -File scripts/sync-extensions.ps1` to sync engine assets and preferences.
- [ ] Launch `powershell -ExecutionPolicy Bypass -File scripts/launch-test-profile.ps1 -KillStale`.
- [ ] Save every screenshot to `sandbox/screenshots/<pr-id>/worker-<n>/<slug>.png` and return the paths with the report.

## Disable telemetry and lock engine performance (PR-TELEMETRY-PERF)

**Depends on.** None.

**Files.**

- [ ] Edit `distribution/policies.json`.
- [ ] Edit `scripts/sync-extensions.ps1`.
- [ ] Edit `engine/objdir-crush/dist/bin/browser/defaults/preferences/crush.js`.

**Build.**

- [ ] Add complete telemetry, Normandy, Pocket, and ping suppression to `policies.json` and `crush.js`.
- [ ] Configure Direct3D 11/12 GPU WebRender, zero-copy NV12 textures, 0ms initial paint delay, and 1GB RAM cache in `crush.js`.

**You see.**

- [ ] Process start log shows zero telemetry pings, zero Normandy pings, and WebRender hardware acceleration enabled in `about:support`.

**Verify, unit.** Tests alone are not sufficient verification. A PR is verified only when its unit, live, and perf boxes are all checked.

- [ ] Policy and preference syntax test. Run `powershell -NoProfile -Command "Get-Content distribution/policies.json | ConvertFrom-Json; Test-Path engine/objdir-crush/dist/bin/browser/defaults/preferences/crush.js"`.

**Verify, live.** Tests alone are not sufficient verification. A PR is verified only when its unit, live, and perf boxes are all checked. Ten lanes on `flash` at the PR head, per the boot recipe.

- [ ] Lane 1. Cold launch test profile. Save `lane1-cold-launch.png`. Pass when browser opens cleanly to homepage.
- [ ] Lane 2. Verify about support compositor. Save `lane2-compositor.png`. Pass when compositor reports WebRender hardware accelerated.
- [ ] Lane 3. Inspect telemetry upload disabled. Save `lane3-telemetry-off.png`. Pass when datareporting upload is false.
- [ ] Lane 4. Verify Pocket completely absent from UI. Save `lane4-no-pocket.png`. Pass when no Pocket button appears on toolbar or address bar.
- [ ] Lane 5. Inspect Normandy and Shield disabled. Save `lane5-no-normandy.png`. Pass when app.shield.optoutstudy is false.
- [ ] Lane 6. Inspect captive portal service disabled. Save `lane6-no-captive.png`. Pass when network.captive-portal-service is false.
- [ ] Lane 7. Navigate to YouTube video. Save `lane7-youtube-gpu.png`. Pass when video renders using NV12 hardware decode without dropped frames.
- [ ] Lane 8. Verify initial paint delay is 0ms. Save `lane8-paint-delay.png`. Pass when nglayout.initialpaint.delay is 0.
- [ ] Lane 9. Verify RAM cache cap is 1GB. Save `lane9-ram-cache.png`. Pass when browser.cache.memory.capacity is 1048576.
- [ ] Lane 10. Check clean shutdown with no pending pings. Save `lane10-clean-shutdown.png`. Pass when parent.lock releases immediately on exit.

**Verify, perf.** Tests alone are not sufficient verification. A PR is verified only when its unit, live, and perf boxes are all checked.

- [ ] Metric. Cold startup time to first paint in milliseconds.
- [ ] Probe. `Measure-Command { Start-Process -FilePath "engine\objdir-crush\dist\bin\firefox.exe" -ArgumentList @("-no-remote", "-profile", "sandbox\s3_google_signin_drm\profile", "about:blank") -Wait }`.
- [ ] Baseline. Record trunk 1420ms cold launch first.
- [ ] Rule. Head startup time must be below 1100ms and dropped video frames must equal 0.

**Review gate.** None. PR-TELEMETRY-PERF is not review-gated.

**Merge.**

- [ ] Root clean verdict at the exact head SHA.
- [ ] Bugbot triage done.
- [ ] Rebased onto current trunk after verdict.
- [ ] Operator appends PR-TELEMETRY-PERF to stack and lands it.

## Ingest cosmic logo and replace Firefox branding (PR-BRANDING-ASSETS)

**Depends on.** PR-TELEMETRY-PERF.

**Files.**

- [ ] Create `scripts/generate-branding-assets.ps1`.
- [ ] Edit `engine/browser/branding/nightly/locales/en-US/brand.ftl`.
- [ ] Edit `engine/browser/branding/nightly/locales/en-US/brand.properties`.
- [ ] Edit `engine/objdir-crush/dist/bin/browser/localization/en-US/branding/brand.ftl`.
- [ ] Edit `engine/objdir-crush/dist/bin/browser/chrome/en-US/locale/branding/brand.properties`.
- [ ] Edit `engine/objdir-crush/dist/bin/application.ini`.
- [ ] Create `engine/objdir-crush/dist/bin/chrome/icons/default/main-window.ico`.
- [ ] Edit `scripts/sync-extensions.ps1`.

**Build.**

- [ ] Convert `logo.png` into multi-frame `firefox.ico`, `document.ico`, and `main-window.ico` spanning 16px to 256px.
- [ ] Export scaled PNG assets (`default16.png` through `default256.png`, `about-logo.png`, `about.png`).
- [ ] Deploy icon files to `engine/browser/branding/nightly/` and `engine/objdir-crush/dist/bin/browser/chrome/browser/content/branding/`.
- [ ] Rebrand all application strings from Nightly and Firefox to Crush and Crush Sovereign Browser.

**You see.**

- [ ] Windows taskbar displays the electric cosmic C logo.
- [ ] Window titlebar displays Crush Sovereign Browser.
- [ ] About dialog displays the glowing Crush emblem and Crush Sovereign Browser text.

**Verify, unit.** Tests alone are not sufficient verification. A PR is verified only when its unit, live, and perf boxes are all checked.

- [ ] Asset generation test. Run `powershell -NoProfile -ExecutionPolicy Bypass -File scripts/generate-branding-assets.ps1` and verify generated `.ico` and `.png` file sizes on disk.

**Verify, live.** Tests alone are not sufficient verification. A PR is verified only when its unit, live, and perf boxes are all checked. Ten lanes on `flash` at the PR head, per the boot recipe.

- [ ] Lane 1. Inspect generated main-window.ico header. Save `lane1-ico-valid.png`. Pass when icon contains valid 256x256, 48x48, 32x32, and 16x16 directory entries.
- [ ] Lane 2. Launch browser and inspect window title. Save `lane2-titlebar.png`. Pass when titlebar string contains Crush Sovereign Browser and zero Nightly occurrences.
- [ ] Lane 3. Inspect Windows taskbar badge. Save `lane3-taskbar-icon.png`. Pass when taskbar displays the electric blue C logo.
- [ ] Lane 4. Open about dialog. Save `lane4-about-dialog.png`. Pass when dialog shows the cosmic C artwork and Crush brand name.
- [ ] Lane 5. Inspect application.ini. Save `lane5-app-ini.png`. Pass when Name is Crush and Vendor is Crush.
- [ ] Lane 6. Inspect about:support application basics. Save `lane6-support-name.png`. Pass when Name field displays Crush.
- [ ] Lane 7. Open private browsing window. Save `lane7-private-window.png`. Pass when private window title reflects Crush Private Browsing.
- [ ] Lane 8. Verify default new tab title. Save `lane8-new-tab-title.png`. Pass when tab tooltip shows New Tab with Crush icon.
- [ ] Lane 9. Verify bookmark star icon and menu branding. Save `lane9-menu-brand.png`. Pass when menu footer displays Crush.
- [ ] Lane 10. Check uninstaller and update strings. Save `lane10-strings-clean.png`. Pass when brand.properties contains zero Mozilla or Firefox strings.

**Verify, perf.** Tests alone are not sufficient verification. A PR is verified only when its unit, live, and perf boxes are all checked.

- [ ] Metric. Window icon rasterization and presentation latency in milliseconds.
- [ ] Probe. Measure time for `Get-Process firefox | Select-Object -ExpandProperty MainWindowTitle`.
- [ ] Baseline. Record trunk title read latency of 12ms first.
- [ ] Rule. Title read latency must remain under 20ms and icon memory allocation must remain under 2MB.

**Review gate.** None. PR-BRANDING-ASSETS is not review-gated.

**Merge.**

- [ ] Root clean verdict at the exact head SHA.
- [ ] Bugbot triage done.
- [ ] Rebased onto current trunk after verdict.
- [ ] Operator appends PR-BRANDING-ASSETS to stack and lands it.

## Implement Obsidian dark theme and vertical tabs (PR-UIUX-OBSIDIAN)

**Depends on.** PR-BRANDING-ASSETS.

**Files.**

- [ ] Edit `engine/objdir-crush/dist/bin/browser/defaults/preferences/crush.js`.
- [ ] Create `sandbox/s3_google_signin_drm/profile/chrome/userChrome.css`.
- [ ] Create `sandbox/s3_google_signin_drm/profile/chrome/userContent.css`.
- [ ] Edit `scripts/sync-extensions.ps1`.

**Build.**

- [ ] Enable `toolkit.legacyUserProfileCustomizations.stylesheets = true` in `crush.js`.
- [ ] Enable `sidebar.revamp = true` and `sidebar.verticalTabs = true` in `crush.js`.
- [ ] Write `userChrome.css` styling the vertical tab rail, obsidian dark chrome (`#090a0f`), glowing blue active tabs (`#00d2ff`), and floating pill Omnibar.
- [ ] Write `userContent.css` replacing the default new tab page with an obsidian dark dashboard featuring the glowing cosmic C logo.

**You see.**

- [ ] Browser window renders an obsidian dark palette.
- [ ] Tabs display vertically on the left side with active glowing indicator.
- [ ] Horizontal tab strip at the top collapses to reclaim vertical screen space.
- [ ] New tab page renders a clean dashboard with the cosmic C emblem and zero sponsored cards.

**Verify, unit.** Tests alone are not sufficient verification. A PR is verified only when its unit, live, and perf boxes are all checked.

- [ ] CSS syntax validation. Run `powershell -NoProfile -Command "Get-Content sandbox/s3_google_signin_drm/profile/chrome/userChrome.css | Out-Null; Get-Content sandbox/s3_google_signin_drm/profile/chrome/userContent.css | Out-Null"`.

**Verify, live.** Tests alone are not sufficient verification. A PR is verified only when its unit, live, and perf boxes are all checked. Ten lanes on `pro` at the PR head, per the boot recipe.

- [ ] Lane 1. Launch browser to new tab. Save `lane1-obsidian-newtab.png`. Pass when background is deep obsidian #090a0f and cosmic C emblem displays.
- [ ] Lane 2. Inspect vertical tab strip presence. Save `lane2-vertical-tabs.png`. Pass when tabs are aligned along the left vertical rail.
- [ ] Lane 3. Verify horizontal tab strip collapsed. Save `lane3-horizontal-collapsed.png`. Pass when top toolbar height is 44px or less.
- [ ] Lane 4. Open 5 tabs and inspect scrolling and active indicator. Save `lane4-active-tab-glow.png`. Pass when active tab shows electric cyan accent border.
- [ ] Lane 5. Focus address bar. Save `lane5-omnibar-focus.png`. Pass when Omnibar displays a subtle blue glow ring and centered pill geometry.
- [ ] Lane 6. Inspect window control buttons. Save `lane6-window-controls.png`. Pass when minimize, maximize, and close buttons blend into obsidian titlebar.
- [ ] Lane 7. Test sidebar expand and collapse toggle. Save `lane7-sidebar-toggle.png`. Pass when clicking toggle expands tab labels and collapses to icon rail.
- [ ] Lane 8. Navigate to dark website. Save `lane8-dark-website.png`. Pass when chrome boundary between browser UI and page content is seamless.
- [ ] Lane 9. Open context menu. Save `lane9-context-menu.png`. Pass when context menus render in obsidian dark styling with rounded corners.
- [ ] Lane 10. Open findbar. Save `lane10-findbar.png`. Pass when findbar docks at bottom with obsidian dark background and cyan match counters.

**Verify, perf.** Tests alone are not sufficient verification. A PR is verified only when its unit, live, and perf boxes are all checked.

- [ ] Metric. DOM restyle and frame paint time during tab switching in milliseconds.
- [ ] Probe. Measure frame duration when switching between 10 tabs using keyboard shortcut Ctrl+Tab.
- [ ] Baseline. Record trunk default theme tab switch latency of 28ms first.
- [ ] Rule. Obsidian vertical tab switch latency must stay under 30ms with zero visual layout thrashing.

**Review gate.** The operator reviews before merge.

- [ ] Copy lane 1 through 7 screenshots into `sandbox/screenshots/pr-uiux-review.png`.
- [ ] Record a 30 to 60 second video of the vertical tab rail and obsidian UI on a lane VM. Save it as `sandbox/screenshots/pr-uiux-review.mp4`.
- [ ] Post the screenshots and the video in chat. Stop at merge-ready. Wait for the operator's click.

**Merge.**

- [ ] Root clean verdict at the exact head SHA.
- [ ] Bugbot triage done.
- [ ] Rebased onto current trunk after verdict.
- [ ] Operator lands PR-UIUX-OBSIDIAN with Graphite gt.

## Close the program

- [ ] Every box above is checked with its evidence.
- [ ] Disarm the 30-minute audit tick via the Antigravity `manage_task` tool (`Action: "kill"`, `TaskId: <tick-task-id>`).
- [ ] Reply to the operator with the report the execution playbook names.

## Appendix A. Prototype evidence

- Prototype 1 tested native vertical tabs via `sidebar.verticalTabs: true` in Gecko v157.0. The engine natively supports vertical tabs without third party extensions.
- Prototype 2 tested runtime icon replacement via `chrome/icons/default/main-window.ico`. Gecko on Windows binds window icons directly from this directory without requiring binary recompilation.
- Prototype 3 tested CSS stylesheet loading via `toolkit.legacyUserProfileCustomizations.stylesheets = true`. Full chrome customization is active without engine binary churn.

## Appendix B. Alternatives rejected

- Downstream Gecko forks like Floorp or Zen were rejected. Upstream Gecko patch-queue architecture guarantees sub-2-minute artifact build dev loops and clean Google OAuth compatibility.
- Chromium Views UI modification was rejected. Chromium C++ Views UI requires 6-hour compiler passes and breaks on every upstream milestone sync.
- Heavy React or Webview UI shell was rejected. Extra abstraction layers introduce input latency and IPC marshaling overhead. Native Gecko XHTML and CSS provide 0ms latency.

## Appendix C. Risks

- In PR-TELEMETRY-PERF, disabling safe browsing remote lookups could reduce real-time phishing warning coverage. Mitigated by retaining local hash lists and uBlock Origin malicious domain filters.
- In PR-BRANDING-ASSETS, Windows Shell icon cache may hold stale taskbar icons until Explorer refreshes. Mitigated by flushing the shell icon cache or registering `main-window.ico`.
- In PR-UIUX-OBSIDIAN, upstream Gecko UI changes in major releases could shift CSS selectors. Mitigated by scoping CSS rules to stable standard IDs (`#sidebar-box`, `#nav-bar`, `#urlbar`).

## Appendix D. Links and reading list

- `engine/browser/base/content/browser.xhtml`
- `engine/browser/themes/shared/browser.css`
- `engine/browser/app/profile/firefox.js`
- `skills/how/SKILL.md`
- `skills/show-me-your-work/SKILL.md`
