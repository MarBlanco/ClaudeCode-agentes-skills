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
# Distribucion de Skills y agentes (.claude/skills, .claude/agents) del repo:
#   -SyncUser                copia a ~/.claude (disponibles en todos los proyectos).
#   -SyncProject <ruta,...>  copia a <ruta>/.claude de cada proyecto indicado.
#   -DryRun                  solo informa que haria. No escribe nada.
# Solo toca las Skills/agentes que existen en este repo; no borra nada ajeno. Si un destino
# difiere (ignorando fin de linea), guarda antes una copia en ~/.claude/backups/harness-sync-<fecha>.
param(
    [ValidateSet('None', 'Status', 'Install', 'Update', 'Remove')]
    [string]$CodebaseMemory = 'None',
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
# Distribucion de Skills y agentes
# ---------------------------------------------------------------------------
$script:backupRoot = $null

function Test-SameContent([string]$a, [string]$b) {
    $ba = [IO.File]::ReadAllBytes($a); $bb = [IO.File]::ReadAllBytes($b)
    if (([Array]::IndexOf($ba, [byte]0) -ge 0) -or ([Array]::IndexOf($bb, [byte]0) -ge 0)) {
        return ((Get-FileHash -LiteralPath $a).Hash -eq (Get-FileHash -LiteralPath $b).Hash)
    }
    try {
        $strict = New-Object Text.UTF8Encoding($false, $true)
        $ta = $strict.GetString($ba) -replace "`r`n", "`n"
        $tb = $strict.GetString($bb) -replace "`r`n", "`n"
        return ($ta -ceq $tb)
    } catch {
        return ((Get-FileHash -LiteralPath $a).Hash -eq (Get-FileHash -LiteralPath $b).Hash)
    }
}

function Sync-Capabilities([string]$destClaude, [string]$label) {
    $srcClaude = Join-Path $repoRoot '.claude'
    $new = 0; $upd = 0; $same = 0
    foreach ($kind in 'skills', 'agents') {
        $srcKind = Join-Path $srcClaude $kind
        if (-not (Test-Path -LiteralPath $srcKind)) { continue }
        foreach ($f in Get-ChildItem -LiteralPath $srcKind -Recurse -File) {
            $rel = $f.FullName.Substring($srcClaude.Length).TrimStart('\')
            $dst = Join-Path $destClaude $rel
            if (-not (Test-Path -LiteralPath $dst -PathType Leaf)) {
                $new++
                if (-not $DryRun) {
                    New-Item -ItemType Directory -Force -Path (Split-Path -Parent $dst) | Out-Null
                    Copy-Item -LiteralPath $f.FullName -Destination $dst
                }
            } elseif (Test-SameContent $f.FullName $dst) {
                $same++
            } else {
                $upd++
                if (-not $DryRun) {
                    if (-not $script:backupRoot) {
                        $script:backupRoot = Join-Path $targetDir ('backups\harness-sync-' + (Get-Date -Format 'yyyyMMdd-HHmmss'))
                    }
                    $sha = [Security.Cryptography.SHA256]::Create()
                    $tag = ([BitConverter]::ToString($sha.ComputeHash([Text.Encoding]::UTF8.GetBytes($destClaude.ToLower()))) -replace '-', '').Substring(0, 8)
                    $bk = Join-Path (Join-Path $script:backupRoot "$label-$tag") $rel
                    New-Item -ItemType Directory -Force -Path (Split-Path -Parent $bk) | Out-Null
                    Copy-Item -LiteralPath $dst -Destination $bk
                    Copy-Item -LiteralPath $f.FullName -Destination $dst -Force
                }
            }
        }
    }
    $mode = if ($DryRun) { '[DryRun] ' } else { '' }
    Write-Host ("{0}{1}: nuevos={2} actualizados={3} iguales={4}" -f $mode, $label, $new, $upd, $same)
}

if ($SyncUser) { Sync-Capabilities $targetDir 'usuario' }
foreach ($p in $SyncProject) {
    if (-not (Test-Path -LiteralPath $p -PathType Container)) { Write-Error "FALLO: no existe el proyecto $p"; exit 1 }
    Sync-Capabilities (Join-Path (Resolve-Path -LiteralPath $p).Path '.claude') (Split-Path -Leaf (Resolve-Path -LiteralPath $p).Path)
}
if ($script:backupRoot) { Write-Host "Copias previas en: $script:backupRoot" }
