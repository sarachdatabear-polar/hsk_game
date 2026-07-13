# Android Build Guide — Lucky Cat HSK

How to build the Android app from this repo. The web game (`index.html` + `dist/app.js`
+ `data/` + `audio/`) is wrapped with Capacitor and compiled to an APK.

## Installed toolchain (Task 1)

| Component | Version | Location (this machine) |
|-----------|---------|-------------------------|
| JDK | Temurin 17.0.19 | `JAVA_HOME=C:\Program Files\Eclipse Adoptium\jdk-17.0.19.10-hotspot` |
| Android SDK | cmdline-tools latest | `ANDROID_HOME=C:\Users\sarac\AppData\Local\Android\Sdk` |
| Platform | android-34 | `%ANDROID_HOME%\platforms\android-34` |
| Build-tools | 34.0.0 | `%ANDROID_HOME%\build-tools\34.0.0` |
| platform-tools | adb 1.0.41 | `%ANDROID_HOME%\platform-tools` |

Capacitor 6 requires **JDK 17** (not 11, not 21). `JAVA_HOME` and `ANDROID_HOME` are set
as User environment variables. All 7 SDK package licenses are accepted.

Verify the toolchain any time:
```powershell
& "$env:JAVA_HOME\bin\java.exe" -version           # openjdk 17.0.x
& "$env:ANDROID_HOME\platform-tools\adb.exe" --version
Test-Path "$env:ANDROID_HOME\platforms\android-34\android.jar"   # True
```

### How the toolchain was installed
- JDK: `winget install --id EclipseAdoptium.Temurin.17.JDK -e`
- Command-line tools: downloaded `commandlinetools-win_latest.zip` from
  https://developer.android.com/studio#command-line-tools-only, extracted so
  `sdkmanager.bat` lives at `%ANDROID_HOME%\cmdline-tools\latest\bin\`.
- Licenses (must run before installing packages, or the install hangs on a y/N prompt):
  ```powershell
  $yes = "$env:TEMP\sdk_yes.txt"; Set-Content $yes (1..50 | %{"y"}) -Encoding ASCII
  cmd /c "`"$env:ANDROID_HOME\cmdline-tools\latest\bin\sdkmanager.bat`" --sdk_root=`"$env:ANDROID_HOME`" --licenses < `"$yes`""
  ```
  (PowerShell's `$x | sdkmanager` does NOT feed stdin to the .bat reliably — use `cmd /c "... < file"`.)
- Packages:
  ```powershell
  cmd /c "`"...\sdkmanager.bat`" --sdk_root=`"$env:ANDROID_HOME`" platform-tools `"platforms;android-34`" `"build-tools;34.0.0`" < `"$yes`""
  ```

## Regenerate & build

The `android/` folder is git-ignored and fully regenerable. To recreate it from scratch:

```powershell
$env:JAVA_HOME = [Environment]::GetEnvironmentVariable("JAVA_HOME","User")
$env:ANDROID_HOME = "$env:LOCALAPPDATA\Android\Sdk"
cd C:\Users\sarac\Desktop\HSK\game
npm run build; node scripts/stage-www.js   # stage web assets into www/
npx cap add android                          # scaffold android/ (only if missing)
npx cap sync android                         # copy www/ -> android assets + plugins
```

**Manual edits to reapply after a fresh `cap add android`** (android/ is git-ignored, so these
don't persist across a regen):
- `android/app/build.gradle` → `versionName "1.0.0"` (Capacitor generates `"1.0"`); `versionCode 1` and `applicationId "com.luckycat.hsk"` are already correct.
- Release signingConfig — add inside the `android { }` block of `android/app/build.gradle`:
  ```gradle
  def kp = new Properties()
  def kpf = rootProject.file("keystore.properties")
  if (kpf.exists()) { kp.load(new FileInputStream(kpf)) }
  signingConfigs {
      release {
          if (kpf.exists()) {
              storeFile file(kp['storeFile']); storePassword kp['storePassword']
              keyAlias kp['keyAlias']; keyPassword kp['keyPassword']
          }
      }
  }
  ```
  and in `buildTypes.release` add: `signingConfig kpf.exists() ? signingConfigs.release : signingConfigs.debug`.
  `keystore.properties` is written (and deleted) by `scripts/build_apk.ps1`; its `storeFile` path MUST use
  forward slashes (Java .properties treats `\` as an escape char).

## Signing (Task 8)

The release keystore is at `android-signing/nbhsk-release.keystore` (git-ignored). Its passwords are in
`android-signing/KEYSTORE_INFO.txt`. To build a signed APK:
```powershell
$env:NBHSK_STORE_PASS = "<store pass from KEYSTORE_INFO.txt>"
$env:NBHSK_KEY_PASS   = "<key pass from KEYSTORE_INFO.txt>"
npm run apk:release      # -> dist-apk/LuckyCatHSK-1.0.0.apk (release-signed, ~19 MB)
```
Verify: `apksigner verify --print-certs dist-apk/LuckyCatHSK-1.0.0.apk` → `CN=NorthBear` (the
signing certificate predates this rename; the cert subject doesn't need to match the app name
and must not change without re-signing with a new keystore, which would break update continuity).

Build the debug APK (no signing, for testing):
```powershell
cd android; .\gradlew.bat assembleDebug --no-daemon
# -> android\app\build\outputs\apk\debug\app-debug.apk  (~20 MB, bundles all 2000 mp3s)
```

- App icons/splash: `python scripts/make_android_icons.py` (Task 6, re-run after each `cap add android`
  since it writes into the git-ignored `android/` res tree). Produces the green 熊 adaptive launcher
  icon (dark-green background) and the centered-bear splash on `#141a14`. Uses `msyhbd.ttc` (Microsoft
  YaHei Bold) — the plan referenced `.ttf`, but this machine has the `.ttc` collection.
