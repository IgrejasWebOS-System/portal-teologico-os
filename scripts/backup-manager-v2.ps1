<#
=====================================================================
Backup Manager v2 - Portal Teologico (CETADP)
Criado em 05/10/2026. Substitui o fluxo manual de 04/10/2026 e o
backup-portal-teologico.ps1 (v1) para o que e ESSENCIAL:

  1. Codigo (producao + staging), SEM lixo (node_modules, .next, .git,
     .vercel, temporarios) -> E: e OneDrive.
  2. git bundle de cada projeto (historico completo, 1 arquivo) +
     MANIFEST.txt (branch, commit, alteracoes nao commitadas).
  3. Dump do banco de PRODUCAO (pg_dump -Fc), validado
     (pg_restore --list, tabelas essenciais, tamanho vs. anterior,
     SHA256). Fica no E: em claro; para a NUVEM so vai CRIPTOGRAFADO
     (7-Zip AES-256). Dump em claro NUNCA vai para o OneDrive.
  4. Retencao: so LISTA o que passou da conta. Nunca apaga nada.

O script NAO faz git add/commit/push (o v1 fazia, e um push na main
dispara deploy de producao).

Uso (PowerShell, qualquer pasta):
  powershell -ExecutionPolicy Bypass -File C:\Projetos\portal-teologico-os-staging\scripts\backup-manager-v2.ps1 -DryRun
  ... -File ...\backup-manager-v2.ps1                       (backup completo)
  ... -File ...\backup-manager-v2.ps1 -PreMigration -Label pre-129
  ... -File ...\backup-manager-v2.ps1 -SkipDb               (so codigo)
  ... -File ...\backup-manager-v2.ps1 -SkipCode             (so banco)
  ... -File ...\backup-manager-v2.ps1 -SkipCloud            (nada na nuvem)
  ... -File ...\backup-manager-v2.ps1 -Status               (idade do ultimo dump)

Senha do dump criptografado: digitada na hora (2 vezes). Para rodar
agendado, defina a variavel de ambiente BK_DUMP_PASSWORD do usuario
(sem a senha, a copia para a nuvem e PULADA com aviso - nunca vai sem
criptografia). GUARDE A SENHA NO GERENCIADOR DE SENHAS: sem ela o dump
da nuvem nao abre.

Requisitos: robocopy, git, pg_dump/pg_restore (PostgreSQL 17),
7-Zip (so para a copia na nuvem), variavel de ambiente de usuario
PORTAL_TEOLOGICO_SUPABASE_DB_URL apontando para PRODUCAO.
=====================================================================
#>
[CmdletBinding()]
param(
  [switch]$DryRun,
  [switch]$PreMigration,
  [string]$Label = "",
  [switch]$SkipCode,
  [switch]$SkipDb,
  [switch]$SkipCloud,
  [switch]$Status,
  [int]$KeepCode = 10
)

$ErrorActionPreference = "Stop"

# ---------------------------------------------------------------
# Configuracao
# ---------------------------------------------------------------
$Stamp     = Get-Date -Format "yyyy-MM-dd_HHmm"
$LocalRoot = "E:\bk-projetos"
$CloudRoot = "C:\Users\joaqu\OneDrive\bk-projetos"

$Projetos = @(
  @{ Nome = "portal-teologico-os";         Caminho = "C:\Projetos\portal-teologico-os" },
  @{ Nome = "portal-teologico-os-staging"; Caminho = "C:\Projetos\portal-teologico-os-staging" }
)

$ProdRef    = "toduvwtzklntyptcodkf"
$StagingRef = "cjxdroyyplpknygtcdgr"

$TabelasEssenciais = @(
  "admin_roles", "ead_alunos", "ead_matriculas", "fin_contas_pagar",
  "fin_contas_receber", "professores", "profiles", "nucleo_despesas"
)

# Pastas/arquivos que NAO entram no backup de codigo
$XD = @("node_modules", ".next", ".git", ".vercel", ".turbo", ".cache", ".temp", "temp", "tmp", "coverage", "dist", "out")
$XF = @("*.log", "*.tmp", "*.tsbuildinfo", "Thumbs.db", ".DS_Store", "next-env.d.ts")
# Segredos: ficam so no E: (local), nunca na nuvem
$Segredos = @(".env", ".env.local", ".env.*.local", ".env.production", ".env.staging", ".env.development", ".env.test")

