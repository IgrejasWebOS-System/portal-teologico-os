<#
.SYNOPSIS
  Backup do Storage do Supabase de PRODUCAO (fotos e PDFs de matricula) - CETADP.
.DESCRIPTION
  Baixa todos os buckets (somente leitura) para E:\bk-projetos\storage\AAAA-MM-DD_HHMM,
  confere o que foi baixado (MANIFEST.json com SHA256) e, se nao usar -SkipCloud, gera uma
  copia criptografada (7-Zip AES-256) em C:\Users\joaqu\OneDrive\bk-projetos\storage.
  Os arquivos em claro NUNCA vao para a nuvem (tem documentos e fotos de pessoas).
  Nunca apaga nada: so lista copias antigas como candidatas a remocao.

  Pre-requisitos (uma vez): Node.js, 7-Zip e as variaveis de ambiente de usuario
    PORTAL_TEOLOGICO_PROD_SUPABASE_URL      = https://toduvwtzklntyptcodkf.supabase.co
    PORTAL_TEOLOGICO_PROD_SERVICE_ROLE_KEY  = chave service_role de PRODUCAO (Supabase >
                                              Project Settings > API). Nao colar no chat nem no git.
  Para rodar sem perguntar senha (tarefa agendada): variavel BK_DUMP_PASSWORD.
.EXAMPLE
  powershell -ExecutionPolicy Bypass -File C:\Projetos\portal-teologico-os-staging\scripts\backup-storage.ps1
.EXAMPLE
  powershell -ExecutionPolicy Bypass -File C:\Projetos\portal-teologico-os-staging\scripts\backup-storage.ps1 -DryRun
#>
param(
  [switch]$DryRun,
  [switch]$SkipCloud
)

$ErrorActionPreference = "Stop"
$Repo = "C:\Projetos\portal-teologico-os-staging"
$LocalRoot = "E:\bk-projetos\storage"
$CloudRoot = "C:\Users\joaqu\OneDrive\bk-projetos\storage"
$Manter = 6

function Write-Log {
  param([string]$Msg, [string]$Nivel = "INFO")
  Write-Host ("[{0}] [{1}] {2}" -f (Get-Date -Format "yyyy-MM-dd HH:mm:ss"), $Nivel, $Msg)
}

function Get-SevenZip {
  foreach ($c in @("C:\Program Files\7-Zip\7z.exe", "C:\Program Files (x86)\7-Zip\7z.exe")) {
    if (Test-Path $c) { return $c }
  }
  $cmd = Get-Command 7z -ErrorAction SilentlyContinue
  if ($cmd) { return $cmd.Source }
  return $null
}

if (-not (Test-Path "E:\")) {
  Write-Log "Disco E:\ nao encontrado. Conecte o disco e rode de novo." "ERRO"
  exit 1
}
if (-not (Get-Command node -ErrorAction SilentlyContinue)) {
  Write-Log "Node.js nao encontrado." "ERRO"
  exit 1
}
if (-not $env:PORTAL_TEOLOGICO_PROD_SUPABASE_URL -or -not $env:PORTAL_TEOLOGICO_PROD_SERVICE_ROLE_KEY) {
  Write-Log "Defina PORTAL_TEOLOGICO_PROD_SUPABASE_URL e PORTAL_TEOLOGICO_PROD_SERVICE_ROLE_KEY (veja o cabecalho do script)." "ERRO"
  exit 1
}

$stamp = Get-Date -Format "yyyy-MM-dd_HHmm"
$dest = Join-Path $LocalRoot $stamp
Write-Log ("Backup do Storage de PRODUCAO - inicio. DryRun={0} SkipCloud={1}" -f $DryRun.IsPresent, $SkipCloud.IsPresent)

$argsNode = @("$Repo\scripts\backup-storage.mjs", $dest)
if ($DryRun) { $argsNode += "--dry-run" }
Push-Location $Repo
try {
  & node @argsNode
  $codigo = $LASTEXITCODE
} finally {
  Pop-Location
}
if ($codigo -ne 0) {
  Write-Log "Download terminou com falhas (codigo $codigo). Veja as mensagens acima. Nada foi para a nuvem." "ERRO"
  exit 1
}
if ($DryRun) {
  Write-Log "DryRun concluido (nada foi baixado)."
  exit 0
}

if (-not $SkipCloud) {
  $sevenZip = Get-SevenZip
  if (-not $sevenZip) {
    Write-Log "7-Zip nao encontrado - copia para a nuvem PULADA." "AVISO"
  } elseif (-not (Test-Path (Split-Path $CloudRoot -Parent))) {
    Write-Log "Pasta do OneDrive nao encontrada - copia para a nuvem PULADA." "AVISO"
  } else {
    $senha = $env:BK_DUMP_PASSWORD
    if (-not $senha) {
      if (-not [Environment]::UserInteractive) {
        Write-Log "Sem BK_DUMP_PASSWORD e sem terminal interativo: Storage NAO foi para a nuvem." "AVISO"
      } else {
        $s1 = Read-Host "Senha para criptografar o Storage da nuvem (guarde no gerenciador de senhas)" -AsSecureString
        $s2 = Read-Host "Repita a senha" -AsSecureString
        $p1 = [Runtime.InteropServices.Marshal]::PtrToStringAuto([Runtime.InteropServices.Marshal]::SecureStringToBSTR($s1))
        $p2 = [Runtime.InteropServices.Marshal]::PtrToStringAuto([Runtime.InteropServices.Marshal]::SecureStringToBSTR($s2))
        if ($p1 -ne $p2 -or $p1.Length -lt 8) {
          Write-Log "Senhas diferentes ou com menos de 8 caracteres: Storage NAO foi para a nuvem." "AVISO"
        } else {
          $senha = $p1
        }
      }
    }
    if ($senha) {
      New-Item -ItemType Directory -Force -Path $CloudRoot | Out-Null
      $saida = Join-Path $CloudRoot ("storage_PROD_" + $stamp + ".7z")
      & $sevenZip a -t7z -mx=1 -mhe=on ("-p" + $senha) $saida (Join-Path $dest "*") | Out-Null
      if ($LASTEXITCODE -ne 0) {
        Write-Log "Falha ao compactar para a nuvem." "ERRO"
        exit 1
      }
      & $sevenZip t ("-p" + $senha) $saida | Out-Null
      if ($LASTEXITCODE -ne 0) {
        Write-Log "A copia criptografada nao passou no teste de integridade." "ERRO"
        exit 1
      }
      Write-Log ("Storage criptografado e testado na nuvem: {0} ({1:N1} MB)" -f $saida, ((Get-Item $saida).Length / 1MB))
    }
  }
}

# Retencao: so lista candidatas, nunca apaga.
$copias = @(Get-ChildItem -Path $LocalRoot -Directory | Sort-Object Name -Descending)
if ($copias.Count -gt $Manter) {
  $velhas = $copias | Select-Object -Skip $Manter | ForEach-Object { $_.Name }
  Write-Log ("Retencao Storage em {0}: {1} copias, mantendo as {2} mais novas. Candidatas a remover (NADA foi apagado): {3}" -f $LocalRoot, $copias.Count, $Manter, ($velhas -join ", ")) "AVISO"
}

Write-Log ("CONCLUIDO SEM FALHAS. Copia local: {0}" -f $dest)
