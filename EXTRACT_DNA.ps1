# -------------------------------------------------------------------------
# PROJETO: CONNECTION CYBER OS - LEGACY HARVESTER
# ARQUIVO: EXTRACT_DNA.ps1
# OBJETIVO: MAPEAMENTO CIRÚRGICO PARA FUSÃO DE CADASTROS (EXTREMO ZERO)
# -------------------------------------------------------------------------

Clear-Host
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8

$CurrentPath = (Get-Item .).FullName
$ProjectName = (Get-Item .).Name.ToUpper()

Write-Host "==========================================================" -ForegroundColor Magenta
Write-Host "      SCANNER DE ATIVOS LEGADOS | PROJETO: [$ProjectName]      " -ForegroundColor White -BackgroundColor DarkMagenta
Write-Host "      ALVO: EXTRAÇÃO DE ESTRUTURA PARA CONNECTIONCYBER        " -ForegroundColor Cyan
Write-Host "==========================================================" -ForegroundColor Magenta

# Filtro inteligente para focar em Arquitetura (Schemas, Types e Business Logic)
$Exclude = @("node_modules", ".next", ".git", "package-lock.json", ".vercel", "dist", ".cache", "tmp")
$PriorityFolders = @("src", "lib", "models", "types", "schemas", "database", "backend", "web")

function Get-ArchitecturalTree {
    param ([string]$Path, [string]$Indent = "")
    
    $Items = Get-ChildItem -Path $Path | Where-Object { $Exclude -notcontains $_.Name } | Sort-Object PSIsContainer -Descending
    
    foreach ($Item in $Items) {
        $Color = "Gray"
        if ($Item.PSIsContainer) {
            # Destacar pastas prioritárias que contêm o "DNA" do sistema
            if ($PriorityFolders -contains $Item.Name.ToLower()) {
                Write-Host "$Indent+---[$($Item.Name)]/" -ForegroundColor White -BackgroundColor DarkCyan
            } else {
                Write-Host "$Indent+---$($Item.Name)/" -ForegroundColor Yellow
            }
            Get-ArchitecturalTree -Path $Item.FullName -Indent "$Indent|   "
        } else {
            # Sinalizar arquivos críticos de Banco de Dados e Tipagem
            if ($Item.Name -match "(schema|database|types|prisma|supabase|model|action|auth)") {
                Write-Host "$Indent|---$($Item.Name) [ALVO CRÍTICO]" -ForegroundColor Green -BackgroundColor Black
            } else {
                Write-Host "$Indent|---$($Item.Name)" -ForegroundColor Gray
            }
        }
    }
}

Get-ArchitecturalTree -Path $CurrentPath
Write-Host "`n==========================================================" -ForegroundColor Magenta
Write-Host "VARREDURA DO PROJETO $ProjectName FINALIZADA." -ForegroundColor Green
Write-Host "LOCAL: $CurrentPath" -ForegroundColor Gray