# ============================================================
# Portal Teologico (CETADP)  - Restore Helper v1.0
# Restaura o CODIGO a partir de 4 fontes, em ordem de prioridade:
# GitHub -> OneDrive -> HD Externo -> ZIP.
# A restauracao do BANCO (Supabase) e sempre manual e separada
# (-Fonte Banco)  - nunca entra no fluxo automatico "Auto", por ser
# uma operacao destrutiva sobre dados reais de producao.
# ============================================================

param(
    [ValidateSet("Auto", "GitHub", "OneDrive", "Externo", "Zip", "Banco")]
    [string]$Fonte = "Auto",
    [switch]$DryRun
)

$ProjectName = "portal-teologico-os"
$ScriptRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
$ProjectRoot = Split-Path -Parent $ScriptRoot
$ConfigPath = Join-Path $ProjectRoot "config\paths.json"

if (!(Test-Path $ConfigPath)) {
    Write-Host "[ERRO] config/paths.json nao encontrado em $ConfigPath" -ForegroundColor Red
    exit 1
}
$Config = Get-Content $ConfigPath -Raw | ConvertFrom-Json

$Destino = $ProjectRoot
$OneDriveFonte = Join-Path $Config.onedrive $ProjectName
$ExternoFonte = Join-Path $Config.external $ProjectName
$SnapshotDir = Join-Path $Config.snapshots $ProjectName
$GitRemote = "https://github.com/$($Config.github.organization)/$ProjectName.git"
$ExcluidosDir = $Config.excludedDirectories

Write-Host ""
Write-Host "============================================================" -ForegroundColor Cyan
Write-Host "  Portal Teologico (CETADP) | Restore Helper v1" -ForegroundColor White
Write-Host "============================================================" -ForegroundColor Cyan
Write-Host "Destino: $Destino" -ForegroundColor Yellow
Write-Host ""

function Confirm-Restore {
    param([string]$Aviso = "Esta operacao pode sobrescrever arquivos em $Destino.")
    if ($DryRun) { return $true }
    Write-Host $Aviso -ForegroundColor Yellow
    $confirm = Read-Host "Digite RESTAURAR para continuar"
    return ($confirm -eq "RESTAURAR")
}

function Restore-FromGitHub {
    Write-Host "[FONTE] GitHub -> $GitRemote" -ForegroundColor Yellow
    if (!(Get-Command git -ErrorAction SilentlyContinue)) {
        Write-Host "[ERRO] Git nao encontrado." -ForegroundColor Red
        return $false
    }
    if ($DryRun) {
        Write-Host "[DRY-RUN] Restauracao via GitHub simulada." -ForegroundColor DarkYellow
        return $true
    }
    if (!(Confirm-Restore)) { Write-Host "Operacao cancelada." -ForegroundColor DarkYellow; return $false }

    if (Test-Path (Join-Path $Destino ".git")) {
        Set-Location $Destino
        git fetch origin
        git reset --hard "origin/$($Config.github.defaultBranch)"
    } elseif (!(Test-Path $Destino) -or (Get-ChildItem $Destino -Force | Measure-Object).Count -eq 0) {
        git clone $GitRemote $Destino
    } else {
        Write-Host "[ERRO] $Destino existe, tem arquivos e nao e um repositorio Git. Escolha outra fonte ou limpe a pasta." -ForegroundColor Red
        return $false
    }
    return ($LASTEXITCODE -eq 0 -or $LASTEXITCODE -eq $null)
}

function Restore-FromMirror {
    param([string]$Origem, [string]$NomeFonte)

    Write-Host "[FONTE] $NomeFonte -> $Origem" -ForegroundColor Yellow
    if (!(Test-Path $Origem)) {
        Write-Host "[ERRO] Fonte nao encontrada: $Origem" -ForegroundColor Red
        return $false
    }
    if ($DryRun) {
        Write-Host "[DRY-RUN] Restauracao via $NomeFonte simulada." -ForegroundColor DarkYellow
        return $true
    }
    if (!(Confirm-Restore)) { Write-Host "Operacao cancelada." -ForegroundColor DarkYellow; return $false }

    if (!(Test-Path $Destino)) {
        New-Item -ItemType Directory -Path $Destino -Force | Out-Null
    }

    $XD = @()
    foreach ($dir in $ExcluidosDir) { $XD += @("/XD", $dir) }

    robocopy $Origem $Destino /MIR /R:2 /W:2 @XD
    return ($LASTEXITCODE -le 7)
}

