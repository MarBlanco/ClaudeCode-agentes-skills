# SyncProject v2: envoltorio de scripts/sync-project.mjs (la lógica y sus tests viven en Node).
#   .\scripts\sync-project.ps1 -Project <ruta> -Profile <perfil> [-Modules payments] [-Apply] [-RetireLegacy]
#   .\scripts\sync-project.ps1 -Project <ruta> -Rollback [-Timestamp <ts>]
#   .\scripts\sync-project.ps1 -Project <ruta> -ListBackups
# Sin -Apply es dry-run. Perfiles: templates/profiles/*.json.
param(
    [Parameter(Mandatory = $true)][string]$Project,
    [string]$Profile,
    [string[]]$Modules = @(),
    [switch]$Apply,
    [switch]$RetireLegacy,
    [switch]$Rollback,
    [string]$Timestamp,
    [switch]$ListBackups
)
$ErrorActionPreference = 'Stop'
if (-not (Get-Command node -ErrorAction SilentlyContinue)) { Write-Error 'FALLO: se requiere Node.js en PATH'; exit 1 }
$script = Join-Path $PSScriptRoot 'sync-project.mjs'
$argsList = @('--project', $Project)
if ($ListBackups) { $argsList += '--list-backups' }
elseif ($Rollback) { $argsList += '--rollback'; if ($Timestamp) { $argsList += $Timestamp } }
else {
    if ($Profile) { $argsList += @('--profile', $Profile) }
    if ($Modules.Count -gt 0) { $argsList += @('--modules', ($Modules -join ',')) }
    if ($Apply) { $argsList += '--apply' }
    if ($RetireLegacy) { $argsList += '--retire-legacy' }
}
& node $script @argsList
exit $LASTEXITCODE
