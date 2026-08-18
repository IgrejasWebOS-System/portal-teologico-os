# testar-locales-publicos.ps1
#
# Abre /sobre e /inscricao nos 3 idiomas (pt-BR, en-US, es-419), cada
# um direto pelo endereco (nao clicando dentro do site) - o servidor
# roda em uma porta so (3000), mas abrir direto pelo endereco evita o
# bug ja reportado de reversao para pt-BR ao navegar clicando de uma
# pagina para outra.
#
# Uso:
#   cd C:\Projetos\portal-teologico-os-staging
#   .\scripts\testar-locales-publicos.ps1
#
# Pre-requisito: "npm run dev" precisa estar rodando em outra janela
# antes de rodar este script.

$porta = 3000
$base = "http://localhost:$porta"

$urls = @(
    "$base/sobre",
    "$base/inscricao",
    "$base/en-US/sobre",
    "$base/en-US/inscricao",
    "$base/es-419/sobre",
    "$base/es-419/inscricao"
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

Write-Host "Abertas $($urls.Count) paginas no navegador padrao:" -ForegroundColor Green
foreach ($url in $urls) {
    Write-Host "  $url"
}
