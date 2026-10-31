# Instala las herramientas de QA de seguridad del harness (gate G6) desde sus
# releases oficiales, verificando SHA-256 contra el archivo de checksums publicado.
#   .\scripts\install-qa-tools.ps1 [-BinDir F:\Programacion\ClaudeHarness\bin] [-Status]
# Versiones fijadas: se actualizan aquí y en harness.lock.json tras revisar el changelog.
param(
    [string]$BinDir = 'F:\Programacion\ClaudeHarness\bin',
    [switch]$Status
)
$ErrorActionPreference = 'Stop'

$tools = @(
    @{ Name = 'gitleaks'; Version = '8.30.1'; Repo = 'gitleaks/gitleaks'; Tag = 'v8.30.1'
       Asset = 'gitleaks_8.30.1_windows_x64.zip'; Sums = 'gitleaks_8.30.1_checksums.txt'; Exe = 'gitleaks.exe' },
    @{ Name = 'osv-scanner'; Version = '2.7.0'; Repo = 'google/osv-scanner'; Tag = 'v2.7.0'
       Asset = 'osv-scanner_windows_amd64.exe'; Sums = 'osv-scanner_SHA256SUMS'; Exe = 'osv-scanner.exe' }
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
