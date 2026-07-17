# ============================================================
# Portal Teologico (CETADP)  - Environment Verifier v1.0
# Le config/paths.json. Valida pastas, Git, ferramentas de banco,
# remote, integridade (espaco em disco) e ultimo backup feito.
# ============================================================

$ProjectName = "portal-teologico-os"
$ScriptRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
$ProjectRoot = Split-Path -Parent $ScriptRoot
$ConfigPath = Join-Path $ProjectRoot "config\paths.json"

function Check($Label, $Condition) {
    if ($Condition) {
        Write-Host "[OK] $Label" -ForegroundColor Green
    } else {
        Write-Host "[FALHA] $Label" -ForegroundColor Red
    }
}

function Get-FreeSpaceGB {
    param([string]$Path)
    try {
        $qualifier = (Split-Path -Qualifier $Path).TrimEnd(':')
        $drive = Get-PSDrive -Name $qualifier -ErrorAction Stop
        return [math]::Round($drive.Free / 1GB, 2)
    } catch {
        return $null
    }
}

Write-Host ""
Write-Host "============================================================" -ForegroundColor Cyan
Write-Host "  Portal Teologico (CETADP) | Environment Verifier v1" -ForegroundColor White
Write-Host "============================================================" -ForegroundColor Cyan
Write-Host ""

Check "config/paths.json existe" (Test-Path $ConfigPath)
if (!(Test-Path $ConfigPath)) {
    Write-Host "[FALHA] Sem config/paths.json nao e possivel continuar a verificacao." -ForegroundColor Red
    exit 1
}

try {
    $Config = Get-Content $ConfigPath -Raw | ConvertFrom-Json
    Check "config/paths.json e um JSON valido" $true
} catch {
    Check "config/paths.json e um JSON valido" $false
    exit 1
}

$Origem = $ProjectRoot
$OneDriveDestino = Join-Path $Config.onedrive $ProjectName
$ExternoDestino = Join-Path $Config.external $ProjectName
$SnapshotDir = Join-Path $Config.snapshots $ProjectName
$GitRemote = "https://github.com/$($Config.github.organization)/$ProjectName.git"

Check "Pasta principal existe: $Origem" (Test-Path $Origem)
Check "Pasta OneDrive existe: $OneDriveDestino" (Test-Path $OneDriveDestino)
Check "Disco externo E: acessivel" (Test-Path "E:\")
Check "Pasta HD externo existe: $ExternoDestino" (Test-Path $ExternoDestino)
Check "Pasta de snapshots existe: $SnapshotDir" (Test-Path $SnapshotDir)
Check "Git instalado" ([bool](Get-Command git -ErrorAction SilentlyContinue))
Check "Node instalado" ([bool](Get-Command node -ErrorAction SilentlyContinue))
Check "npm instalado" ([bool](Get-Command npm -ErrorAction SilentlyContinue))
Check "pg_dump instalado (etapa de banco)" ([bool](Get-Command pg_dump -ErrorAction SilentlyContinue))
Check "pg_restore instalado (restauracao de banco)" ([bool](Get-Command pg_restore -ErrorAction SilentlyContinue))
Check "PORTAL_TEOLOGICO_SUPABASE_DB_URL definida" (-not [string]::IsNullOrWhiteSpace($env:PORTAL_TEOLOGICO_SUPABASE_DB_URL))

Write-Host ""
Write-Host "[INTEGRIDADE] Espaco em disco" -ForegroundColor Yellow
foreach ($p in @($Origem, $OneDriveDestino, $ExternoDestino)) {
    if (Test-Path $p) {
        $free = Get-FreeSpaceGB -Path $p
        if ($null -ne $free) {
            $cor = if ($free -lt 2) { "Red" } else { "DarkGray" }
            Write-Host "  $p -> $free GB livres" -ForegroundColor $cor
        }
    }
}

if (Test-Path $Origem) {
    Set-Location $Origem
    Check "Repositorio Git inicializado" (Test-Path (Join-Path $Origem ".git"))

    if (Test-Path (Join-Path $Origem ".git")) {
        $remoteAtual = git remote get-url origin 2>$null
        Check "Remote GitHub correto ($GitRemote)" ($remoteAtual -eq $GitRemote)
        Write-Host "Remote atual: $remoteAtual" -ForegroundColor DarkGray
        Write-Host "Branch atual: $(git rev-parse --abbrev-ref HEAD 2>$null)" -ForegroundColor DarkGray
        Write-Host "Status:" -ForegroundColor Yellow
        git status --short
    }
}

Write-Host ""
Write-Host "[ULTIMOS BACKUPS]" -ForegroundColor Yellow
if (Test-Path $SnapshotDir) {
    $LatestZip = Get-ChildItem -Path $SnapshotDir -Filter "$($ProjectName)_*.zip" -Recurse -ErrorAction SilentlyContinue |
        Sort-Object LastWriteTime -Descending | Select-Object -First 1
    $LatestDump = Get-ChildItem -Path $SnapshotDir -Filter "$($ProjectName)_db_*.dump" -Recurse -ErrorAction SilentlyContinue |
        Sort-Object LastWriteTime -Descending | Select-Object -First 1

    if ($LatestZip) {
        $idadeZip = [math]::Round(((Get-Date) - $LatestZip.LastWriteTime).TotalHours, 1)
        $corZip = if ($idadeZip -gt 168) { "Red" } elseif ($idadeZip -gt 48) { "DarkYellow" } else { "Green" }
        Write-Host "  Snapshot ZIP mais recente: $($LatestZip.Name) ($idadeZip h atras)" -ForegroundColor $corZip
    } else {
        Write-Host "  [FALHA] Nenhum snapshot ZIP encontrado ainda." -ForegroundColor Red
    }

    if ($LatestDump) {
        $idadeDump = [math]::Round(((Get-Date) - $LatestDump.LastWriteTime).TotalHours, 1)
        $sizeKB = [math]::Round($LatestDump.Length / 1KB, 1)
        $corDump = if ($idadeDump -gt 168) { "Red" } elseif ($idadeDump -gt 48) { "DarkYellow" } else { "Green" }
        Write-Host "  Dump de banco mais recente: $($LatestDump.Name) ($idadeDump h atras, $sizeKB KB)" -ForegroundColor $corDump
    } else {
        Write-Host "  [FALHA] Nenhum dump de banco encontrado ainda." -ForegroundColor Red
    }
} else {
    Write-Host "  [FALHA] Pasta de snapshots nao existe ainda." -ForegroundColor Red
}

Write-Host ""
Write-Host "Verificacao concluida." -ForegroundColor Cyan
