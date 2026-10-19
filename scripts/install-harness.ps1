# Instala/reinstala global/HARNESS.md como ~/.claude/HARNESS.md.
# Solo copia ese archivo. No modifica otros proyectos ni ~/.claude/CLAUDE.md.
$ErrorActionPreference = 'Stop'

$repoRoot = Split-Path -Parent $PSScriptRoot
$source = Join-Path $repoRoot 'global\HARNESS.md'
$targetDir = Join-Path $env:USERPROFILE '.claude'
$target = Join-Path $targetDir 'HARNESS.md'

if (-not (Test-Path -LiteralPath $source -PathType Leaf)) {
    Write-Error "FALLO: no existe $source"
    exit 1
}

if (-not (Test-Path -LiteralPath $targetDir)) {
    New-Item -ItemType Directory -Path $targetDir | Out-Null
    Write-Host "Creado: $targetDir"
}

Copy-Item -LiteralPath $source -Destination $target -Force

if (-not (Test-Path -LiteralPath $target -PathType Leaf)) {
    Write-Error "FALLO: la copia no existe en $target"
    exit 1
}

$srcHash = (Get-FileHash -LiteralPath $source -Algorithm SHA256).Hash
$dstHash = (Get-FileHash -LiteralPath $target -Algorithm SHA256).Hash
if ($srcHash -ne $dstHash) {
    Write-Error "FALLO: la copia difiere de la fuente"
    exit 1
}

Write-Host "OK: $source -> $target"
Write-Host "SHA256: $dstHash"

$userClaude = Join-Path $targetDir 'CLAUDE.md'
$hasImport = (Test-Path -LiteralPath $userClaude) -and (Select-String -LiteralPath $userClaude -Pattern '^@HARNESS\.md\s*$' -Quiet)
if (-not $hasImport) {
    Write-Warning "$userClaude no importa @HARNESS.md; agregá esa línea para que se cargue."
}
