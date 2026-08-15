# Fase 0 do i18n - move a arvore de rotas para app/[locale]
# Roda em: C:\Projetos\portal-teologico-os-staging
#
# O Claude ja criou/editou os arquivos novos de configuracao
# (src\i18n\, messages\, src\app\[locale]\layout.tsx, proxy.ts,
# next.config.ts, middleware.ts, a migration 074) diretamente nesta
# pasta - por isso este script NAO troca de branch a partir de main,
# ele so cria a branch nova a partir do estado atual (que ja tem essas
# edicoes) e move as rotas antigas para dentro de app\[locale].

Set-Location "C:\Projetos\portal-teologico-os-staging"

git checkout -b feature/i18n-fase0-infra

New-Item -ItemType Directory -Path "src\app\[locale]" -Force | Out-Null

git mv "src\app\(admin)" "src\app\[locale]\(admin)"
git mv "src\app\(cursos)" "src\app\[locale]\(cursos)"
git mv "src\app\(ebd)" "src\app\[locale]\(ebd)"
git mv "src\app\(escola)" "src\app\[locale]\(escola)"
git mv "src\app\(igreja)" "src\app\[locale]\(igreja)"
git mv "src\app\(auth)" "src\app\[locale]\(auth)"
git mv "src\app\biblioteca" "src\app\[locale]\biblioteca"
git mv "src\app\cadastro" "src\app\[locale]\cadastro"
git mv "src\app\certificados" "src\app\[locale]\certificados"
git mv "src\app\definir-senha" "src\app\[locale]\definir-senha"
git mv "src\app\escolher-modo" "src\app\[locale]\escolher-modo"
git mv "src\app\inscricao" "src\app\[locale]\inscricao"
git mv "src\app\loja" "src\app\[locale]\loja"
git mv "src\app\matricula" "src\app\[locale]\matricula"
git mv "src\app\portal" "src\app\[locale]\portal"
git mv "src\app\provas" "src\app\[locale]\provas"
git mv "src\app\sobre" "src\app\[locale]\sobre"
git mv "src\app\trocar-senha" "src\app\[locale]\trocar-senha"
git mv "src\app\recuperar-senha" "src\app\[locale]\recuperar-senha"
git mv "src\app\page.tsx" "src\app\[locale]\page.tsx"

git rm "src\app\layout.tsx"

git add -A

git status

Write-Host ""
Write-Host "Pronto. Revise o 'git status' acima."
Write-Host "Proximo passo: npm install next-intl"
Write-Host "Depois: npx tsc --noEmit"
Write-Host "Avise o Claude do resultado para continuar."
