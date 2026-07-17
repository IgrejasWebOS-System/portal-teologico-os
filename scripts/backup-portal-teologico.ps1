# ============================================================
# Portal Teologico (CETADP)  - Backup Manager v1.0
# Adaptado do padrao VaultMindOS/CDP.
#
# Fluxo:
# 1. Validar ambiente local
# 2. Sincronizar OneDrive (codigo)
# 3. Sincronizar HD externo (codigo)
# 4. Gerar snapshot ZIP versionado (codigo)
# 5. Gerar dump do banco Supabase (pg_dump) e copiar para
#    Snapshots, OneDrive/database e HD externo/database
# 6. Commit + Push GitHub (SOMENTE codigo  - o dump do banco
#    NUNCA e commitado, fica de fora do repositorio Git)
# 7. Registrar log operacional
#
# Uso manual:        .\scripts\backup-portal-teologico.ps1
# Uso silencioso:     .\scripts\backup-portal-teologico.ps1 -Silencioso
# Apenas validar:     .\scripts\backup-portal-teologico.ps1 -DryRun
# Pular banco:        .\scripts\backup-portal-teologico.ps1 -PularBanco
#
# Pre-requisito da etapa 5: variavel de ambiente
# PORTAL_TEOLOGICO_SUPABASE_DB_URL com a connection string do
# Postgres do projeto Supabase (Project Settings > Database >
# Connection string, modo "Session" ou "Direct connection").
# Nunca colocar essa string em arquivo versionado.
# ============================================================

param(
    [switch]$Silencioso,
    [switch]$DryRun,
    [switch]$PularBanco,
    [string]$CommitMessage
)

$ErrorActionPreference = "Stop"
$PSNativeCommandUseErrorActionPreference = $false
$StartTime = Get-Date

$ProjectName = "portal-teologico-os"
$ProjectDisplayName = "Portal Teologico (CETADP)"
$ScriptRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
$ProjectRoot = Split-Path -Parent $ScriptRoot
$ConfigPath = Join-Path $ProjectRoot "config\paths.json"

if (!(Test-Path $ConfigPath)) {
    throw "config/paths.json nao encontrado em $ConfigPath. Rode init-portal-teologico-folders.ps1 primeiro."
}
$Config = Get-Content $ConfigPath -Raw | ConvertFrom-Json

$Origem = $ProjectRoot
$OneDriveDestino = Join-Path $Config.onedrive $ProjectName
$ExternoDestino = Join-Path $Config.external $ProjectName
$SnapshotDir = Join-Path $Config.snapshots $ProjectName
$GitRemote = "https://github.com/$($Config.github.organization)/$ProjectName.git"
$BranchPadrao = $Config.github.defaultBranch
$ExcluidosDir = $Config.excludedDirectories
$ExcluidosFiles = $Config.excludedFiles

$DataHumana = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
$DataArquivo = Get-Date -Format "yyyy-MM-dd_HHmmss"
$Ano = Get-Date -Format "yyyy"
$Mes = Get-Date -Format "MM"
$Usuario = $env:USERNAME

$LogRoot = Join-Path $ProjectRoot "logs\$Ano\$Mes"

function Write-Log {
    param(
        [string]$Message,
        [string]$Color = "White",
        [string]$LogType = "backup"
    )

    $line = "[$(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')] [user:$Usuario] [$ProjectName] $Message"

    if (!(Test-Path $LogRoot)) {
        New-Item -ItemType Directory -Path $LogRoot -Force | Out-Null
    }

    Add-Content -Path (Join-Path $LogRoot "$LogType.log") -Value $line -Encoding UTF8

    if (-not $Silencioso) {
        Write-Host $Message -ForegroundColor $Color
    }
}

