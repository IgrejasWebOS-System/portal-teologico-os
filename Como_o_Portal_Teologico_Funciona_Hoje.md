# Como o Portal Teológico (CETADP) funciona hoje

Documento de referência — retrato do sistema **como ele está implementado agora** no banco de staging (`portal-teologico-os-staging`), levantado direto do schema real, das políticas de segurança (RLS) e do código das rotas. Não é uma proposta — é um raio-x do estado atual, incluindo as inconsistências que ainda existem.

---

## 1. Visão geral

O Portal Teológico é o sistema do CETADP (Centro Educacional Teológico Assembleias de Deus Piracicaba) pra inscrição, matrícula e acompanhamento de alunos de cursos teológicos — presenciais e a distância. Ele é usado por três tipos de pessoa:

- **Público em geral** — se inscreve num curso pelo site, sem precisar de conta.
- **Secretaria (staff)** — cadastra, confirma e acompanha matrículas pelo painel administrativo.
- **Aluno** — depois de matriculado, acessa o Portal do Aluno pra acompanhar o curso.

## 2. Ambientes

| Ambiente | Pasta local | Projeto Supabase | Uso |
|---|---|---|---|
| Produção | `portal-teologico-os` | `toduvwtzklntyptcodkf` | O que o público e a secretaria usam de verdade |
| Staging | `portal-teologico-os-staging` | `cjxdroyyplpknygtcdgr` (branch) | Onde tudo é desenvolvido e testado antes de ir pra produção |

Regra fixa: **todo desenvolvimento acontece primeiro no staging**, testado em `localhost`, e só depois vai pra produção via Pull Request no GitHub (protegido — precisa passar por PR, não dá pra subir direto no `main`). Isso está documentado em `AGENTS.md` e `Governanca_Global_ConnectionCyberOS.md`, dentro da própria pasta do projeto.

## 3. Os três caminhos pra alguém virar aluno matriculado

```
┌─────────────────────┐   ┌──────────────────────────┐   ┌─────────────────────────┐
│  A) Inscrição        │   │  B) Ficha Rápida          │   │  C) Matrícula Direta     │
│  pública (/inscricao)│   │  (QR Code, papel→digital) │   │  (secretaria, tudo na    │
│  sem login           │   │                            │   │  hora, presencial)       │
└─────────┬────────────┘   └───────────┬────────────────┘   └────────────┬─────────────┘
          │                            │                                 │
          ▼                            ▼                                 ▼
   ead_inscricoes              ead_alunos (status                ead_alunos (status
   (PENDENTE)                  FICHA_PENDENTE) +                 ATIVO, tudo já
          │                    ead_matriculas                    preenchido de uma vez)
          ▼                    (EM_ANDAMENTO)                            │
   Secretaria aprova                    │                                 │
   em /admin/inscricoes                 ▼                                 │
          │                    Aluno escaneia o QR Code /                │
          ▼                    abre o link sozinho no celular            │
   ead_alunos (ATIVO) +        → /confirmar-cadastro/[id]                │
   ead_matriculas                       │                                 │
   (sem turma/professor                 ▼                                 │
    definidos ainda)           Preenche endereço, RG, foto,               │
                                assinatura (opcional) → gera               │
                                PDF da matrícula automaticamente           │
                                        │                                 │
                                        └────────────┬────────────────────┘
                                                     ▼
                                     Convite de acesso ao Portal do Aluno
                                     (e-mail, via Supabase Auth)
```

**A) Inscrição pública** (`/inscricao`) — sem pagamento nem turma/professor definidos ainda; a secretaria aprova depois em `/admin/inscricoes`.

**B) Ficha Rápida** (`/admin/matriculas/ficha-rapida`) — a secretaria digita só o mínimo (nome, CPF, telefone, curso, turma, professor) a partir de uma ficha de papel, gera um QR Code, e o próprio aluno completa o resto (endereço, RG, foto, assinatura eletrônica opcional) pelo celular, na tela `/confirmar-cadastro/[id]`. É nesse momento que o PDF da matrícula é gerado.

**C) Matrícula Direta** (`/admin/matriculas/nova`) — a secretaria preenche tudo de uma vez, incluindo forma de pagamento (se houver cobrança). Pensado pra atendimento presencial onde o pagamento já foi resolvido na hora. **Esse fluxo ainda não gera PDF** — só os fluxos A/B geram, hoje.

Depois de qualquer um dos três, existe agora uma quarta tela: **Editar Matrícula** (`/admin/matriculas/[id]`), pra corrigir dados, trocar turma/professor, lançar pagamento retroativo (regularização) ou cancelar.

## 4. Quem pode ver o quê — e aqui está o ponto que gerou confusão

Existem **dois sistemas de permissão diferentes**, que hoje convivem sem estar totalmente integrados. Isso não é proposta — é o estado real do banco:

### 4.1 — Sistema simples: `profiles.system_role`

Cada pessoa da secretaria tem um `system_role` na tabela `profiles`: `GLOBAL_ADMIN`, `SECTOR_ADMIN` ou `LOCAL_ADMIN`. A função `checkIsStaff()` usa só isso pra decidir "essa pessoa pode entrar no `/admin`?" — sim ou não, sem distinguir setor/igreja.

