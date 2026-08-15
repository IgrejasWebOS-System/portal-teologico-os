# ============================================================
# fix-2026-08-14-auditoria.ps1
# Aplica e valida as correcoes da auditoria pre go-live (20/08/2026):
#  - .gitignore: .env.example volta a ser versionado (estava sendo
#    ignorado por engano pelo padrao ".env*", por isso sumiu da pasta
#    staging depois do clone)
#  - .env.example criado na staging
#  - .env.local criado na staging (aponta pra branch Supabase staging)
#  - migrations 040/041: UUIDs fixos trocados por lookup dinamico
#
# Rode este script INTEIRO, de cima a baixo, no PowerShell.
# Pre-requisitos: git e node/npm instalados e no PATH.
# ============================================================

$ErrorActionPreference = "Stop"
Set-Location "C:\Projetos\portal-teologico-os-staging"

Write-Host "===== 1. Confirmando branch e estado do git =====" -ForegroundColor Cyan
git status --short --branch

Write-Host ""
Write-Host "===== 2. Criando branch de correcao =====" -ForegroundColor Cyan
git checkout main
git pull origin main
git checkout -b fix/env-example-e-migrations-040-041

Write-Host ""
Write-Host "===== 3. Adicionando arquivos corrigidos =====" -ForegroundColor Cyan
git add .gitignore .env.example supabase/migrations/040_seed_questoes_curso_medio.sql supabase/migrations/041_demo_aluno_com_simulados_e_provas.sql

Write-Host ""
Write-Host "===== 4. Commit =====" -ForegroundColor Cyan
git commit -m "fix: versiona .env.example (gitignore .env* bloqueava) + remove UUIDs fixos das migrations 040/041"

Write-Host ""
Write-Host "===== 5. Push =====" -ForegroundColor Cyan
git push -u origin fix/env-example-e-migrations-040-041

Write-Host ""
Write-Host "===== 6. Instalando dependencias (se necessario) =====" -ForegroundColor Cyan
npm install

Write-Host ""
Write-Host "===== 7. Type check (npx tsc --noEmit) =====" -ForegroundColor Cyan
npx tsc --noEmit

Write-Host ""
Write-Host "===== 8. Lint =====" -ForegroundColor Cyan
npm run lint

Write-Host ""
Write-Host "===== 9. Build de producao (valida que compila) =====" -ForegroundColor Cyan
npm run build

Write-Host ""
Write-Host "===== CONCLUIDO =====" -ForegroundColor Green
Write-Host "Se tudo acima passou sem erro:"
Write-Host "1. Abra o PR da branch fix/env-example-e-migrations-040-041 -> main no GitHub."
Write-Host "2. Confira o Vercel Preview gerado automaticamente pelo push."
Write-Host "3. So depois de validar o Preview, faca merge em main."
Write-Host ""
Write-Host "Para rodar local com hot-reload contra a branch staging do Supabase:"
Write-Host "  cd C:\Projetos\portal-teologico-os-staging"
Write-Host "  npm run dev"
Write-Host "  (abra http://localhost:3000 -- confira C:\Projetos\portal-teologico-os-staging\.env.local e cole a SUPABASE_SERVICE_ROLE_KEY antes de rodar, se ainda nao colou)"
