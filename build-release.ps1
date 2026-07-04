# ============================================================
#  排課系統 一鍵打包腳本（開發者用，使用者不會看到）
#
#  用法：在 repo 根目錄執行  ->  powershell -ExecutionPolicy Bypass -File .\build-release.ps1
#
#  產出：
#    release\排課系統\        免安裝綠色資料夾（自帶 .NET 執行環境）
#    release\排課系統.zip      交付用壓縮檔
# ============================================================

$ErrorActionPreference = 'Stop'
$root = $PSScriptRoot

$web       = Join-Path $root 'src\schedule-web'
$api       = Join-Path $root 'src\Schedule.Api'
$wwwroot   = Join-Path $api  'wwwroot'
$dist      = Join-Path $web  'dist'
$releaseDir = Join-Path $root 'release'
$outDir    = Join-Path $releaseDir '排課系統'
$zipPath   = Join-Path $releaseDir '排課系統.zip'
$readme    = Join-Path $root 'packaging\使用說明.txt'

function Assert-Exit($what) {
    if ($LASTEXITCODE -ne 0) { throw "$what 失敗（exit code $LASTEXITCODE）" }
}

Write-Host '==> [1/5] 建置前端 (npm build)...' -ForegroundColor Cyan
Push-Location $web
try {
    if (Test-Path (Join-Path $web 'package-lock.json')) {
        & npm ci; Assert-Exit 'npm ci'
    } else {
        & npm install; Assert-Exit 'npm install'
    }
    & npm run build; Assert-Exit 'npm run build'
} finally {
    Pop-Location
}

Write-Host '==> [2/5] 複製前端產物到 wwwroot...' -ForegroundColor Cyan
if (Test-Path $wwwroot) { Remove-Item $wwwroot -Recurse -Force }
New-Item -ItemType Directory -Path $wwwroot | Out-Null
Copy-Item (Join-Path $dist '*') $wwwroot -Recurse -Force

Write-Host '==> [3/5] 發佈後端 (dotnet publish, self-contained)...' -ForegroundColor Cyan
if (Test-Path $outDir) { Remove-Item $outDir -Recurse -Force }
& dotnet publish $api -c Release -r win-x64 --self-contained true -o $outDir
Assert-Exit 'dotnet publish'

Write-Host '==> [4/5] 整理交付資料夾...' -ForegroundColor Cyan
# 把 apphost 執行檔改成中文名（DLL 內部參照不變，仍能正常啟動）
$srcExe = Join-Path $outDir 'Schedule.Api.exe'
$dstExe = Join-Path $outDir '排課系統.exe'
if (Test-Path $srcExe) {
    if (Test-Path $dstExe) { Remove-Item $dstExe -Force }
    Rename-Item $srcExe '排課系統.exe'
}
# 移除使用者用不到的檔案
Get-ChildItem $outDir -Filter '*.pdb' | Remove-Item -Force
$devSettings = Join-Path $outDir 'appsettings.Development.json'
if (Test-Path $devSettings) { Remove-Item $devSettings -Force }
# 放入使用說明
Copy-Item $readme $outDir -Force

Write-Host '==> [5/5] 壓縮成 zip...' -ForegroundColor Cyan
if (Test-Path $zipPath) { Remove-Item $zipPath -Force }
Compress-Archive -Path $outDir -DestinationPath $zipPath -Force

Write-Host ''
Write-Host '完成！' -ForegroundColor Green
Write-Host ("  資料夾： " + $outDir)
Write-Host ("  壓縮檔： " + $zipPath)
Write-Host ''
Write-Host '交付方式：把 release\排課系統.zip 給對方，請他解壓縮後點兩下「排課系統.exe」即可。'
