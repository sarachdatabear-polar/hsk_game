# One-command release build: stage web -> sync -> write keystore.properties ->
# gradle assembleRelease -> copy signed APK out -> delete the secret props.
#
# Set the keystore passwords in the environment first (values are in
# android-signing/KEYSTORE_INFO.txt):
#   $env:NBHSK_STORE_PASS = "..."; $env:NBHSK_KEY_PASS = "..."
$ErrorActionPreference = "Stop"
$game = "C:\Users\sarac\Desktop\HSK\game"
$env:JAVA_HOME = [Environment]::GetEnvironmentVariable("JAVA_HOME", "User")
$env:ANDROID_HOME = "$env:LOCALAPPDATA\Android\Sdk"

if (-not $env:NBHSK_STORE_PASS -or -not $env:NBHSK_KEY_PASS) {
  throw "Set NBHSK_STORE_PASS and NBHSK_KEY_PASS (see android-signing/KEYSTORE_INFO.txt) before building."
}

Set-Location $game
npm run build
node scripts/stage-www.js
npx cap sync android

# Java .properties treats backslash as an escape char, so write the path with
# forward slashes (Gradle's file() accepts them on Windows).
$ksPath = "$game\android-signing\nbhsk-release.keystore" -replace '\\', '/'
@"
storeFile=$ksPath
storePassword=$env:NBHSK_STORE_PASS
keyAlias=nbhsk
keyPassword=$env:NBHSK_KEY_PASS
"@ | Set-Content -Encoding ASCII "$game\android\keystore.properties"

try {
  Set-Location "$game\android"
  .\gradlew.bat assembleRelease --no-daemon
  $apk = "app\build\outputs\apk\release\app-release.apk"
  if (-not (Test-Path $apk)) { throw "release APK not produced at $apk" }
  New-Item -ItemType Directory -Force "$game\dist-apk" | Out-Null
  Copy-Item $apk "$game\dist-apk\HSK-Zombie-1.0.0.apk" -Force
  Write-Host "Signed APK: $game\dist-apk\HSK-Zombie-1.0.0.apk"
}
finally {
  # never leave the signing passwords on disk
  Remove-Item "$game\android\keystore.properties" -ErrorAction SilentlyContinue
}
