# Instala las herramientas de QA del harness (G6 seguridad: gitleaks, osv-scanner; infra: actionlint, hadolint) desde sus
# releases oficiales, verificando SHA-256 contra el archivo de checksums publicado.
#   .\scripts\install-qa-tools.ps1 [-BinDir <carpeta>]  (por defecto ~\.claude\harness\bin) [-Status]
# Versiones y SHA-256 fijados: se actualizan aquí y en harness.lock.json tras revisar el changelog.
param(
    [string]$BinDir = (Join-Path $HOME '.claude\harness\bin'),
    [switch]$Status
)
$ErrorActionPreference = 'Stop'

$tools = @(
    @{ Name = 'gitleaks'; Version = '8.30.1'; Repo = 'gitleaks/gitleaks'; Tag = 'v8.30.1'
       Asset = 'gitleaks_8.30.1_windows_x64.zip'; Sums = 'gitleaks_8.30.1_checksums.txt'; Exe = 'gitleaks.exe'; Sha256 = 'd29144deff3a68aa93ced33dddf84b7fdc26070add4aa0f4513094c8332afc4e' },
    @{ Name = 'osv-scanner'; Version = '2.7.0'; Repo = 'google/osv-scanner'; Tag = 'v2.7.0'
       Asset = 'osv-scanner_windows_amd64.exe'; Sums = 'osv-scanner_SHA256SUMS'; Exe = 'osv-scanner.exe'; Sha256 = '9964ed64ec9a387391eb4cc006ad5c531154821aef29b793e02c448de4686438' },
    @{ Name = 'actionlint'; Version = '1.7.12'; Repo = 'rhysd/actionlint'; Tag = 'v1.7.12'
       Asset = 'actionlint_1.7.12_windows_amd64.zip'; Sums = 'actionlint_1.7.12_checksums.txt'; Exe = 'actionlint.exe'; Sha256 = '6e7241b51e6817ea6a047693d8e6fed13b31819c9a0dd6c5a726e1592d22f6e9' },
    @{ Name = 'hadolint'; Version = '2.15.1'; Repo = 'hadolint/hadolint'; Tag = 'v2.15.1'
       Asset = 'hadolint-windows-x86_64.exe'; Sums = 'checksums.sha256'; Exe = 'hadolint.exe'; Sha256 = '01d927294962b5387f9ead4f18679158452be4f17c765ad0bdffe5264b9c7b0a' }
)

function Test-OnPath([string]$dir) {
    $userPath = [Environment]::GetEnvironmentVariable('Path', 'User')
    return ($userPath -split ';' | Where-Object { $_.TrimEnd('\') -ieq $dir.TrimEnd('\') }).Count -gt 0
}

if ($Status) {
    foreach ($t in $tools) {
        $exe = Join-Path $BinDir $t.Exe
        Write-Host ("{0}: {1}" -f $t.Name, $(if (Test-Path -LiteralPath $exe) { & $exe --version 2>&1 | Select-Object -First 1 } else { 'no instalado' }))
    }
    Write-Host "BinDir en PATH de usuario: $(Test-OnPath $BinDir)"
    exit 0
}

New-Item -ItemType Directory -Force -Path $BinDir | Out-Null
foreach ($t in $tools) {
    $base = "https://github.com/$($t.Repo)/releases/download/$($t.Tag)"
    $tmp = Join-Path ([IO.Path]::GetTempPath()) ("qa-" + [guid]::NewGuid().ToString('N'))
    New-Item -ItemType Directory -Path $tmp | Out-Null
    try {
        Write-Host "Descargando $($t.Name) $($t.Version)..."
        Invoke-WebRequest -Uri "$base/$($t.Asset)" -OutFile (Join-Path $tmp $t.Asset) -UseBasicParsing
        Invoke-WebRequest -Uri "$base/$($t.Sums)" -OutFile (Join-Path $tmp $t.Sums) -UseBasicParsing
        $line = Get-Content -LiteralPath (Join-Path $tmp $t.Sums) | Where-Object { $_ -match ('\s\*?' + [regex]::Escape($t.Asset) + '\s*$') } | Select-Object -First 1
        if (-not $line) { throw "FALLO: $($t.Asset) no figura en $($t.Sums)" }
        $expected = ($line -split '\s+')[0].ToLower()
        $actual = (Get-FileHash -LiteralPath (Join-Path $tmp $t.Asset) -Algorithm SHA256).Hash.ToLower()
        if ($expected -ne $actual) { throw "FALLO: SHA-256 de $($t.Asset) no coincide (esperado $expected, obtenido $actual)" }
        # El archivo de checksums viene de la misma release: prueba integridad, no autenticidad. El hash fijado aquí sí.
        if ($actual -ne $t.Sha256) { throw "FALLO: SHA-256 de $($t.Asset) no coincide con el fijado en el script (fijado $($t.Sha256), obtenido $actual)" }
        Write-Host "  SHA-256 verificado: $actual"
        $dest = Join-Path $BinDir $t.Exe
        if ($t.Asset -like '*.zip') {
            $ext = Join-Path $tmp 'x'
            Expand-Archive -LiteralPath (Join-Path $tmp $t.Asset) -DestinationPath $ext
            $bin = Get-ChildItem -LiteralPath $ext -Recurse -Filter $t.Exe | Select-Object -First 1
            if (-not $bin) { throw "FALLO: el zip no contiene $($t.Exe)" }
            Copy-Item -LiteralPath $bin.FullName -Destination $dest -Force
        } else {
            Copy-Item -LiteralPath (Join-Path $tmp $t.Asset) -Destination $dest -Force
        }
        Write-Host "  Instalado: $dest"
    } finally {
        Remove-Item -LiteralPath $tmp -Recurse -Force -ErrorAction SilentlyContinue
    }
}

if (-not (Test-OnPath $BinDir)) {
    $userPath = [Environment]::GetEnvironmentVariable('Path', 'User')
    [Environment]::SetEnvironmentVariable('Path', ($userPath.TrimEnd(';') + ';' + $BinDir), 'User')
    Write-Host "Agregado al PATH de usuario: $BinDir (abrir una terminal nueva para usarlo)"
}