function Restore-FromZip {
    Write-Host "[FONTE] Snapshot ZIP -> $SnapshotDir" -ForegroundColor Yellow
    if (!(Test-Path $SnapshotDir)) {
        Write-Host "[ERRO] Pasta de snapshots nao encontrada: $SnapshotDir" -ForegroundColor Red
        return $false
    }

    $LatestZip = Get-ChildItem -Path $SnapshotDir -Filter "$($ProjectName)_*.zip" -Recurse -ErrorAction SilentlyContinue |
        Sort-Object LastWriteTime -Descending | Select-Object -First 1

    if (!$LatestZip) {
        Write-Host "[ERRO] Nenhum snapshot ZIP encontrado em $SnapshotDir" -ForegroundColor Red
        return $false
    }

    Write-Host "Snapshot mais recente: $($LatestZip.FullName)" -ForegroundColor DarkGray

    if ($DryRun) {
        Write-Host "[DRY-RUN] Restauracao via ZIP simulada." -ForegroundColor DarkYellow
        return $true
    }
    if (!(Confirm-Restore)) { Write-Host "Operacao cancelada." -ForegroundColor DarkYellow; return $false }

    if (!(Test-Path $Destino)) {
        New-Item -ItemType Directory -Path $Destino -Force | Out-Null
    }

    Expand-Archive -Path $LatestZip.FullName -DestinationPath $Destino -Force
    return $true
}

function Restore-FromDatabaseDump {
    Write-Host ""
    Write-Host "============================================================" -ForegroundColor Red
    Write-Host "  ATENCAO: RESTAURACAO DE BANCO DE PRODUCAO" -ForegroundColor Red
    Write-Host "  Isto SOBRESCREVE dados reais (alunos, matriculas," -ForegroundColor Red
    Write-Host "  financeiro) no Supabase com o conteudo do dump escolhido." -ForegroundColor Red
    Write-Host "  So use isto em um incidente real de perda de dados." -ForegroundColor Red
    Write-Host "============================================================" -ForegroundColor Red
    Write-Host ""

    if (!(Get-Command pg_restore -ErrorAction SilentlyContinue)) {
        Write-Host "[ERRO] pg_restore nao encontrado no PATH." -ForegroundColor Red
        return $false
    }

    $DbUrl = $env:PORTAL_TEOLOGICO_SUPABASE_DB_URL
    if ([string]::IsNullOrWhiteSpace($DbUrl)) {
        Write-Host "[ERRO] Variavel de ambiente PORTAL_TEOLOGICO_SUPABASE_DB_URL nao definida." -ForegroundColor Red
        return $false
    }

    $LatestDump = Get-ChildItem -Path $SnapshotDir -Filter "$($ProjectName)_db_*.dump" -Recurse -ErrorAction SilentlyContinue |
        Sort-Object LastWriteTime -Descending | Select-Object -First 1

    if (!$LatestDump) {
        Write-Host "[ERRO] Nenhum dump de banco encontrado em $SnapshotDir" -ForegroundColor Red
        return $false
    }

    Write-Host "Dump mais recente: $($LatestDump.FullName)" -ForegroundColor DarkGray
    Write-Host "Data do dump: $($LatestDump.LastWriteTime)" -ForegroundColor DarkGray

    if ($DryRun) {
        Write-Host "[DRY-RUN] Restauracao de banco simulada." -ForegroundColor DarkYellow
        return $true
    }

    if (!(Confirm-Restore -Aviso "Isto vai SOBRESCREVER o banco Supabase de producao com o dump acima.")) {
        Write-Host "Operacao cancelada." -ForegroundColor DarkYellow
        return $false
    }

    # Segunda confirmacao  - restauracao de banco de producao merece
    # uma barreira extra alem da palavra RESTAURAR generica.
    $confirm2 = Read-Host "Digite o nome do projeto ($ProjectName) para confirmar definitivamente"
    if ($confirm2 -ne $ProjectName) {
        Write-Host "Confirmacao nao confere. Operacao cancelada." -ForegroundColor DarkYellow
        return $false
    }

    & pg_restore --clean --if-exists --no-owner --no-privileges -d $DbUrl $LatestDump.FullName
    return ($LASTEXITCODE -eq 0)
}

$Sucesso = $false

switch ($Fonte) {
    "GitHub"   { $Sucesso = Restore-FromGitHub }
    "OneDrive" { $Sucesso = Restore-FromMirror -Origem $OneDriveFonte -NomeFonte "OneDrive" }
    "Externo"  { $Sucesso = Restore-FromMirror -Origem $ExternoFonte -NomeFonte "HD Externo" }
    "Zip"      { $Sucesso = Restore-FromZip }
    "Banco"    { $Sucesso = Restore-FromDatabaseDump }
    "Auto" {
        Write-Host "[AUTO] Tentando codigo na ordem: GitHub -> OneDrive -> HD Externo -> ZIP" -ForegroundColor Cyan
        Write-Host "[AUTO] Restauracao de banco NAO entra no modo Auto  - use -Fonte Banco explicitamente." -ForegroundColor DarkYellow
        if (-not $Sucesso) { $Sucesso = Restore-FromGitHub }
        if (-not $Sucesso) { $Sucesso = Restore-FromMirror -Origem $OneDriveFonte -NomeFonte "OneDrive" }
        if (-not $Sucesso) { $Sucesso = Restore-FromMirror -Origem $ExternoFonte -NomeFonte "HD Externo" }
        if (-not $Sucesso) { $Sucesso = Restore-FromZip }
    }
}

Write-Host ""
if ($Sucesso) {
    Write-Host "[OK] Restauracao concluida." -ForegroundColor Green
    exit 0
} else {
    Write-Host "[ERRO] Restauracao falhou ou foi cancelada." -ForegroundColor Red
    exit 1
}
