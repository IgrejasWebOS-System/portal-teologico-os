# Portal Teológico OS — Governança para Agentes de IA

## Escopo e autoridade

- Este arquivo governa todo o repositório a partir da raiz.
- Instruções do usuário e regras de segurança da plataforma têm precedência.
- Um `AGENTS.md` em subdiretório pode estabelecer regras mais específicas apenas dentro de seu escopo.
- A política detalhada está em `staging/governance/GOVERNANCA-IA-E-DESENVOLVIMENTO.md`.
- Memória de IA é auxiliar; Git, código, migrations, documentação versionada e evidências são as fontes de verdade.

## Área obrigatória de trabalho

- Use `staging/` para análises, planos, decisões, evidências e documentação de desenvolvimento ou governança em elaboração.
- Edite código nos diretórios canônicos (`src/`, `supabase/` e equivalentes); não copie código de produção para `staging/`.
- Trabalhe na pasta/branch de staging definida neste arquivo e nunca diretamente na pasta ou branch de produção.
- Nunca registre segredos, tokens, credenciais, chaves, dados pessoais desnecessários ou conteúdo de `.env` na documentação.

## Ambientes — produção vs staging (regra fixa a partir de 14/08/2026)

Movida pra cá em 12/09/2026 (estava só lá pela metade do arquivo — o que
já causou uma vez código novo ser escrito por engano na pasta de
produção porque essa tabela não foi lida antes de começar o trabalho.
Ver `staging/governance/ERROS-COMUNS-IA.md`).

| Ambiente | Pasta local | Branch git | Supabase | Deploy |
|---|---|---|---|---|
| Produção | `C:\Projetos\portal-teologico-os` | `main` | projeto principal (`toduvwtzklntyptcodkf`) | Vercel Production — dispara automático em push/merge na `main` |
| Staging/dev | `C:\Projetos\portal-teologico-os-staging` | qualquer branch que não seja `main` | branch Supabase `staging` (criada a partir do projeto principal) | Vercel Preview — dispara automático em push de qualquer branch |

### Fluxo obrigatório para qualquer mudança de código ou de banco

1. Trabalhar sempre na pasta staging (`portal-teologico-os-staging`), nunca editar direto na pasta de produção.
2. Validar local primeiro — `npm run dev`, conferir em `http://localhost:3000` que compila e funciona.
3. Commit + push numa branch nova, nunca direto em `main`.
4. O push gera Vercel Preview automático — validar lá antes de seguir.
5. Mudança em `supabase/migrations/` — testar primeiro contra a branch Supabase `staging`, nunca contra o projeto de produção diretamente. Antes de numerar uma migration nova, conferir o maior número já existente em `supabase/migrations/` NESTA pasta (staging) — não confiar em memória de sessão anterior.
6. Só depois de validado (local + preview + staging do banco), fazer merge em `main` — esse é o único gatilho que deve tocar produção de verdade.

Essa regra vale para qualquer trabalho no projeto a partir desta data — inclusive para mim (Claude), que devo seguir esse fluxo por padrão em toda tarefa futura, sem precisar ser lembrado.

**Reforço de 23/09/2026 (decisão do Joaquim, ver `staging/governance/ERROS-COMUNS-IA.md`):**
nenhuma mudança de código ou banco vai direto pra produção, nem em caráter de urgência/hotfix — nem um
`UPDATE`/`DELETE`/`ALTER` avulso colado no SQL Editor de produção, mesmo que pareça pequeno ou reversível.
Toda mudança de banco em produção passa por uma migration numerada em `supabase/migrations/`, testada antes
em staging. Sequência sempre: implementar → testar local → validar (Preview + Supabase staging) →
**documentar** (este arquivo, `staging/governance/` ou `staging/evidence/`, conforme o caso) → commit + push →
só então replicar em produção. Se um bug em produção parecer urgente, resolvo em staging primeiro e sigo essa
sequência mesmo assim — "urgente" não é motivo pra pular etapa.

## Padrão Action-First

- Comece cada resposta com a próxima ação executável, um caminho, uma função, um comando ou um snippet.
- Use listas numeradas de no máximo 5 itens por bloco; cada item deve representar uma ação isolada.
- Informe estimativas em minutos inteiros e exiba `Estado: X/Y ações concluídas — <situação>`.
- Elimine preâmbulos e encerramentos vazios, preservando justificativas necessárias para segurança, risco e arquitetura.

## M-Gates e regra ZVDT

