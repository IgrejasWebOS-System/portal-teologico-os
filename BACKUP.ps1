# =========================================================
# BACKUP.ps1 - Portal Teologico OS
# Uso: powershell -ExecutionPolicy Bypass -File BACKUP.ps1
# =========================================================

[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
Clear-Host

$Source     = (Get-Item .).FullName
$Timestamp  = Get-Date -Format "yyyy-MM-dd_HH-mm"
$BackupDest = "E:\Backups\portal-teologico-os_$Timestamp"

Write-Host "=========================================================" -ForegroundColor Magenta
Write-Host "  BACKUP - PORTAL TEOLOGICO OS" -ForegroundColor White
Write-Host "  Origem  : $Source" -ForegroundColor Cyan
Write-Host "  Destino : $BackupDest" -ForegroundColor Yellow
Write-Host "=========================================================" -ForegroundColor Magenta
Write-Host ""

# ── 1. BACKUP FISICO ──────────────────────────────────────
Write-Host "[1/3] Copiando arquivos para E:\Backups..." -ForegroundColor Cyan

if (-not (Test-Path "E:\Backups")) {
    New-Item -ItemType Directory -Path "E:\Backups" | Out-Null
}

robocopy $Source $BackupDest /E /XD node_modules .next dist .cache .vercel /XF *.tsbuildinfo package-lock.json /NFL /NDL /NJH /NJS /NC /NS | Out-Null

if ($LASTEXITCODE -le 7) {
    Write-Host "  OK - Backup fisico concluido." -ForegroundColor Green
    Write-Host "       $BackupDest" -ForegroundColor Gray
} else {
    Write-Host "  ERRO - Robocopy retornou codigo $LASTEXITCODE." -ForegroundColor Red
    exit 1
}

# ── 2. GIT COMMIT + PUSH ──────────────────────────────────
Write-Host ""
Write-Host "[2/3] Enviando para GitHub..." -ForegroundColor Cyan

$GitStatus = git status --porcelain 2>&1

if ($GitStatus) {
    git add -A
    git commit -m "backup: $Timestamp - configuracoes module + migration 009"
    Write-Host "  OK - Commit realizado." -ForegroundColor Green
} else {
    Write-Host "  INFO - Nada para commitar." -ForegroundColor Gray
}

git push origin main 2>&1

if ($LASTEXITCODE -eq 0) {
    Write-Host "  OK - Push para GitHub concluido." -ForegroundColor Green
} else {
    Write-Host "  AVISO - Push falhou. Verifique credenciais ou nome do branch." -ForegroundColor Yellow
}

# ── 3. RESUMO ─────────────────────────────────────────────
Write-Host ""
Write-Host "[3/3] Resumo" -ForegroundColor Cyan

$Files = (Get-ChildItem -Path $BackupDest -Recurse -File).Count
$SizeMB = [math]::Round((Get-ChildItem -Path $BackupDest -Recurse -File | Measure-Object -Property Length -Sum).Sum / 1MB, 1)

Write-Host "  Arquivos: $Files"
Write-Host "  Tamanho : $SizeMB MB"
Write-Host "  GitHub  : https://github.com/IgrejasWebOS-System/portal-teologico-os"
Write-Host ""
Write-Host "=========================================================" -ForegroundColor Magenta
Write-Host "  BACKUP FINALIZADO - $Timestamp" -ForegroundColor Green
Write-Host "=========================================================" -ForegroundColor Magenta
Write-Host ""
