# Instala/reinstala global/HARNESS.md como ~/.claude/HARNESS.md.
# Solo copia ese archivo. No modifica otros proyectos ni ~/.claude/CLAUDE.md.
#
# Opcional: Codebase Memory MCP (https://github.com/DeusData/codebase-memory-mcp).
# Sin -CodebaseMemory el script se comporta como siempre (solo HARNESS.md).
#   -CodebaseMemory Status   solo informa (binario, registro MCP). No modifica nada.
#   -CodebaseMemory Install  descarga release oficial, verifica SHA-256, registra MCP (scope user).
#   -CodebaseMemory Update   igual que Install pero reemplaza el binario por la ultima release.
#   -CodebaseMemory Remove   quita el registro MCP y el binario. Los indices se conservan.
#
# Plugins del harness:
#   -Marketplace             registra este repo como marketplace "harness" e instala/actualiza
#                            harness-core (scope user). Los modulos web/payments se activan por
#                            proyecto con scripts/sync-project.ps1.
#   -DryRun                  con -Marketplace, solo informa que haria.
#   -SyncUser/-SyncProject   obsoletos: avisan y no copian nada.
param(
    [ValidateSet('None', 'Status', 'Install', 'Update', 'Remove')]
    [string]$CodebaseMemory = 'None',
    [switch]$Marketplace,
    [switch]$SyncUser,
    [string[]]$SyncProject = @(),
    [switch]$DryRun
)
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

# ---------------------------------------------------------------------------
# Codebase Memory MCP (opcional)
# ---------------------------------------------------------------------------
function Get-CmmState {
    $cmmDir = Join-Path $env:LOCALAPPDATA 'codebase-memory-mcp\bin'
    $cmmExe = Join-Path $cmmDir 'codebase-memory-mcp.exe'
    $claudeJson = Join-Path $env:USERPROFILE '.claude.json'
    $registered = $false
    $registeredCmd = $null
    if (Test-Path -LiteralPath $claudeJson) {
        $cfg = Get-Content -LiteralPath $claudeJson -Raw | ConvertFrom-Json
        $entry = if ($cfg.PSObject.Properties['mcpServers']) { $cfg.mcpServers.PSObject.Properties['codebase-memory-mcp'] } else { $null }
        if ($entry) { $registered = $true; $registeredCmd = $entry.Value.command }
    }
    [pscustomobject]@{
        Dir = $cmmDir; Exe = $cmmExe
        BinaryPresent = (Test-Path -LiteralPath $cmmExe -PathType Leaf)
        Registered = $registered; RegisteredCommand = $registeredCmd
    }
}