Hoje, as políticas de segurança (RLS) de `ead_matriculas` usam **só** esse sistema: se você é `GLOBAL_ADMIN`, `SECTOR_ADMIN` ou `LOCAL_ADMIN`, você vê **todas** as matrículas, de qualquer setor ou igreja. O nome do cargo sugere um recorte por setor/igreja, mas isso **não está implementado** em `ead_matriculas`.

### 4.2 — Sistema hierárquico: `admin_roles` + `units`

Existe um segundo sistema, mais sofisticado, usado só em `ead_alunos`:

- `units` é uma árvore (cada unidade tem um `parent_id`, apontando pra unidade "mãe" — sede → setor → igreja).
- `admin_roles` associa uma pessoa (`user_id`) a um `unit_id` e um `level` (0 = enxerga tudo, sem restrição).
- A função `get_accessible_unit_ids()` percorre essa árvore e devolve todas as unidades que aquela pessoa pode acessar (a própria unidade + tudo abaixo dela).
- A política de `ead_alunos` usa essa função: você só vê alunos cujo `unit_id` esteja dentro do que `get_accessible_unit_ids()` devolveu (ou seja `GLOBAL_ADMIN`, ou nível 0).

**As colunas `legacy_church_id` e `legacy_sector_id` dentro de `units`** mostram que essa árvore é uma unificação recente das antigas tabelas `churches`/`sectors` — ainda em transição.

### 4.3 — O que isso significa na prática, hoje

| Tabela | Quem decide quem vê o quê | Recorte por setor/igreja funciona? |
|---|---|---|
| `ead_alunos` | `admin_roles` + `units` (árvore) | **Sim** |
| `ead_matriculas` | só `profiles.system_role` | **Não** — todo staff vê tudo |

Ou seja: hoje, um `SECTOR_ADMIN` já não vê alunos de fora do seu setor (via `ead_alunos`), mas **vê matrículas de qualquer setor** (via `ead_matriculas`), porque essa segunda tabela não herda a mesma regra. Essa é uma inconsistência real, não uma opinião — confirmei lendo a definição das duas políticas de RLS.

### 4.4 — "Ministério" — dois sentidos diferentes, nenhum isola dado

- `campo_ministerio_id`/`campo_ministerio_nome` (em `ead_alunos`) é um **rótulo escolhido pelo aluno** (ex.: "Louvor", "Missões") — só descritivo, nenhuma política de segurança usa esse campo.
- `ministry_id` (coluna solta em `churches`) referencia uma tabela `ministries` que **não existe** neste banco — é uma FK órfã, provavelmente herdada de outro projeto (`igrejas-web-system-os`, que usa `ministry_id` como fronteira real de multi-tenant). Aqui ela está sem uso.

## 5. Estrutura de dados — as tabelas que mais importam no dia a dia

| Tabela | Papel |
|---|---|
| `ead_inscricoes` | Inscrições públicas, antes de virarem matrícula |
| `ead_alunos` | Um registro por pessoa — dados pessoais completos |
| `ead_matriculas` | Um registro por vínculo aluno↔curso (pode ter mais de uma por aluno, cursos diferentes) |
| `course_editions` | As "turmas" de um curso (ex.: "Edição 2026") |
| `professores` | Cadastro de professores — hoje é só referência, **sem login próprio** |
| `sectors` / `churches` | Estrutura antiga (setor → igreja) |
| `units` | Estrutura nova, em unificação, com `admin_roles` |
| `fin_contas_receber` | Cobranças/parcelas de matrícula — pendentes, pagas, atrasadas |
| `assinaturas` / `matriculas-pdf` (Storage) | Assinatura eletrônica (PNG) e PDF final da matrícula, ambos em buckets privados |

## 6. PDF da matrícula e assinatura eletrônica

Gerado automaticamente ao final do fluxo B (Ficha Rápida → Confirmar Cadastro), usando `pdf-lib` (sem depender de navegador/Chromium — roda direto no servidor). Traz: foto do aluno, dados pessoais, curso/turma/professor, endereço, pagamento (quando existir) e a assinatura eletrônica desenhada pelo aluno (opcional), com IP/data/hora como evidência. Baixável pela secretaria em `/admin/matriculas` a qualquer momento (link temporário, gerado na hora — o PDF fica num bucket privado).

## 7. Pontos em aberto (conhecidos, ainda não resolvidos)

1. `ead_matriculas` não tem o mesmo recorte por setor/igreja que `ead_alunos` já tem — todo staff vê todas as matrículas.
2. Não existe busca por nome/CPF na listagem de Matrículas.
3. Professores não têm login — não acessam o sistema, são só um cadastro de referência.
4. "Ministério" não tem um significado único nem fronteira de acesso real — precisa ser definido antes de qualquer isolamento por ele.
5. Matrícula Direta (fluxo C) não gera PDF ainda.
6. Ainda convivem dois sistemas de papel/permissão (`profiles.system_role` e `admin_roles`+`units`) sem estarem totalmente integrados — resultado de uma unificação em andamento.

---

*Levantado em 05/09/2026, direto do banco de staging — nenhuma alteração de código, banco ou RLS foi feita pra produzir este documento.*