- **M0 — Entrada:** objetivo, escopo, riscos, ação imediata e critérios de aceite definidos.
- **M1 — Estrutura:** arquitetura, dependências, migrations, contratos e plano de rollback revisados.
- **M2 — Execução:** alteração implementada e validada com testes proporcionais ao risco.
- **M3 — Conformidade:** evidências, decisões e pendências registradas em `staging/`.
- **M4 — Liberação:** somente liberar com vulnerabilidades Críticas/Altas conhecidas = 0, segredos expostos = 0, controles obrigatórios = 100%, dívida Crítica/Alta vencida = 0 e crescimento líquido de dívida técnica <= 0.
- Vulnerabilidade Crítica não admite exceção em produção. Exceção emergencial para vulnerabilidade Alta exige justificativa, impacto, controle compensatório verificável, responsável, prazo, aprovação e bloqueio após vencimento.

## Disciplina de desenvolvimento assistido por IA

- Faça commits atômicos somente após uma pequena entrega validada; não misture objetivos independentes.
- Priorize integração e E2E nos fluxos do usuário, complementando com testes unitários, contrato, autorização/RLS e segurança conforme o risco.
- Organize o código em módulos coesos, contratos explícitos e responsabilidades únicas.
- Registre falhas repetitivas da IA em `staging/governance/ERROS-COMUNS-IA.md`.
- Após 3 tentativas malsucedidas, interrompa e diagnostique. Reverta apenas mudanças da tentativa; `git reset --hard` e `git clean` exigem autorização explícita e checkpoint recuperável.

<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# RLS — regra obrigatória: nunca auto-referenciar a mesma tabela

Uma policy de RLS em `public.profiles` que consulta `public.profiles` dentro
dela mesma (ex: `exists (select 1 from profiles where id = auth.uid() and
system_role = ...)`) derruba a tabela inteira com `infinite recursion
detected in policy for relation "profiles"` — e isso quebra qualquer rota
que toque `profiles` (login, checagem de staff, etc.), local e em produção
ao mesmo tempo, sem nenhum erro de `tsc` ou de deploy pra avisar. Já
aconteceu uma vez neste projeto (migrations 048/049, corrigido em 050).

**Regra:** toda vez que uma policy de RLS precisar checar uma condição na
própria tabela em que a policy está (ex: "só GLOBAL_ADMIN pode ver todos os
perfis" numa policy de `profiles`), usar uma função `SECURITY DEFINER` como
intermediária, nunca uma subquery direta na mesma tabela:

```sql
create or replace function public.current_system_role()
returns text
language sql
security definer
set search_path = public
stable
as $$
  select system_role from public.profiles where id = auth.uid();
$$;

create policy "profiles_select_staff" on public.profiles
for select to authenticated
using (public.current_system_role() = any (array['GLOBAL_ADMIN','SECTOR_ADMIN','LOCAL_ADMIN']));
```

**Antes de considerar qualquer migração de RLS "pronta"**, testar de verdade
simulando um usuário autenticado (não só rodar a query como service role,
que ignora RLS):

```sql
begin;
set local role authenticated;
set local request.jwt.claims = '{"sub":"<uuid-de-um-usuario-real>","role":"authenticated"}';
select ...; -- a query que a policy deveria proteger
rollback;
```

`npx tsc --noEmit` não pega esse tipo de erro — é um bug de SQL/Postgres,
não de TypeScript. Rodar apenas o tsc como critério de "pronto" não é
suficiente quando a mudança envolve RLS.

> A tabela de ambientes (produção vs staging) e o fluxo obrigatório de
> mudança de código/banco estão na seção "Ambientes — produção vs
> staging", logo no início deste arquivo (depois de "Área obrigatória de
> trabalho") — não duplicada aqui de propósito, pra evitar as duas cópias
> divergirem com o tempo.

## Como avisar sobre um PR pronto

Depois do `git push` de uma branch nova, mandar direto o link
`https://github.com/IgrejasWebOS-System/portal-teologico-os/pull/new/<nome-da-branch>`
(ou o link que o próprio `git push` devolve), já acompanhado de um título e
uma descrição sugeridos para o PR (resumindo o que mudou nos commits dessa
branch), prontos pra colar nos campos "Add a title"/"Add a description" que
o GitHub abre nessa tela. Não repetir a explicação do fluxo (abrir →
conferir Preview → merge) a cada vez — isso já está documentado aqui em
cima, só o link + título + descrição são necessários.

Motivo de eu não abrir o PR sozinho: não tenho uma ferramenta do GitHub
conectada nesta sessão para criar o PR via API, e mesmo que tivesse, abrir
("publicar") um PR é uma ação que exige minha confirmação com o usuário a
cada vez, por regra de segurança — então o fluxo real é: eu preencho tudo
que dá pra preencher (link + título + descrição), e o clique final em
"Create pull request" é sempre do Joaquim.

## Proteção de branch (desde 04/09/2026)

A branch `main` deste repositório tem "Require a pull request before
merging" habilitado nas configurações do GitHub (sem aprovação obrigatória
— ver decisão abaixo). Push direto na `main` é recusado pelo próprio
GitHub. Isso é a rede de segurança técnica do fluxo acima: só formaliza via
Pull Request o que já era a regra, sem adicionar espera manual (não exige
"Require approvals", porque o autor do PR não pode aprovar o próprio PR no
GitHub — isso travaria o merge esperando alguém além do Joaquim clicar em
"Approve", o que não faz sentido num projeto onde ele é o único revisor).