function Install-Cmm([bool]$replace) {
    $st = Get-CmmState
    if ($st.BinaryPresent -and -not $replace) {
        Write-Host "Binario ya presente: $($st.Exe) (usar -CodebaseMemory Update para actualizar)"
    } else {
        if ($env:PROCESSOR_ARCHITECTURE -eq 'ARM64') { $asset = 'codebase-memory-mcp-windows-arm64.zip' }
        else { $asset = 'codebase-memory-mcp-windows-amd64.zip' }
        $base = 'https://github.com/DeusData/codebase-memory-mcp/releases/latest/download'
        $tmp = Join-Path ([IO.Path]::GetTempPath()) ("cmm-" + [guid]::NewGuid().ToString('N'))
        New-Item -ItemType Directory -Path $tmp | Out-Null
        try {
            Write-Host "Descargando $asset y checksums.txt (release oficial DeusData/codebase-memory-mcp)..."
            Invoke-WebRequest -Uri "$base/$asset" -OutFile (Join-Path $tmp $asset) -UseBasicParsing
            Invoke-WebRequest -Uri "$base/checksums.txt" -OutFile (Join-Path $tmp 'checksums.txt') -UseBasicParsing
            $line = Get-Content -LiteralPath (Join-Path $tmp 'checksums.txt') | Where-Object { $_ -match [regex]::Escape($asset) + '\s*$' } | Select-Object -First 1
            if (-not $line) { throw "FALLO: $asset no figura en checksums.txt" }
            $expected = ($line -split '\s+')[0].ToLower()
            $actual = (Get-FileHash -LiteralPath (Join-Path $tmp $asset) -Algorithm SHA256).Hash.ToLower()
            if ($expected -ne $actual) { throw "FALLO: SHA-256 no coincide (esperado $expected, obtenido $actual)" }
            Write-Host "SHA-256 verificado: $actual"
            $ext = Join-Path $tmp 'x'
            Expand-Archive -LiteralPath (Join-Path $tmp $asset) -DestinationPath $ext
            $bin = Get-ChildItem -LiteralPath $ext -Recurse -Filter 'codebase-memory-mcp.exe' | Select-Object -First 1
            if (-not $bin) { throw 'FALLO: el zip no contiene codebase-memory-mcp.exe' }
            New-Item -ItemType Directory -Force -Path $st.Dir | Out-Null
            Copy-Item -LiteralPath $bin.FullName -Destination $st.Exe -Force
        } finally {
            Remove-Item -LiteralPath $tmp -Recurse -Force -ErrorAction SilentlyContinue
        }
        Write-Host "Binario instalado: $($st.Exe)"
    }

    $st = Get-CmmState
    if ($st.Registered) {
        Write-Host "MCP 'codebase-memory-mcp' ya registrado (no se modifica): $($st.RegisteredCommand)"
    } else {
        if (-not (Get-Command claude -ErrorAction SilentlyContinue)) {
            Write-Warning "No se encontro 'claude' en PATH. Registrar a mano: claude mcp add --scope user codebase-memory-mcp -- `"$($st.Exe)`""
            return
        }
        & claude mcp add --scope user codebase-memory-mcp -- $st.Exe
        if ($LASTEXITCODE -ne 0) { throw 'FALLO: claude mcp add' }
        Write-Host "MCP registrado (scope user)."
    }
    Write-Host "Reiniciar Claude Code y ejecutar /mcp para confirmar el servidor y sus herramientas."
}

function Remove-Cmm {
    $st = Get-CmmState
    if ($st.Registered) {
        & claude mcp remove --scope user codebase-memory-mcp
        if ($LASTEXITCODE -ne 0) { throw 'FALLO: claude mcp remove' }
        Write-Host 'Registro MCP eliminado.'
    } else { Write-Host 'No habia registro MCP.' }
    if (Test-Path -LiteralPath $st.Dir) {
        Remove-Item -LiteralPath (Split-Path -Parent $st.Dir) -Recurse -Force
        Write-Host "Binario eliminado: $($st.Dir)"
    }
    Write-Host 'Indices conservados en ~/.cache/codebase-memory-mcp/ (borrarlos a mano si se desea).'
}

switch ($CodebaseMemory) {
    'Status' {
        $s = Get-CmmState
        Write-Host "Codebase Memory: binario=$($s.BinaryPresent) ($($s.Exe)); registrado=$($s.Registered) $($s.RegisteredCommand)"
    }
    'Install' { Install-Cmm $false }
    'Update'  { Install-Cmm $true }
    'Remove'  { Remove-Cmm }
}

# ---------------------------------------------------------------------------
# Marketplace de plugins del harness (harness-core, harness-web, harness-payments)
# ---------------------------------------------------------------------------
if ($SyncUser -or $SyncProject.Count -gt 0) {
    Write-Warning "-SyncUser y -SyncProject ya no copian Skills: se distribuyen como plugins."
    Write-Warning "Usar -Marketplace (usuario) y scripts/sync-project.ps1 (proyectos). No se copio nada."
}

if ($Marketplace) {
    if (-not (Get-Command claude -ErrorAction SilentlyContinue)) { Write-Error "FALLO: no se encontro claude en PATH"; exit 1 }
    $known = & claude plugin marketplace list 2>&1 | Out-String
    # Línea "  ❯ harness" (el glifo puede llegar mal decodificado según la consola)
    if ($known -match '(?m)^\s*\S*\s+harness\s*\r?$') {
        Write-Host "Marketplace harness ya registrado: actualizando..."
        if (-not $DryRun) { & claude plugin marketplace update harness; if ($LASTEXITCODE -ne 0) { throw "FALLO: marketplace update" } }
    } else {
        Write-Host "Registrando marketplace harness: $repoRoot"
        if (-not $DryRun) { & claude plugin marketplace add $repoRoot; if ($LASTEXITCODE -ne 0) { throw "FALLO: marketplace add" } }
    }
    $installed = & claude plugin list 2>&1 | Out-String
    if ($installed -match "harness-core@harness") {
        Write-Host "harness-core ya instalado (scope user): actualizando..."
        if (-not $DryRun) { & claude plugin update harness-core@harness --scope user }
    } else {
        Write-Host "Instalando harness-core (scope user)..."
        if (-not $DryRun) { & claude plugin install harness-core@harness --scope user; if ($LASTEXITCODE -ne 0) { throw "FALLO: plugin install" } }
    }
    Write-Host "harness-web, harness-saas y harness-payments se instalan deshabilitados a nivel usuario (ver README) y se activan por proyecto con scripts/sync-project.ps1. Reiniciar Claude Code."
}
