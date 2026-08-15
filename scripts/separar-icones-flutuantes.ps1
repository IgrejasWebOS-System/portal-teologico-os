# Separa a mudanca dos icones flutuantes da Fase 0 do i18n, que ainda
# nao foi commitada. Roda em: C:\Projetos\portal-teologico-os-staging
#
# Passo 1: commita tudo da Fase 0 (branch feature/i18n-fase0-infra),
#          menos o arquivo dos icones flutuantes.
# Passo 2: troca pra main, cria uma branch nova so com o icone.

Set-Location "C:\Projetos\portal-teologico-os-staging"

git add -A
git restore --staged "src/components/public/FloatingSocialIcons.tsx"
git commit -m "feat: infraestrutura i18n (next-intl) - reestrutura rotas para app/[locale]"
git push -u origin feature/i18n-fase0-infra

git checkout main
git checkout -b style/icones-flutuantes-padrao

git add "src/components/public/FloatingSocialIcons.tsx"
git commit -m "style: padroniza icones flutuantes de midia social (preto/laranja, 45px)"
git push -u origin style/icones-flutuantes-padrao

git status

Write-Host ""
Write-Host "Pronto. Duas branches separadas no GitHub agora:"
Write-Host "  feature/i18n-fase0-infra  (Fase 0 do i18n)"
Write-Host "  style/icones-flutuantes-padrao (so o icone)"
Write-Host "Avise o Claude do resultado."
