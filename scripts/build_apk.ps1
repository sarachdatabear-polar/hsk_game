# One-command signed Android release build: stage web -> sync -> write
# keystore.properties -> run the requested Gradle task(s) -> copy artifact(s)
# out -> delete the secret props. Default stays APK for backwards compatibility;
# use -Artifact Aab for Play Console or -Artifact Both for a release cut.
#
# Set the keystore passwords in the environment first (values are in
# android-signing/KEYSTORE_INFO.txt):
#   $env:NBHSK_STORE_PASS = "..."; $env:NBHSK_KEY_PASS = "..."
param(
  [ValidateSet("Apk", "Aab", "Both")]
  [string]$Artifact = "Apk"
)

$ErrorActionPreference = "Stop"
$game = "C:\Users\sarac\Desktop\HSK\game"
$env:JAVA_HOME = [Environment]::GetEnvironmentVariable("JAVA_HOME", "User")
$env:ANDROID_HOME = "$env:LOCALAPPDATA\Android\Sdk"

if (-not $env:NBHSK_STORE_PASS -or -not $env:NBHSK_KEY_PASS) {
  throw "Set NBHSK_STORE_PASS and NBHSK_KEY_PASS (see android-signing/KEYSTORE_INFO.txt) before building."
}

Set-Location $game
npm run cap:sync

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
  $tasks = switch ($Artifact) {
    "Apk"  { @("assembleRelease") }
    "Aab"  { @("bundleRelease") }
    "Both" { @("assembleRelease", "bundleRelease") }
  }
  & .\gradlew.bat @tasks --no-daemon
  if ($LASTEXITCODE -ne 0) { throw "Gradle release build failed with exit code $LASTEXITCODE" }
  New-Item -ItemType Directory -Force "$game\dist-apk" | Out-Null
  if ($Artifact -in @("Apk", "Both")) {
    $apk = "app\build\outputs\apk\release\app-release.apk"
    if (-not (Test-Path $apk)) { throw "release APK not produced at $apk" }
    Copy-Item $apk "$game\dist-apk\LuckyCatHSK-1.0.0.apk" -Force
    Write-Host "Signed APK: $game\dist-apk\LuckyCatHSK-1.0.0.apk"
  }
  if ($Artifact -in @("Aab", "Both")) {
    $aab = "app\build\outputs\bundle\release\app-release.aab"
    if (-not (Test-Path $aab)) { throw "release AAB not produced at $aab" }
    Copy-Item $aab "$game\dist-apk\LuckyCatHSK-1.0.0.aab" -Force
    Write-Host "Signed AAB: $game\dist-apk\LuckyCatHSK-1.0.0.aab"
  }
}
finally {
  # never leave the signing passwords on disk
  Remove-Item "$game\android\keystore.properties" -ErrorAction SilentlyContinue
}
