# Evidência — correção de duplicação no AGENTS.md (PR #22)

**Data:** 2026-09-10
**Branch:** `docs/corrige-governanca-duplicada` (criada a partir de `origin/main`)
**Responsável:** Claude (a pedido de Joaquim), a partir de relato de outra IA sobre o mesmo repositório.

## Objetivo

Validar um relato recebido de outra sessão de IA sobre a governança aplicada
ao repositório pelo PR #22, e corrigir a pendência apontada por esse relato
(bloco de governança duplicado no `AGENTS.md`).

## Verificação feita (não presumida)

- Acessado `https://github.com/IgrejasWebOS-System/portal-teologico-os/pull/22`
  diretamente no navegador — confirmado: mergeado em `main`, commit `38f1d86`,
  autor `IgrejasWebOS-System`, branch de origem `codex/governanca-universal`
  (já apagada).
- Conferida a aba "Files changed" do PR #22 — confirmado que o diff já chega
  com o bloco de governança duplicado (linhas 1–41 idênticas às linhas 42–82
  do novo `AGENTS.md`), antes mesmo do merge. Não foi um erro de merge, foi
  um erro de conteúdo do próprio PR.
- Buscado por branches contendo "codex" no repositório remoto
  (`/branches/all?query=codex`) — nenhuma encontrada. A branch
  `codex/corrige-governanca-duplicada`, citada no relato como já corrigida
  localmente em outra máquina, nunca foi publicada.
- Conferido que os dois checkouts locais desta máquina
  (`C:\Projetos\portal-teologico-os` e `C:\Projetos\portal-teologico-os-staging`)
  estavam desatualizados em relação a `main` até este procedimento (ainda no
  `AGENTS.md` anterior ao PR #22).

## Ações executadas

1. `git pull` em `C:\Projetos\portal-teologico-os` (produção) — apenas
   sincronização local, sem alterar nada remoto.
2. `git fetch origin` + `git merge origin/main` em
   `C:\Projetos\portal-teologico-os-staging`, trazendo `main` para dentro da
   branch de trabalho existente (`fix/ficha-rapida-reenvio-email`).
3. `git checkout -b docs/corrige-governanca-duplicada origin/main` — branch
   nova, isolada, só para esta correção documental.
4. Removido o bloco duplicado do `AGENTS.md` (mantida uma única cópia das
   seções Escopo e autoridade, Área obrigatória de trabalho, Padrão
   Action-First, M-Gates e regra ZVDT, Disciplina de desenvolvimento
   assistido por IA).
5. Registrada esta falha em `staging/governance/ERROS-COMUNS-IA.md`.

## Risco residual

Nenhum. Mudança exclusivamente documental, sem alteração em código,
migrations, Vercel ou Supabase. Não afeta produção até o merge do PR desta
branch.

## Estado

Aguardando `git add` / `commit` / `push` da branch `docs/corrige-governanca-duplicada`
e abertura do PR por Joaquim.