$LogDir = Join-Path $LocalRoot "logs"
$script:LogFile = $null
$script:Falhas = 0

function Write-Log {
  param([string]$Msg, [string]$Nivel = "INFO")
  $linha = "[{0}] [{1}] {2}" -f (Get-Date -Format "yyyy-MM-dd HH:mm:ss"), $Nivel, $Msg
  Write-Host $linha
  if ($script:LogFile) { Add-Content -Path $script:LogFile -Value $linha -Encoding ASCII }
}

function Find-7Zip {
  $candidatos = @("C:\Program Files\7-Zip\7z.exe", "C:\Program Files (x86)\7-Zip\7z.exe")
  foreach ($c in $candidatos) { if (Test-Path $c) { return $c } }
  $cmd = Get-Command 7z -ErrorAction SilentlyContinue
  if ($cmd) { return $cmd.Source }
  return $null
}

function Test-Ferramenta {
  param([string]$Nome)
  return [bool](Get-Command $Nome -ErrorAction SilentlyContinue)
}

function Get-DataDoNome {
  param([string]$Nome)
  if ($Nome -match "(\d{4}-\d{2}-\d{2})") { return [datetime]::ParseExact($Matches[1], "yyyy-MM-dd", $null) }
  return $null
}

# ---------------------------------------------------------------
# Modo -Status: idade do ultimo dump
# ---------------------------------------------------------------
if ($Status) {
  $dbDir = Join-Path $LocalRoot "db"
  $ultimo = $null
  if (Test-Path $dbDir) {
    $ultimo = Get-ChildItem -Path $dbDir -Filter "*.dump" -File | Sort-Object LastWriteTime -Descending | Select-Object -First 1
  }
  if (-not $ultimo) {
    Write-Host "[ALERTA] Nenhum dump de banco encontrado em $dbDir"
    exit 1
  }
  $idade = (New-TimeSpan -Start $ultimo.LastWriteTime -End (Get-Date)).Days
  Write-Host ("Ultimo dump: {0} ({1} KB) - {2} dia(s) atras" -f $ultimo.Name, [math]::Round($ultimo.Length / 1KB, 1), $idade)
  if ($idade -gt 7) {
    Write-Host "[ALERTA] Dump com mais de 7 dias. Rode o backup."
    exit 1
  }
  exit 0
}