- Signed release APK: `npm run apk:release` (Task 8)

## Emulator verification (Task 7)

Verified on AVD `nbhsk` (Pixel 6, android-34 google_apis x86_64, headless):
```powershell
& "$env:ANDROID_HOME\emulator\emulator.exe" -avd nbhsk -no-window -no-audio -gpu swiftshader_indirect
& "$env:ANDROID_HOME\platform-tools\adb.exe" install -r android\app\build\outputs\apk\debug\app-debug.apk
& adb shell am start -n com.luckycat.hsk/.MainActivity
```
Confirmed: app launches full-screen (no browser chrome), home + scope + battle render, sprite
zombie + bilingual options draw, SFX/audio toggles present. Hardware **back button**: sub-screen →
home, home → exits app (verified via `dumpsys activity activities` topResumedActivity). WebView JS
state inspected over CDP (`adb forward tcp:9222 localabstract:webview_devtools_remote_<pid>`).

**Known minor:** the system status bar renders grey rather than `#141a14` on this API-34 emulator
(theme `android:statusBarColor` appears to take precedence over the StatusBar plugin call). Cosmetic
only; does not affect playability. Candidate future fix: set `android:statusBarColor` in the app theme.

## Install on your phone (sideload)

The app is distributed as a private signed APK — no Google Play, no account needed.

1. Build it: `npm run apk:release` → `dist-apk/LuckyCatHSK-1.0.0.apk`.
2. Copy that `.apk` to your phone (USB cable, Google Drive, or a messaging app to yourself).
3. On the phone, tap the file. Android will ask to allow "Install unknown apps" for whatever app
   you opened it from (Files / Chrome / Drive) — enable it, then tap Install.
4. Launch **Lucky Cat HSK** from your app drawer. Works fully offline (words + 2000 audio clips are
   bundled inside the app).

To update later: bump `versionCode`/`versionName` in `android/app/build.gradle`, rebuild, reinstall.
**The same keystore must sign every update** — back up `android-signing/` now.

## Latest release candidate (Lantern Trail Phase 6, 2026-07-13)

- Web gate: 62 test files / 1,827 tests, production build, and 95 manifest assets pass.
- Responsive gate: two consecutive 10-viewport sweeps plus both listening probes and real Results
  probes at 360×640, 390×844, and 640×360 pass.
- PWA cache: SHELL v69.
- Signed APK: `dist-apk/LuckyCatHSK-1.0.0.apk`, 38,282,269 bytes.
- SHA-256: `A81970806068EDF0FD436A9B000CF228844081CFDB0EDB264BE3A6CB1526488F`.
- Signature: verified with `apksigner`; existing certificate DN starts `CN=NorthBear`.
- Remaining gate: install this exact APK on a mid-range Android phone and complete the Lantern Trail
  manual matrix in the live migration plan before releasing to `main`.

## Notes
- `android/` and `android-signing/` are **git-ignored**. `android/` is fully regenerable
  from `capacitor.config.json` + the web assets. `android-signing/` holds the release
  **keystore** (a durable secret — back it up; losing it blocks future updates to the same
  app id) and is never committed.
