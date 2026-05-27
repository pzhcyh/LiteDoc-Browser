$ErrorActionPreference = "Stop"

$devEco = "D:\01_APP\HUAWEI coding\devecostudio\DevEco Studio"
$project = "D:\LiteDocMobile"
$hap = Join-Path $project "release\LiteDocMobile-entry-default.hap"

$env:NODE_HOME = Join-Path $devEco "tools\node"
$env:DEVECO_SDK_HOME = Join-Path $devEco "sdk"
$env:JAVA_HOME = "C:\Program Files\Java\jdk-17"
$env:PATH = "$env:NODE_HOME;$env:JAVA_HOME\bin;C:\Windows\System32;C:\Windows;C:\Windows\System32\WindowsPowerShell\v1.0;$env:PATH"

Write-Host "Syncing dependencies..."
& (Join-Path $env:NODE_HOME "node.exe") `
  (Join-Path $devEco "tools\ohpm\bin\pm-cli.js") `
  install --all --registry https://ohpm.openharmony.cn/ohpm/ --strict_ssl true

Write-Host "Building HAP..."
Push-Location $project
try {
  & (Join-Path $devEco "tools\hvigor\bin\hvigorw.bat") assembleApp --no-daemon --stacktrace
} finally {
  Pop-Location
}

New-Item -ItemType Directory -Force -Path (Join-Path $project "release") | Out-Null
Copy-Item `
  -Path (Join-Path $project "entry\build\default\outputs\default\app\entry-default.hap") `
  -Destination $hap `
  -Force

Write-Host "Checking connected devices..."
& (Join-Path $devEco "sdk\default\openharmony\toolchains\hdc.exe") list targets

Write-Host "Installing HAP..."
& (Join-Path $devEco "sdk\default\openharmony\toolchains\hdc.exe") install $hap

Write-Host "Done."