# ---------------------------------------------------------------
# Preflight
# ---------------------------------------------------------------
if (-not (Test-Path "E:\")) {
  Write-Host "[ERRO] Unidade E: nao encontrada. Conecte o HD externo e rode de novo."
  exit 1
}
New-Item -ItemType Directory -Force -Path $LocalRoot, $LogDir | Out-Null
$script:LogFile = Join-Path $LogDir ("backup_{0}.log" -f $Stamp)

Write-Log ("Backup Manager v2 - inicio. DryRun={0} PreMigration={1} SkipCode={2} SkipDb={3} SkipCloud={4}" -f $DryRun, $PreMigration, $SkipCode, $SkipDb, $SkipCloud)

if (-not $SkipCloud) {
  if (-not (Test-Path (Split-Path $CloudRoot -Parent))) {
    Write-Log "Pasta do OneDrive nao encontrada - copia para a nuvem sera PULADA." "AVISO"
    $SkipCloud = $true
  } else {
    New-Item -ItemType Directory -Force -Path $CloudRoot | Out-Null
  }
}

if (-not $SkipCode) {
  if (-not (Test-Ferramenta "robocopy")) { Write-Log "robocopy nao encontrado." "ERRO"; exit 1 }
  if (-not (Test-Ferramenta "git"))      { Write-Log "git nao encontrado - bundle sera pulado." "AVISO" }
}

if (-not $SkipDb) {
  if (-not (Test-Ferramenta "pg_dump") -or -not (Test-Ferramenta "pg_restore")) {
    Write-Log "pg_dump/pg_restore nao encontrados (instale o PostgreSQL 17 client tools). Banco sera PULADO." "ERRO"
    $script:Falhas++
    $SkipDb = $true
  }
}

# ---------------------------------------------------------------
# 1. CODIGO
# ---------------------------------------------------------------
function Copy-Projeto {
  param($Proj, [string]$DestRoot, [bool]$EhNuvem)

  $destProj = Join-Path (Join-Path $DestRoot $Stamp) $Proj.Nome
  if ($DryRun) {
    Write-Log ("[DRYRUN] copiaria {0} -> {1}" -f $Proj.Caminho, $destProj)
  } else {
    New-Item -ItemType Directory -Force -Path $destProj | Out-Null
  }

  $roboArgs = @($Proj.Caminho, $destProj, "/E", "/R:1", "/W:1", "/NFL", "/NDL", "/NP", "/NJH", "/NJS", "/XD") + $XD + @("/XF") + $XF
  if ($EhNuvem) { $roboArgs += $Segredos }
  if ($DryRun)  { $roboArgs += "/L" }

  & robocopy @roboArgs | Out-Null
  if ($LASTEXITCODE -ge 8) { throw ("robocopy falhou (codigo {0}) em {1}" -f $LASTEXITCODE, $Proj.Nome) }
  $global:LASTEXITCODE = 0
}

function New-BundleEManifesto {
  param($Proj, [string]$DestRoot)

  $destDir = Join-Path $DestRoot $Stamp
  $bundle = Join-Path $destDir ($Proj.Nome + ".bundle")
  $manifesto = Join-Path $destDir ("MANIFEST_" + $Proj.Nome + ".txt")

  if (-not (Test-Ferramenta "git")) { return }
  if (-not (Test-Path (Join-Path $Proj.Caminho ".git"))) {
    Write-Log ("{0}: sem pasta .git - bundle pulado." -f $Proj.Nome) "AVISO"
    return
  }

  $branch = (& git -C $Proj.Caminho rev-parse --abbrev-ref HEAD) 2>$null
  $commit = (& git -C $Proj.Caminho rev-parse HEAD) 2>$null
  $naoCommitados = @(& git -C $Proj.Caminho status --porcelain).Count

  if ($DryRun) {
    Write-Log ("[DRYRUN] bundle de {0}: branch={1} commit={2} nao-commitados={3}" -f $Proj.Nome, $branch, $commit, $naoCommitados)
    return
  }

  # O git escreve progresso/"is okay" no stderr. No PowerShell 5.1, com
  # ErrorActionPreference=Stop isso vira erro terminante mesmo com exit 0.
  # Por isso o relaxamento local e a checagem pelo codigo de saida.
  $eapAnterior = $ErrorActionPreference
  $ErrorActionPreference = "Continue"
  try {
    & git -C $Proj.Caminho bundle create $bundle --all 2>&1 | Out-Null
    $okCreate = ($LASTEXITCODE -eq 0)
    & git -C $Proj.Caminho bundle verify $bundle 2>&1 | Out-Null
    $okVerify = ($LASTEXITCODE -eq 0)
  } finally {
    $ErrorActionPreference = $eapAnterior
  }
  if (-not $okCreate) { throw ("git bundle create falhou em {0}" -f $Proj.Nome) }
  if (-not $okVerify) { throw ("git bundle verify falhou em {0}" -f $Proj.Nome) }

  $linhas = @(
    "Projeto: " + $Proj.Nome,
    "Data: " + (Get-Date -Format "yyyy-MM-dd HH:mm:ss"),
    "Branch: " + $branch,
    "Commit: " + $commit,
    "Arquivos com alteracao NAO commitada: " + $naoCommitados,
    "Observacao: alteracoes nao commitadas estao na copia de arquivos, nao no bundle."
  )
  Set-Content -Path $manifesto -Value $linhas -Encoding ASCII
  Write-Log ("{0}: bundle ok (branch {1}, {2} arquivo(s) nao commitado(s))" -f $Proj.Nome, $branch, $naoCommitados)
}

function Test-CopiaCodigo {
  param([string]$DestRoot, [bool]$EhNuvem)

  $destDir = Join-Path $DestRoot $Stamp
  if (-not (Test-Path $destDir)) { return }
  $proibidas = @(Get-ChildItem -Path $destDir -Recurse -Directory -Force -ErrorAction SilentlyContinue |
    Where-Object { @("node_modules", ".next", ".git") -contains $_.Name }).Count
  $arquivos = @(Get-ChildItem -Path $destDir -Recurse -File -Force -ErrorAction SilentlyContinue)
  $mb = [math]::Round((($arquivos | Measure-Object -Property Length -Sum).Sum) / 1MB, 1)
  $segredosNuvem = 0
  if ($EhNuvem) {
    # .env.example / .env.sample sao modelos sem segredo: podem ir para a nuvem.
    $suspeitos = @($arquivos | Where-Object { $_.Name -like ".env*" -and $_.Name -notlike "*.example" -and $_.Name -notlike "*.sample" })
    $segredosNuvem = $suspeitos.Count
    foreach ($s in $suspeitos) { Write-Log ("Possivel segredo na nuvem: {0}" -f $s.FullName) "ERRO" }
  }
  $nivel = "INFO"
  if ($proibidas -gt 0 -or $segredosNuvem -gt 0) { $nivel = "ERRO"; $script:Falhas++ }
  Write-Log ("Verificacao {0}: {1} arquivos, {2} MB, pastas proibidas={3}, segredos na nuvem={4}" -f $destDir, $arquivos.Count, $mb, $proibidas, $segredosNuvem) $nivel
}

if (-not $SkipCode) {
  try {
    foreach ($p in $Projetos) {
      if (-not (Test-Path $p.Caminho)) { Write-Log ("Projeto nao encontrado: {0}" -f $p.Caminho) "ERRO"; $script:Falhas++; continue }
      Copy-Projeto -Proj $p -DestRoot $LocalRoot -EhNuvem $false
      New-BundleEManifesto -Proj $p -DestRoot $LocalRoot
      if (-not $SkipCloud) {
        Copy-Projeto -Proj $p -DestRoot $CloudRoot -EhNuvem $true
        if (-not $DryRun) {
          # bundle e manifesto tambem vao para a nuvem
          $origem = Join-Path $LocalRoot $Stamp
          $destino = Join-Path $CloudRoot $Stamp
          Copy-Item -Path (Join-Path $origem ($p.Nome + ".bundle")) -Destination $destino -ErrorAction SilentlyContinue
          Copy-Item -Path (Join-Path $origem ("MANIFEST_" + $p.Nome + ".txt")) -Destination $destino -ErrorAction SilentlyContinue
        }
      }
    }
    if (-not $DryRun) {
      Test-CopiaCodigo -DestRoot $LocalRoot -EhNuvem $false
      if (-not $SkipCloud) { Test-CopiaCodigo -DestRoot $CloudRoot -EhNuvem $true }
    }
  } catch {
    Write-Log ("Falha no backup de codigo: {0}" -f $_.Exception.Message) "ERRO"
    $script:Falhas++
  }
}

# ---------------------------------------------------------------
# 2. BANCO DE PRODUCAO
# ---------------------------------------------------------------
function Backup-Banco {
  $url = $env:PORTAL_TEOLOGICO_SUPABASE_DB_URL
  if (-not $url) { throw "Variavel PORTAL_TEOLOGICO_SUPABASE_DB_URL nao definida." }

  $u = [uri]$url
  $usuario = $u.UserInfo.Split(":")[0]
  Write-Log ("Banco: host={0} usuario={1}" -f $u.Host, $usuario)
  if ($usuario -like ("*" + $StagingRef + "*")) { throw "A variavel aponta para o STAGING, nao para producao. Abortado." }
  if ($usuario -notlike ("*" + $ProdRef + "*"))  { throw "A variavel nao aponta para o projeto de producao. Abortado." }

  $dbDir = Join-Path $LocalRoot "db"
  New-Item -ItemType Directory -Force -Path $dbDir | Out-Null

  $sufixo = ""
  if ($PreMigration) {
    if ($Label) { $sufixo = "_PRE-" + ($Label -replace "[^a-zA-Z0-9\-]", "") } else { $sufixo = "_PRE-MIGRATION" }
  } elseif ($Label) {
    $sufixo = "_" + ($Label -replace "[^a-zA-Z0-9\-]", "")
  }
  $nomeDump = "portal-teologico_PROD_{0}{1}.dump" -f $Stamp, $sufixo
  $arq = Join-Path $dbDir $nomeDump

  if ($DryRun) {
    Write-Log ("[DRYRUN] geraria o dump {0} e validaria (pg_restore --list)" -f $arq)
    return
  }

  $anterior = Get-ChildItem -Path $dbDir -Filter "*.dump" -File | Sort-Object LastWriteTime -Descending | Select-Object -First 1

  Write-Log ("Gerando dump: {0}" -f $nomeDump)
  & pg_dump $url -Fc -f $arq
  if ($LASTEXITCODE -ne 0) { throw ("pg_dump falhou (codigo {0})." -f $LASTEXITCODE) }

  # Validacao 1: tamanho
  $tamanhoKb = [math]::Round((Get-Item $arq).Length / 1KB, 1)
  if ($tamanhoKb -lt 50) { throw ("Dump suspeito: so {0} KB." -f $tamanhoKb) }
  if ($anterior -and ($anterior.Length -gt 0)) {
    $razao = (Get-Item $arq).Length / $anterior.Length
    if ($razao -lt 0.5) {
      Write-Log ("ALERTA: o dump encolheu para {0:P0} do anterior ({1}). Confira se houve exclusao de dados." -f $razao, $anterior.Name) "AVISO"
    }
  }

  # Validacao 2: arquivo legivel e tabelas essenciais presentes
  $lista = @(& pg_restore --list $arq)
  if ($LASTEXITCODE -ne 0) { throw "pg_restore --list falhou: dump ilegivel." }
  $faltando = @()
  foreach ($t in $TabelasEssenciais) {
    $achou = @($lista | Where-Object { $_ -match ("TABLE DATA public " + $t + " ") }).Count
    if ($achou -eq 0) { $faltando += $t }
  }
  if ($faltando.Count -gt 0) { throw ("Tabelas essenciais ausentes no dump: " + ($faltando -join ", ")) }

  $hash = (Get-FileHash $arq -Algorithm SHA256).Hash
  Write-Log ("Dump validado: {0} KB, {1} entradas, {2} tabelas essenciais presentes." -f $tamanhoKb, $lista.Count, $TabelasEssenciais.Count)
  Write-Log ("SHA256: {0}" -f $hash)
  Add-Content -Path (Join-Path $dbDir "HASHES.txt") -Value ("{0}  {1}  {2} KB" -f $hash, $nomeDump, $tamanhoKb) -Encoding ASCII

  # Registra o backup no painel /admin/saude-sistema (tabela monitor_backups,
  # migration 133). Tolerante a falha: se psql ou a tabela nao existirem, so avisa.
  if (Test-Ferramenta "psql") {
    $rotuloSql = if ($Label) { ($Label -replace "[^a-zA-Z0-9\-]", "") } else { "" }
    $tamBytes = (Get-Item $arq).Length
    $sqlReg = "insert into public.monitor_backups (rotulo, arquivo, tamanho_bytes, sha256, entradas) values (nullif('{0}',''), '{1}', {2}, '{3}', {4});" -f $rotuloSql, $nomeDump, $tamBytes, $hash, $lista.Count
    & psql $url -v ON_ERROR_STOP=1 -q -c $sqlReg 2>&1 | Out-Null
    if ($LASTEXITCODE -eq 0) {
      Write-Log "Backup registrado no painel de saude (monitor_backups)."
    } else {
      Write-Log "Nao foi possivel registrar o backup no painel (migration 133 aplicada em producao?). O backup em si esta OK." "AVISO"
    }
  } else {
    Write-Log "psql nao encontrado: backup nao registrado no painel de saude (o backup em si esta OK)." "AVISO"
  }

  # Copia para a nuvem: SO criptografada
  if ($SkipCloud) { return }

  $sevenZip = Find-7Zip
  if (-not $sevenZip) {
    Write-Log "7-Zip nao encontrado: dump NAO foi para a nuvem (nunca vai em claro). Instale em https://www.7-zip.org e rode de novo." "AVISO"
    return
  }

  $senha = $env:BK_DUMP_PASSWORD
  if (-not $senha) {
    if (-not [Environment]::UserInteractive) {
      Write-Log "Sem BK_DUMP_PASSWORD e sem terminal interativo: dump NAO foi para a nuvem." "AVISO"
      return
    }
    $s1 = Read-Host "Senha para criptografar o dump da nuvem (guarde no gerenciador de senhas)" -AsSecureString
    $s2 = Read-Host "Repita a senha" -AsSecureString
    $p1 = [Runtime.InteropServices.Marshal]::PtrToStringAuto([Runtime.InteropServices.Marshal]::SecureStringToBSTR($s1))
    $p2 = [Runtime.InteropServices.Marshal]::PtrToStringAuto([Runtime.InteropServices.Marshal]::SecureStringToBSTR($s2))
    if (-not $p1 -or $p1 -ne $p2) { Write-Log "Senhas vazias ou diferentes: dump NAO foi para a nuvem." "AVISO"; return }
    if ($p1.Length -lt 12) { Write-Log "Senha curta (menos de 12 caracteres): dump NAO foi para a nuvem." "AVISO"; return }
    $senha = $p1
  }

  $nuvemDb = Join-Path $CloudRoot "db"
  New-Item -ItemType Directory -Force -Path $nuvemDb | Out-Null
  $saida = Join-Path $nuvemDb ($nomeDump + ".7z")

  & $sevenZip a -t7z -mx=1 -mhe=on ("-p" + $senha) $saida $arq | Out-Null
  if ($LASTEXITCODE -ne 0) { throw "7-Zip falhou ao criptografar o dump." }
  & $sevenZip t ("-p" + $senha) $saida | Out-Null
  if ($LASTEXITCODE -ne 0) { throw "Teste do arquivo criptografado falhou." }
  $senha = $null; $p1 = $null; $p2 = $null

  $kbCript = [math]::Round((Get-Item $saida).Length / 1KB, 1)
  Write-Log ("Dump criptografado e testado na nuvem: {0} ({1} KB)" -f $saida, $kbCript)
}

if (-not $SkipDb) {
  try { Backup-Banco }
  catch {
    Write-Log ("Falha no backup do banco: {0}" -f $_.Exception.Message) "ERRO"
    $script:Falhas++
  }
}

# ---------------------------------------------------------------
# 3. RETENCAO (so lista - nunca apaga)
# ---------------------------------------------------------------
function Show-Retencao {
  foreach ($raiz in @($LocalRoot, $CloudRoot)) {
    if (-not (Test-Path $raiz)) { continue }

    $pastas = @(Get-ChildItem -Path $raiz -Directory | Where-Object { $_.Name -match "^\d{4}-\d{2}-\d{2}_\d{4}$" } | Sort-Object Name -Descending)
    if ($pastas.Count -gt $KeepCode) {
      $sobra = $pastas | Select-Object -Skip $KeepCode
      Write-Log ("Retencao codigo em {0}: {1} copias, mantendo as {2} mais novas. Candidatas a remover (NADA foi apagado): {3}" -f $raiz, $pastas.Count, $KeepCode, (($sobra | ForEach-Object { $_.Name }) -join ", ")) "AVISO"
    }

    $dbDir = Join-Path $raiz "db"
    if (-not (Test-Path $dbDir)) { continue }
    $dumps = @(Get-ChildItem -Path $dbDir -File | Where-Object { $_.Name -like "*.dump" -or $_.Name -like "*.dump.7z" } | Sort-Object Name -Descending)
    if ($dumps.Count -eq 0) { continue }

    $manter = @{}
    foreach ($d in ($dumps | Select-Object -First 7)) { $manter[$d.Name] = $true }          # 7 mais recentes
    foreach ($d in $dumps) { if ($d.Name -match "_PRE-") { $manter[$d.Name] = $true } }      # pre-migracao: sempre
    $meses = @{}
    foreach ($d in ($dumps | Sort-Object Name)) {                                             # 1o de cada mes (12 meses)
      $dt = Get-DataDoNome $d.Name
      if ($dt -and $dt -gt (Get-Date).AddMonths(-12)) {
        $chave = $dt.ToString("yyyy-MM")
        if (-not $meses.ContainsKey($chave)) { $meses[$chave] = $true; $manter[$d.Name] = $true }
      }
    }
    $candidatas = @($dumps | Where-Object { -not $manter.ContainsKey($_.Name) })
    if ($candidatas.Count -gt 0) {
      Write-Log ("Retencao banco em {0}: candidatos a remover (NADA foi apagado): {1}" -f $dbDir, (($candidatas | ForEach-Object { $_.Name }) -join ", ")) "AVISO"
    }
  }
}

if (-not $DryRun) { Show-Retencao }

# ---------------------------------------------------------------
# Resumo
# ---------------------------------------------------------------
if ($script:Falhas -gt 0) {
  Write-Log ("CONCLUIDO COM {0} FALHA(S). Veja o log: {1}" -f $script:Falhas, $script:LogFile) "ERRO"
  exit 1
}
Write-Log ("CONCLUIDO SEM FALHAS. Log: {0}" -f $script:LogFile)
exit 0
