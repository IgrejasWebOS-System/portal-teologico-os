# ============================================================
# fix-2026-08-14-parte2.ps1
#
# O que aconteceu na rodada anterior:
#  - O commit das correcoes de .gitignore/.env.example/migrations 040-041
#    foi feito com sucesso na branch fix/env-example-e-migrations-040-041
#    (ficou salvo, nao foi perdido).
#  - O push falhou (erro 403 - ver instrucoes no final deste arquivo).
#  - O script rodou de novo, tentou criar a MESMA branch de novo (falhou,
#    ja existia) e sem querer voltou o terminal pra branch main.
#  - Nesse meio tempo eu apliquei as correcoes dos 16 erros de lint,
#    mas elas ficaram (sem commit) em cima da branch main.
#
# Este script: guarda as correcoes de lint, troca pra branch certa
# (que ja tem o commit anterior), traz as correcoes de lint de volta,
# commita tudo junto, e tenta o push de novo.
# ============================================================

$ErrorActionPreference = "Stop"
Set-Location "C:\Projetos\portal-teologico-os-staging"

Write-Host "===== 1. Estado atual =====" -ForegroundColor Cyan
git status --short --branch

Write-Host ""
Write-Host "===== 2. Guardando as correcoes de lint (stash) =====" -ForegroundColor Cyan
$stashOutput = git stash push -u -m "correcoes lint 2026-08-14"
Write-Host $stashOutput
$temStash = -not ($stashOutput -match "No local changes to save")

Write-Host ""
Write-Host "===== 3. Indo para a branch de correcao (ja existe, com o commit anterior) =====" -ForegroundColor Cyan
git checkout fix/env-example-e-migrations-040-041

if ($temStash) {
    Write-Host ""
    Write-Host "===== 4. Trazendo as correcoes de lint de volta =====" -ForegroundColor Cyan
    git stash pop
} else {
    Write-Host ""
    Write-Host "===== 4. Nada pra trazer de volta (stash vazio) =====" -ForegroundColor Cyan
}

Write-Host ""
Write-Host "===== 5. Commitando as correcoes de lint =====" -ForegroundColor Cyan
git add -A
git status --short
git commit -m "fix: corrige 16 erros de lint (setState em effect, componente recriado a cada render, any, variavel module reservada)"

Write-Host ""
Write-Host "===== 6. Tentando o push =====" -ForegroundColor Cyan
Write-Host "Se der erro 403 aqui de novo, PARE e leia as instrucoes no final deste arquivo antes de continuar." -ForegroundColor Yellow
git push -u origin fix/env-example-e-migrations-040-041

Write-Host ""
Write-Host "===== 7. Type check =====" -ForegroundColor Cyan
npx tsc --noEmit

Write-Host ""
Write-Host "===== 8. Lint (deve estar limpo agora) =====" -ForegroundColor Cyan
npm run lint

Write-Host ""
Write-Host "===== 9. Build =====" -ForegroundColor Cyan
npm run build

Write-Host ""
Write-Host "===== CONCLUIDO =====" -ForegroundColor Green
Write-Host "Se o push do passo 6 funcionou: abra o PR no GitHub, valide o Vercel Preview, e so entao faca merge em main."

# ============================================================
# SE O PUSH FALHOU COM "Permission ... denied to portal-cidadania-os"
# ============================================================
# Isso significa que a credencial do git salva nesta maquina para
# github.com pertence a uma conta/token de OUTRO projeto seu
# (portal-cidadania-os), sem permissao de escrita neste repositorio
# (IgrejasWebOS-System/portal-teologico-os).
#
# Passo 1 - descobrir a credencial salva:
#   Abra o Painel de Controle do Windows > Contas de Usuario >
#   Gerenciador de Credenciais > Credenciais do Windows > procure por
#   uma entrada "git:https://github.com". Anote o nome de usuario salvo.
#
# Passo 2 - remover essa credencial:
#   Clique na entrada > Remover.
#
# Passo 3 - rodar o push de novo:
#   cd C:\Projetos\portal-teologico-os-staging
#   git push -u origin fix/env-example-e-migrations-040-041
#   O Windows vai abrir uma janela pedindo login do GitHub de novo -
#   entre com a conta que TEM permissao de escrita no repositorio
#   IgrejasWebOS-System/portal-teologico-os (provavelmente sua conta
#   pessoal ou uma conta de organizacao, nao a do projeto
#   portal-cidadania-os).
