# Scripts de automação — /scripts

5 scripts PowerShell/TypeScript, todos lendo a mesma `config/paths.json` (caminhos
de OneDrive, HD externo, snapshots e organização do GitHub).

## `backup-portal-teologico.ps1` — backup completo, 1 comando

```powershell
.\scripts\backup-portal-teologico.ps1
```

Ordem de execução: valida ambiente → sincroniza código pro OneDrive (robocopy
`/MIR`) → sincroniza pro HD externo → gera snapshot ZIP versionado
(`Snapshots/portal-teologico-os/AAAA/MM/`) → exporta o banco Supabase via
`pg_dump` (formato custom, `-Fc`) e copia o dump pra OneDrive/HD externo (pasta
`database`, separada do mirror de código) → `git add` + `commit` + `push` pra
`main`.

O dump do banco **nunca é commitado no Git** — fica só em Snapshots/OneDrive/HD
Externo, porque contém dados pessoais e financeiros reais de alunos.

Flags: `-Silencioso` (sem log no console), `-DryRun` (simula sem gravar nada),
`-PularBanco` (pula a etapa de dump), `-CommitMessage "..."` (mensagem custom).

Pré-requisito da etapa de banco: variável de ambiente
`PORTAL_TEOLOGICO_SUPABASE_DB_URL` com a connection string do Postgres
(nunca em arquivo versionado) e `pg_dump` instalado no PATH. Sem isso, a etapa é
pulada com aviso — não derruba o resto do backup.

## `restore-portal-teologico.ps1` — restauração do código

```powershell
.\scripts\restore-portal-teologico.ps1 -Fonte Auto
```

Restaura o **código** a partir de 4 fontes possíveis, em ordem de prioridade:
GitHub → OneDrive → HD Externo → ZIP (parâmetro `-Fonte`, aceita
`Auto/GitHub/OneDrive/Externo/Zip/Banco`).

A restauração do **banco** (`-Fonte Banco`) é sempre manual e separada — nunca
entra no fluxo `Auto`, por ser uma operação destrutiva sobre dados reais de
produção.

## `verify-portal-teologico.ps1` — checagem de ambiente

```powershell
.\scripts\verify-portal-teologico.ps1
```

Lê `config/paths.json` e valida: pastas existem, Git está instalado, ferramentas
de banco disponíveis, remote configurado, espaço em disco, e quando foi o último
backup.

## `init-portal-teologico-folders.ps1` — inicialização de estrutura

```powershell
.\scripts\init-portal-teologico-folders.ps1
```

Cria (se não existirem) toda a estrutura de pastas local, OneDrive, HD externo,
`config/`, `docs/*` (com as categorias `blueprint`, `devops`, `github`, `backup`,
`security`, `database`, `infrastructure`, `architecture-decisions`) e `logs/AAAA/MM`
por tipo (`backup`, `restore`, `git`, `database`, `health`). **É esse script que
define a convenção de pastas usada em `docs/`** — por isso a documentação desta
sessão foi organizada seguindo essas mesmas categorias.

## `import-ebd.ts`

Script TypeScript (não PowerShell) — importação de conteúdo da EBD (lições/
trimestres). Não foi lido em detalhe nesta varredura; se for usado com frequência,
vale documentar separadamente com exemplos de uso.
