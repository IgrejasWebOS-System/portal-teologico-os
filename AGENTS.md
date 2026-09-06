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

# Ambientes — produção vs staging (regra fixa a partir de 14/08/2026)

| Ambiente | Pasta local | Branch git | Supabase | Deploy |
|---|---|---|---|---|
| Produção | `C:\Projetos\portal-teologico-os` | `main` | projeto principal (`toduvwtzklntyptcodkf`) | Vercel Production — dispara automático em push/merge na `main` |
| Staging/dev | `C:\Projetos\portal-teologico-os-staging` | qualquer branch que não seja `main` | branch Supabase `staging` (criada a partir do projeto principal) | Vercel Preview — dispara automático em push de qualquer branch |

## Fluxo obrigatório para qualquer mudança de código ou de banco

1. Trabalhar sempre na pasta staging (`portal-teologico-os-staging`), nunca editar direto na pasta de produção.
2. Validar local primeiro — `npm run dev`, conferir em `http://localhost:3000` que compila e funciona.
3. Commit + push numa branch nova, nunca direto em `main`.
4. O push gera Vercel Preview automático — validar lá antes de seguir.
5. Mudança em `supabase/migrations/` — testar primeiro contra a branch Supabase `staging`, nunca contra o projeto de produção diretamente.
6. Só depois de validado (local + preview + staging do banco), fazer merge em `main` — esse é o único gatilho que deve tocar produção de verdade.

Essa regra vale para qualquer trabalho no projeto a partir desta data — inclusive para mim (Claude), que devo seguir esse fluxo por padrão em toda tarefa futura, sem precisar ser lembrado.

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

## Outras regras fixas de comunicação

- Nunca fabricar dado ou resultado — sempre verificar o estado real
  (banco, build, terminal) antes de reportar algo como certo ou resolvido.
- Toda comunicação com o Joaquim em português do Brasil.
- Antes de rodar qualquer comando com efeito importante, avisar primeiro e
  só depois passar o comando ("aviso antes, comando depois").
