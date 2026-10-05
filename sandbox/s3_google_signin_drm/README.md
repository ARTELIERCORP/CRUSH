# Spike S3: Google Account Sign-In & Widevine DRM Verification

## Goal
Verify that the Gecko engine base allows unhindered Google Account OAuth login on standard Google web properties (Gmail, YouTube) in a clean browser profile without BotGuard rejection, and assess Widevine CDM CDM activation status.

## Hypotheses
1. **Google Web Authentication**: Standard Gecko engine presents standard TLS ClientHello, HTTP/2 frame parameters, and DOM objects that Google's BotGuard VM treats as a standard Firefox desktop client.
2. **Widevine DRM**: Widevine CDM requires proper CDM client registration. Free artifact builds may require manual CDM activation or Mozilla CDM service download flags.

## Verification Steps
1. Launch artifact build with a clean, isolated profile using:
   ```powershell
   powershell -ExecutionPolicy Bypass -File .\scripts\launch-test-profile.ps1 -Url "https://accounts.google.com"
   ```
2. Navigate to `accounts.google.com` and log in to a Google account.
3. Verify successful redirect to inbox/channel dashboard without BotGuard `/v3/signin/rejected` challenge.
4. Verify DRM video playback:
   ```powershell
   powershell -ExecutionPolicy Bypass -File .\scripts\launch-test-profile.ps1 -Url "https://shaka-player-demo.appspot.com/"
   ```

## Measured Results
- Status: Ready for User Interactive Verification (Rule 34: GUI launch is reserved for user).
- Launcher: `scripts/launch-test-profile.ps1`
- Engine binary: `engine/objdir-crush/dist/bin/firefox.exe` (157.0 x64)
- Google Sign-In: Ready for testing.
- Widevine Playback: Ready for testing.
