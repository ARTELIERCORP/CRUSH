# Spike S2: GitHub Actions Automated Build Pipeline

## Goal
Verify that a complete, distributable Windows x64 binary build of Crush can be compiled completely free on standard GitHub-hosted public runners without exceeding the 6-hour execution timeout limit.

## Build Matrix Candidates
1. **Linux Cross-Compilation (`ubuntu-latest`)**:
   - Toolchain: `clang-cl`, `lld-link`, `xwin` (Windows SDK & CRT headers).
   - Advantage: Faster process spawning, efficient memory allocation, lower runner queue times.
2. **Native Windows Compilation (`windows-latest`)**:
   - Toolchain: MozillaBuild, Visual Studio Build Tools, native MSVC.
   - Advantage: Native execution without cross-compilation emulation.

## Verification Criteria
- Build completes within the 6-hour runner limit.
- Peak disk consumption stays strictly within the runner's available storage.
- Produces valid `crush.exe` and distributable package artifact.

## Measured Results
- Status: Scheduled after Spike S1 baseline.
- `ubuntu-latest` cross-compile duration: TODO_MEASURE
- `windows-latest` native compile duration: TODO_MEASURE