function Test-CommandExists {
    param([string]$Command)
    return [bool](Get-Command $Command -ErrorAction SilentlyContinue)
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

function Sync-Robocopy {
    param(
        [string]$Destino,
        [string]$NomeDestino
    )

    Write-Log "" White
    Write-Log "[COPIA] $NomeDestino -> $Destino" Yellow
    Write-Log "------------------------------------------------------------" Cyan

    $Disco = Split-Path -Qualifier $Destino
    if (!(Test-Path $Disco)) {
        Write-Log "[AVISO] Disco $Disco nao acessivel. Etapa ignorada." DarkYellow
        return
    }

    if ($DryRun) {
        Write-Log "[DRY-RUN] Copia simulada para $Destino" DarkYellow
        return
    }

    if (!(Test-Path $Destino)) {
        New-Item -ItemType Directory -Path $Destino -Force | Out-Null
        Write-Log "[OK] Pasta criada: $Destino" Green
    }

    $XD = @()
    foreach ($dir in $ExcluidosDir) { $XD += @("/XD", $dir) }

    $XF = @()
    foreach ($file in $ExcluidosFiles) { $XF += @("/XF", $file) }

    $roboArgs = @(
        $Origem,
        $Destino,
        "/MIR",
        "/R:2",
        "/W:2",
        "/NFL",
        "/NDL",
        "/NJH"
    ) + $XD + $XF

    $output = & robocopy @roboArgs
    $code = $LASTEXITCODE

    $filesLine = ($output | Where-Object { $_ -match '^\s*Files\s*:' } | Select-Object -First 1)
    if ($filesLine) {
        Write-Log "[INTEGRIDADE] $($filesLine.Trim())" DarkCyan
    }

    $freeGB = Get-FreeSpaceGB -Path $Destino
    if ($null -ne $freeGB) {
        Write-Log "[INTEGRIDADE] Espaco livre em $Disco : $freeGB GB" DarkCyan
        if ($freeGB -lt 2) {
            Write-Log "[AVISO] Espaco livre abaixo de 2 GB em $Disco" DarkYellow
        }
    }

    if ($code -le 7) {
        Write-Log "[OK] Copia concluida com robocopy codigo $code." Green
    } else {
        Write-Log "[ERRO] Robocopy retornou codigo $code." Red
        throw "Falha no robocopy para $Destino"
    }
}

function Create-ZipSnapshot {
    Write-Log "" White
    Write-Log "[ZIP] Gerando snapshot versionado (codigo)" Yellow
    Write-Log "------------------------------------------------------------" Cyan

    $ZipDir = Join-Path $SnapshotDir "$Ano\$Mes"
    $ZipFile = Join-Path $ZipDir "$($ProjectName)_$DataArquivo.zip"

    $Disco = Split-Path -Qualifier $SnapshotDir
    if (!(Test-Path $Disco)) {
        Write-Log "[AVISO] Disco $Disco nao acessivel. Snapshot ZIP ignorado." DarkYellow
        return
    }

    if ($DryRun) {
        Write-Log "[DRY-RUN] ZIP simulado: $ZipFile" DarkYellow
        return
    }

    if (!(Test-Path $ZipDir)) {
        New-Item -ItemType Directory -Path $ZipDir -Force | Out-Null
    }

    $TempDir = Join-Path $env:TEMP "$($ProjectName)_zip_$DataArquivo"
    if (Test-Path $TempDir) { Remove-Item $TempDir -Recurse -Force }
    New-Item -ItemType Directory -Path $TempDir -Force | Out-Null

    $XD = @()
    foreach ($dir in $ExcluidosDir) { $XD += @("/XD", $dir) }
    $XF = @()
    foreach ($file in $ExcluidosFiles) { $XF += @("/XF", $file) }

    robocopy $Origem $TempDir /MIR /R:2 /W:2 /NFL /NDL /NJH /NJS @XD @XF | Out-Null

    Compress-Archive -Path (Join-Path $TempDir "*") -DestinationPath $ZipFile -Force
    Remove-Item $TempDir -Recurse -Force

    Write-Log "[OK] Snapshot criado: $ZipFile" Green
}

function Backup-SupabaseDatabase {
    Write-Log "" White
    Write-Log "[BANCO] Exportando banco Supabase (pg_dump)" Yellow
    Write-Log "------------------------------------------------------------" Cyan

    if ($PularBanco) {
        Write-Log "[AVISO] Etapa de banco pulada (-PularBanco)." DarkYellow -LogType database
        return
    }

    if (!(Test-CommandExists "pg_dump")) {
        Write-Log "[AVISO] pg_dump nao encontrado no PATH. Etapa de banco ignorada." DarkYellow -LogType database
        Write-Log "[AVISO] Instale as ferramentas de cliente do PostgreSQL (ex: via https://www.postgresql.org/download/windows/) para habilitar esta etapa." DarkYellow -LogType database
        return
    }

    $DbUrl = $env:PORTAL_TEOLOGICO_SUPABASE_DB_URL
    if ([string]::IsNullOrWhiteSpace($DbUrl)) {
        Write-Log "[AVISO] Variavel de ambiente PORTAL_TEOLOGICO_SUPABASE_DB_URL nao definida. Etapa de banco ignorada." DarkYellow -LogType database
        return
    }

    $DbDir = Join-Path $SnapshotDir "$Ano\$Mes"
    $DbFile = Join-Path $DbDir "$($ProjectName)_db_$DataArquivo.dump"

    if ($DryRun) {
        Write-Log "[DRY-RUN] Dump do banco simulado: $DbFile" DarkYellow -LogType database
        return
    }

    if (!(Test-Path $DbDir)) {
        New-Item -ItemType Directory -Path $DbDir -Force | Out-Null
    }

    # Formato custom (-Fc): compactado e restauravel com pg_restore,
    # inclusive parcialmente (tabela por tabela) se necessario.
    & pg_dump $DbUrl -Fc -f $DbFile 2>$null
    $code = $LASTEXITCODE

    if ($code -ne 0 -or !(Test-Path $DbFile) -or (Get-Item $DbFile).Length -eq 0) {
        Write-Log "[ERRO] pg_dump falhou (codigo $code) ou gerou arquivo vazio." Red -LogType database
        if (Test-Path $DbFile) { Remove-Item $DbFile -Force }
        throw "Falha ao exportar o banco Supabase"
    }

    $sizeKB = [math]::Round((Get-Item $DbFile).Length / 1KB, 1)
    Write-Log "[OK] Dump do banco criado: $DbFile ($sizeKB KB)" Green -LogType database

    # Copia o dump tambem para OneDrive e HD externo (pasta "database"),
    # separado do mirror de codigo. ATENCAO: este arquivo contem dados
    # pessoais e financeiros reais de alunos  - trate como sensivel.
    foreach ($destino in @(
        @{ Path = (Join-Path $OneDriveDestino "database"); Nome = "OneDrive" },
        @{ Path = (Join-Path $ExternoDestino "database"); Nome = "HD Externo" }
    )) {
        $disco = Split-Path -Qualifier $destino.Path
        if (!(Test-Path $disco)) {
            Write-Log "[AVISO] Disco $disco nao acessivel. Copia do dump para $($destino.Nome) ignorada." DarkYellow -LogType database
            continue
        }
        if (!(Test-Path $destino.Path)) {
            New-Item -ItemType Directory -Path $destino.Path -Force | Out-Null
        }
        Copy-Item -Path $DbFile -Destination $destino.Path -Force
        Write-Log "[OK] Dump copiado para $($destino.Nome): $($destino.Path)" Green -LogType database
    }

    Write-Log "[LEMBRETE] O dump do banco NAO e commitado no Git  - fica apenas em Snapshots/OneDrive/HD Externo." DarkCyan -LogType database
}

function Sync-GitHub {
    Write-Log "" White
    Write-Log "[GIT] Sincronizando GitHub" Yellow
    Write-Log "------------------------------------------------------------" Cyan

    if (!(Test-Path $Origem)) {
        throw "Origem nao encontrada: $Origem"
    }

    Set-Location $Origem

    if (!(Test-CommandExists "git")) {
        throw "Git nao encontrado no PATH. Instale ou configure o Git."
    }

    if ($DryRun) {
        Write-Log "[DRY-RUN] Git sync simulado." DarkYellow
        return
    }

    $EAPAnterior = $ErrorActionPreference
    $ErrorActionPreference = "Continue"
    try {
        $repoRecemCriado = $false

        if (!(Test-Path (Join-Path $Origem ".git"))) {
            Write-Log "[GIT] Inicializando repositorio local." DarkYellow -LogType git
            git init -b $BranchPadrao 2>$null | Out-Null
            git remote add origin $GitRemote 2>$null | Out-Null
            $repoRecemCriado = $true
            Write-Log "[OK] Repositorio local inicializado na branch $BranchPadrao." Green -LogType git
        } else {
            $remoteAtual = git remote get-url origin 2>$null
            if ($remoteAtual -ne $GitRemote) {
                git remote set-url origin $GitRemote 2>$null | Out-Null
                Write-Log "[GIT] Remote atualizado para $GitRemote" DarkYellow -LogType git
            }

            $branchAtual = git rev-parse --abbrev-ref HEAD 2>$null
            if ($branchAtual -and $branchAtual -ne $BranchPadrao -and $branchAtual -ne "HEAD") {
                Write-Log "[GIT] Branch atual: $branchAtual. Usando push para HEAD." DarkYellow -LogType git
            }
        }

        $status = git status --porcelain 2>$null
        if ($status) {
            Write-Log "[GIT] Alteracoes detectadas. Preparando commit..." Cyan -LogType git
            git add -A 2>$null | Out-Null

            if ([string]::IsNullOrWhiteSpace($CommitMessage)) {
                $CommitMessage = "backup: $ProjectDisplayName $DataHumana"
            }

            git commit -m $CommitMessage 2>$null | Out-Null
            if ($LASTEXITCODE -eq 0) {
                Write-Log "[OK] Commit criado: $CommitMessage" Green -LogType git
            } else {
                Write-Log "[AVISO] Commit nao criado. Verifique saida do Git." DarkYellow -LogType git
            }
        } elseif ($repoRecemCriado) {
            Write-Log "[AVISO] Repositorio recem-criado sem nenhum arquivo para commitar." DarkYellow -LogType git
        } else {
            Write-Log "[GIT] Sem alteracoes pendentes." DarkYellow -LogType git
        }

        Write-Log "[GIT] Enviando para GitHub ($GitRemote)..." Cyan -LogType git
        git push -u origin HEAD 2>$null | Out-Null

        if ($LASTEXITCODE -eq 0) {
            $hash = git rev-parse --short HEAD 2>$null
            Write-Log "[OK] Push realizado com sucesso. HEAD: $hash" Green -LogType git
            Write-Log "[AUDITORIA] commit=$hash" DarkCyan
        } else {
            Write-Log "[ERRO] Push falhou. Verifique credenciais, token ou conexao." Red -LogType git
            throw "Falha no git push"
        }
    } finally {
        $ErrorActionPreference = $EAPAnterior
    }
}

function Validate-Environment {
    Write-Log "" White
    Write-Log "[VALIDACAO] Ambiente" Yellow
    Write-Log "------------------------------------------------------------" Cyan

    if (!(Test-Path $Origem)) {
        throw "Pasta principal nao encontrada: $Origem"
    }
    Write-Log "[OK] Origem encontrada: $Origem" Green

    if (!(Test-CommandExists "git")) {
        throw "Git nao encontrado."
    }
    Write-Log "[OK] Git encontrado." Green

    if (!(Test-CommandExists "robocopy")) {
        throw "Robocopy nao encontrado."
    }
    Write-Log "[OK] Robocopy encontrado." Green

    if (!(Test-CommandExists "pg_dump")) {
        Write-Log "[AVISO] pg_dump nao encontrado  - etapa de banco sera pulada." DarkYellow
    }
    if ([string]::IsNullOrWhiteSpace($env:PORTAL_TEOLOGICO_SUPABASE_DB_URL)) {
        Write-Log "[AVISO] PORTAL_TEOLOGICO_SUPABASE_DB_URL nao definida  - etapa de banco sera pulada." DarkYellow
    }
}

try {
    Write-Log "" White
    Write-Log "============================================================" Cyan
    Write-Log "  $ProjectDisplayName | BACKUP MANAGER v1 | $DataHumana | user:$Usuario" White
    Write-Log "============================================================" Cyan

    Validate-Environment
    Sync-Robocopy -Destino $OneDriveDestino -NomeDestino "OneDrive"
    Sync-Robocopy -Destino $ExternoDestino -NomeDestino "HD Externo"
    Create-ZipSnapshot
    Backup-SupabaseDatabase
    Sync-GitHub

    $Duration = (Get-Date) - $StartTime

    Write-Log "" White
    Write-Log "============================================================" Green
    Write-Log "  BACKUP CONCLUIDO COM SUCESSO | $DataHumana | duracao: $($Duration.ToString('mm\:ss'))" Green
    Write-Log "============================================================" Green

    exit 0
} catch {
    $Duration = (Get-Date) - $StartTime
    Write-Log "" White
    Write-Log "============================================================" Red
    Write-Log "  BACKUP FALHOU | $($_.Exception.Message) | duracao: $($Duration.ToString('mm\:ss'))" Red
    Write-Log "============================================================" Red
    exit 1
}
