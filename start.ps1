# MotoRescue - run the whole project on one localhost port (8080).
# Usage: right-click > Run with PowerShell, or:  powershell -ExecutionPolicy Bypass -File .\start.ps1

$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent $MyInvocation.MyCommand.Path
$frontend = Join-Path $root 'frontend'
$backend = Join-Path $root 'backend'
$static = Join-Path $backend 'src\main\resources\static'

$env:Path = 'C:\Program Files\nodejs;' + $env:Path
$env:JAVA_HOME = 'C:\Program Files\Java\jdk-23'

Write-Host 'Building the Angular app...'
Push-Location $frontend
try {
    npm run build
    if ($LASTEXITCODE -ne 0) { throw 'Frontend build failed.' }
} finally {
    Pop-Location
}

Write-Host 'Publishing the app into Spring Boot...'
if (Test-Path $static) { Remove-Item $static -Recurse -Force }
New-Item -ItemType Directory -Path $static | Out-Null
Copy-Item (Join-Path $frontend 'dist\motorescue-ui\browser\*') $static -Recurse -Force

$conn = Get-NetTCPConnection -LocalPort 8080 -State Listen -ErrorAction SilentlyContinue
if ($conn) {
    $conn.OwningProcess | Sort-Object -Unique | ForEach-Object {
        Stop-Process -Id $_ -Force -ErrorAction SilentlyContinue
    }
    Start-Sleep -Seconds 2
}

Write-Host 'Starting MotoRescue...'
$log = Join-Path $env:TEMP 'motorescue-backend.log'
$err = Join-Path $env:TEMP 'motorescue-backend.err.log'
Start-Process -FilePath (Join-Path $backend 'mvnw.cmd') `
    -ArgumentList '-q', '-DskipTests', 'spring-boot:run' `
    -WorkingDirectory $backend -WindowStyle Hidden `
    -RedirectStandardOutput $log -RedirectStandardError $err

for ($i = 0; $i -lt 60; $i++) {
    Start-Sleep -Seconds 2
    if (Test-NetConnection -ComputerName localhost -Port 8080 -InformationLevel Quiet -WarningAction SilentlyContinue) {
        Write-Host ''
        Write-Host 'MotoRescue is live: http://localhost:8080' -ForegroundColor Green
        Start-Process 'http://localhost:8080'
        exit 0
    }
}

Write-Host 'The server did not start. Last log lines:' -ForegroundColor Red
Get-Content $log -Tail 30 -ErrorAction SilentlyContinue
Get-Content $err -Tail 30 -ErrorAction SilentlyContinue
exit 1
