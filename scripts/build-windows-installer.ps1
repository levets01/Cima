Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

$root = Split-Path -Parent $PSScriptRoot
Set-Location $root

function Ensure-Command {
    param([string]$Name)
    $command = Get-Command $Name -ErrorAction SilentlyContinue
    if (-not $command) {
        throw "No se encontró '$Name' en PATH. Instálalo o usa el runner con Inno Setup disponible."
    }
}

Write-Host '==> Instalando dependencias del proyecto'
npm ci
npm --prefix backend ci

Write-Host '==> Preparando la aplicación empaquetada'
npm run desktop:prepare

Write-Host '==> Generando el paquete portable para Windows x64'
$env:CI = 'true'
& npx electron-builder --win zip --x64 --publish never

$innoPath = @(
    'C:\Program Files (x86)\Inno Setup 6\ISCC.exe',
    'C:\Program Files\Inno Setup 6\ISCC.exe',
    'C:\Program Files (x86)\Inno Setup 5\ISCC.exe',
    'C:\Program Files\Inno Setup 5\ISCC.exe'
) | Where-Object { Test-Path $_ } | Select-Object -First 1

if (-not $innoPath) {
    Write-Warning 'Inno Setup no está instalado en este equipo. El paquete portable ya quedó preparado en release/. La compilación del Setup.exe requiere el compilador ISCC.exe.'
    exit 0
}

Write-Host "==> Compilando el instalador con Inno Setup: $innoPath"
& $innoPath "installer\Cima.iss"

$releaseDir = Join-Path $root 'release'
Get-ChildItem -Path $releaseDir -Filter 'Cima-*.exe' | ForEach-Object {
    Write-Host ('Instalador listo: ' + $_.FullName)
}
