# testar-locales-auth.ps1
#
# Abre /login, /cadastro e /recuperar-senha nos 3 idiomas (pt-BR, en-US,
# es-419), cada um direto pelo endereco - servidor roda numa porta so
# (3000), abrir direto evita o bug ja conhecido de reversao para pt-BR
# ao navegar clicando de uma pagina para outra dentro do site.
#
# Isso so confirma que a pagina RENDERIZA certo em cada idioma. O teste
# que realmente confirma a correcao do bug (idioma perdido no redirect
# da Server Action) precisa de voce SUBMETER o formulario em cada aba -
# ver instrucoes impressas no final deste script.
#
# Uso:
#   cd C:\Projetos\portal-teologico-os-staging
#   .\scripts\testar-locales-auth.ps1
#
# Pre-requisito: "npm run dev" precisa estar rodando em outra janela
# antes de rodar este script.

$porta = 3000
$base = "http://localhost:$porta"

$urls = @(
    "$base/login",
    "$base/en-US/login",
    "$base/es-419/login",
    "$base/cadastro",
    "$base/en-US/cadastro",
    "$base/es-419/cadastro",
    "$base/recuperar-senha",
    "$base/en-US/recuperar-senha",
    "$base/es-419/recuperar-senha"
)

$conexao = Test-NetConnection -ComputerName "localhost" -Port $porta -WarningAction SilentlyContinue

if (-not $conexao.TcpTestSucceeded) {
    Write-Host "O servidor nao esta respondendo em $base." -ForegroundColor Red
    Write-Host "Abra outra janela do PowerShell, rode:" -ForegroundColor Yellow
    Write-Host "  cd C:\Projetos\portal-teologico-os-staging; npm run dev" -ForegroundColor Yellow
    Write-Host "e so depois rode este script de novo." -ForegroundColor Yellow
    exit 1
}

foreach ($url in $urls) {
    Start-Process $url
    Start-Sleep -Milliseconds 400
}

Write-Host "Abertas $($urls.Count) paginas no navegador padrao." -ForegroundColor Green
Write-Host ""
Write-Host "Isso so confirma que cada pagina RENDERIZA no idioma certo." -ForegroundColor Yellow
Write-Host "Para confirmar o bug corrigido de verdade, em CADA aba de login:" -ForegroundColor Yellow
Write-Host "  1. Digite um email/senha errados e clique Entrar." -ForegroundColor Yellow
Write-Host "  2. A pagina de erro deve continuar no MESMO idioma da aba" -ForegroundColor Yellow
Write-Host "     (endereco deve manter o prefixo /en-US/ ou /es-419/)." -ForegroundColor Yellow
Write-Host "  3. Repita em cadastro e recuperar-senha." -ForegroundColor Yellow
Write-Host ""
Write-Host "Para testar um login de verdade (conta de staff de teste):" -ForegroundColor Yellow
Write-Host "  E-mail: staff.demo@teste.cetadp.org.br" -ForegroundColor Yellow
Write-Host "  Senha:  @Cetadp748596#" -ForegroundColor Yellow
