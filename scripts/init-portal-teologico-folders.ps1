# ============================================================
# Portal Teologico (CETADP)  - Folder Initializer v1.0
# Adaptado do padrao VaultMindOS/CDP. Le config/paths.json e cria
# estrutura local, OneDrive, HD externo, config, docs e logs
# (AAAA/MM) por tipo.
# ============================================================

$ProjectName = "portal-teologico-os"
$ScriptRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
$ProjectRoot = Split-Path -Parent $ScriptRoot
$ConfigPath = Join-Path $ProjectRoot "config\paths.json"

$DefaultConfig = [PSCustomObject]@{
    workspace = "C:\Projetos"
    onedrive  = "C:\Users\joaqu\OneDrive\Projetos"
    external  = "E:\Projetos"
    snapshots = "E:\Projetos\Snapshots"
}

if (Test-Path $ConfigPath) {
    $Config = Get-Content $ConfigPath -Raw | ConvertFrom-Json
} else {
    Write-Host "[AVISO] config/paths.json nao encontrado. Usando valores padrao." -ForegroundColor DarkYellow
    $Config = $DefaultConfig
}

$Ano = Get-Date -Format "yyyy"
$Mes = Get-Date -Format "MM"
$LogTypes = @("backup", "restore", "git", "database", "health")

$Paths = @(
    (Join-Path $Config.workspace $ProjectName),
    (Join-Path $ProjectRoot "docs\blueprint"),
    (Join-Path $ProjectRoot "docs\devops"),
    (Join-Path $ProjectRoot "docs\github"),
    (Join-Path $ProjectRoot "docs\backup"),
    (Join-Path $ProjectRoot "docs\security"),
    (Join-Path $ProjectRoot "docs\database"),
    (Join-Path $ProjectRoot "docs\infrastructure"),
    (Join-Path $ProjectRoot "docs\architecture-decisions"),
    (Join-Path $ProjectRoot "scripts"),
    (Join-Path $ProjectRoot "config"),
    (Join-Path $Config.onedrive $ProjectName),
    (Join-Path $Config.onedrive "$ProjectName\database"),
    (Join-Path $Config.external $ProjectName),
    (Join-Path $Config.external "$ProjectName\database"),
    (Join-Path $Config.snapshots $ProjectName)
)

foreach ($LogType in $LogTypes) {
    $Paths += (Join-Path $ProjectRoot "logs\$Ano\$Mes")
}

foreach ($Path in ($Paths | Select-Object -Unique)) {
    if (!(Test-Path $Path)) {
        New-Item -ItemType Directory -Path $Path -Force | Out-Null
        Write-Host "[OK] Criado: $Path" -ForegroundColor Green
    } else {
        Write-Host "[OK] Ja existe: $Path" -ForegroundColor DarkGreen
    }
}

Write-Host ""
Write-Host "Estrutura inicial validada (config-driven, padrao CDP)." -ForegroundColor Cyan
Write-Host ""
Write-Host "[LEMBRETE] Para a etapa de backup do banco (Supabase), defina a" -ForegroundColor Yellow
Write-Host "variavel de ambiente PORTAL_TEOLOGICO_SUPABASE_DB_URL com a" -ForegroundColor Yellow
Write-Host "connection string do Postgres (Supabase > Project Settings >" -ForegroundColor Yellow
Write-Host "Database > Connection string). Nunca coloque essa string em" -ForegroundColor Yellow
Write-Host "arquivo versionado. Exemplo (uma vez, permanente para seu usuario):" -ForegroundColor Yellow
Write-Host '  [Environment]::SetEnvironmentVariable("PORTAL_TEOLOGICO_SUPABASE_DB_URL", "postgresql://postgres:SENHA@HOST:5432/postgres", "User")' -ForegroundColor DarkGray
