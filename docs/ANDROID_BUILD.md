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

## Regenerate & build (filled in by later tasks)

- Regenerate the native project: `npx cap add android && npx cap sync android` (Task 3)
- Debug APK: `cd android && .\gradlew.bat assembleDebug` (Task 3)
- App icons/splash: `python scripts/make_android_icons.py` (Task 6)
- Signed release APK: `npm run apk:release` (Task 8)

## Notes
- `android/` and `android-signing/` are **git-ignored**. `android/` is fully regenerable
  from `capacitor.config.json` + the web assets. `android-signing/` holds the release
  **keystore** (a durable secret — back it up; losing it blocks future updates to the same
  app id) and is never committed.