## Convenção de mensagens de commit

Commits seguem Conventional Commits: `tipo(escopo): descrição curta`, com
`tipo` em `feat|fix|chore|docs|refactor|test|style`. Exemplo:
`fix(matriculas): corrige perda de dados ao exibir erro no formulário`.
Isso mantém o `git log` pesquisável e funcionando como registro de
auditoria — não existe (nem deve ser criado) um arquivo de log separado
pra isso; o histórico do git já é a fonte da verdade.

## Conferir um deploy (sob pedido, não automático)

Quando o Joaquim pedir para conferir um deploy, checar: status e logs de
build no Vercel (deployment, build logs, runtime errors) e advisors/logs
de erro no Supabase do ambiente correspondente (produção ou branch
staging). Não existe checagem agendada automática — só quando solicitado
explicitamente.

## Atualizar este arquivo faz parte da entrega, não é passo à parte

Sempre que uma mudança desta sessão criar ou alterar uma convenção, um
padrão de código, uma regra de ambiente/segurança, ou qualquer decisão que
uma sessão futura precisaria saber pra não repetir um erro já corrigido
(ex: um campo que passou a ser obrigatório, uma ordem de exibição
definida, um fluxo de e-mail/convite que mudou), a atualização deste
`AGENTS.md` (ou do arquivo de governança específico em `staging/`, quando
o `AGENTS.md` só referencia) entra na mesma entrega — no mesmo commit/PR,
não num pedido separado depois. Não esperar o Joaquim pedir "atualiza o
AGENTS.md" pra isso acontecer; é parte padrão de "terminar a tarefa".

Mudança pontual de UI/texto/estilo sem nenhum padrão novo por trás não
precisa virar entrada aqui — só o que muda a forma de trabalhar ou evita
um erro repetido.

## Zerar staging agora zera literalmente tudo (professor/turma inclusos)

Revogada a regra de 06/09/2026 que mandava preservar `professores` e
`course_editions` (turma) ao rodar o reset de staging. Motivo: o Joaquim
precisa testar o fluxo de `/cadastro-professor` do zero, com o banco
totalmente vazio, sem nenhuma conta de professor/turma sobrando de rodadas
anteriores.

A partir de 26/09/2026, "zerar staging" (`scripts/zerar-staging.mjs`, ou o
SQL equivalente) apaga, nesta ordem (filhos antes dos pais):
`fin_contas_receber`, `fin_contas_pagar`, `fin_lancamentos`,
`fin_caixa_diario`, `ead_matriculas`, `ead_alunos`, `professor_turmas`,
`professores` — e por fim todo `auth.users` exceto contas
`GLOBAL_ADMIN` (login de staff). Não recria mais nada automaticamente
(nem "Marcelo Teste", nem "Edição 2026", nem `alunobasico`/`alunomedio`)
— o próprio Joaquim recria testando os fluxos públicos
(`/cadastro-professor`, `/inscricao`, mutirão) do zero.

Se uma sessão futura receber um pedido de "zerar staging" e encontrar
menção à regra antiga (preservar professor/turma) em algum lugar não
atualizado, esta seção aqui é a versão vigente — a de 06/09 está revogada.

## Máscara de telefone — utilitário único, não duplicar

Até 25/09/2026 a função `maskPhone` (formatação `(00) 00000-0000`) estava
colada, idêntica, em 11 arquivos diferentes — e um formulário novo
(`ProfessorNovaMatriculaForm.tsx`) chegou a ser criado com o campo
Telefone SEM nenhuma máscara, porque não havia um lugar óbvio de onde
importar. Isso foi corrigido: agora existe `src/utils/maskPhone.ts`, e
**todo campo de telefone deve importar `maskPhone` de lá** — nunca
redeclarar a função localmente de novo.

A versão atual também aceita formato internacional: sem "+" formata como
sempre (`(11) 96742-8655`, compatível com todo dado já digitado); com "+"
reconhece o Brasil (`+55 11 9 6742-8655`) e agrupa outros países de forma
genérica. Isso existe porque o sistema vai abrir acesso a igrejas de
outros países. Não é uma biblioteca de validação por país (tipo
`libphonenumber-js`, que não está instalada) — é só formatação visual;
trocar por uma lib de verdade é uma melhoria futura, não urgente.

## Outras regras fixas de comunicação

- Nunca fabricar dado ou resultado — sempre verificar o estado real
  (banco, build, terminal) antes de reportar algo como certo ou resolvido.
- Toda comunicação com o Joaquim em português do Brasil.
- Antes de rodar qualquer comando com efeito importante, avisar primeiro e
  só depois passar o comando ("aviso antes, comando depois").
