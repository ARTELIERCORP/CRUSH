# Spike S1: Local Artifact Build Dev Loop

## Goal
Verify the fast, zero-C++ local development loop on the Windows 11 host using Mozilla's `--enable-artifact-builds` mechanism.

## Prerequisites
- Windows 11 host
- MozillaBuild installed under `C:\mozilla-build`
- Shallow clone or source snapshot of Firefox Release

## How to Run
1. Run `bootstrap_env.ps1` to download and silently install MozillaBuild to `C:\mozilla-build`.
2. Generate `mozconfig` specifying:
   ```sh
   ac_add_options --enable-artifact-builds
   mk_add_options MOZ_OBJDIR=@TOPSRCDIR@/objdir-crush
   ```
3. Execute `./mach build` from within the MozillaBuild bash environment.
4. Record elapsed build time, peak RAM, and disk utilization.

## What Success Looks Like
- Artifact build finishes cleanly without local C++ compilation.
- Sub-2-minute incremental rebuild time on front-end assets.
- `./mach run` successfully spawns the browser window.

## Measured Results
- Status: In progress (bootstrapping prerequisites).
- Build time: TODO_MEASURE
- Disk consumption: TODO_MEASURE
