# Android Build Guide — NorthBear HSK Zombie

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
- `android/app/build.gradle` → `versionName "1.0.0"` (Capacitor generates `"1.0"`); `versionCode 1` and `applicationId "com.northbear.hskzombie"` are already correct.
- Release signingConfig block (added in Task 8; the build script `scripts/build_apk.ps1` is the source of truth).

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

## Notes
- `android/` and `android-signing/` are **git-ignored**. `android/` is fully regenerable
  from `capacitor.config.json` + the web assets. `android-signing/` holds the release
  **keystore** (a durable secret — back it up; losing it blocks future updates to the same
  app id) and is never committed.
