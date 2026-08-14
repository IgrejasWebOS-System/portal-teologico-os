# Módulos do sistema

O `portal-teologico-os` é um único app Next.js (App Router) com um único banco
Supabase. As "áreas" abaixo não são sistemas separados — são grupos de rotas com
controle de acesso diferente, definido por `profiles.system_role`
(`checkIsStaff`) e pela existência de matrícula oficial (`ead_alunos`).

## Público (sem login)

`/` (home institucional), `/sobre`, `/biblioteca`, `/loja`, `/inscricao`
(inscrição pública em curso), `/certificados` (validação pública de certificado),
`/login`, `/cadastro`.

## Aluno (logado, não-staff)

- `/portal` — hub com 6 módulos fixos (lista estática, não vem do banco):
  Escola de Teologia, Cursos & Preparatórios, EBD, Nova Matrícula, Simulados e
  Provas, Meus Certificados.
- `(escola)/escola` e `(cursos)/cursos` — catálogo de cursos. **Regra
  importante**: aluno com ficha oficial (`ead_alunos`/`ead_matriculas`) só vê os
  próprios cursos matriculados; quem não tem ficha de aluno (ex: conta criada
  direto no Supabase Auth, sem passar pela matrícula) vê o catálogo completo.
- `(ebd)/ebd` — Escola Bíblica Dominical, conteúdo institucional (trimestres/
  lições), não é gated por matrícula individual — qualquer logado vê tudo.
- `/provas`, `/portal/nova-matricula`, `/portal/avaliacoes`, `/portal/certificados`.

## Admin (staff/secretaria — `system_role` em `GLOBAL_ADMIN`/`SECTOR_ADMIN`/`LOCAL_ADMIN`)

`(admin)/admin` — hub administrativo: matrículas, financeiro (caixa diário, plano
de contas, contas a pagar/receber), EBD (gestão de trimestres/lições), certificados
(emissão), conteúdo (biblioteca de cursos/aulas), FAQ, loja (pedidos/produtos/
leads), patrimônio/inventário, inscrições (aprovação — hoje só necessária pra
inscrições anteriores a 16/07/2026, depois disso a matrícula é auto-habilitada).

## Igreja / Configurações (líderes — mesmo `system_role` de staff, área de gestão de estrutura)

`(igreja)/dashboard` — Configurações do Sistema: Acessos (usuários, campos,
sedes regionais, líderes de setor), Membrasia, Persona (professor/aluno/turmas),
Ministério·Setores·Igrejas, Complementos (tabelas auxiliares: estado civil,
profissões, escolaridade, regiões DF).

## Hierarquia de acesso (nível, usado no convite de operador)

| Nível | Papel |
|---|---|
| 0 | Super-Master — `GLOBAL_ADMIN`, sem unidade, acesso irrestrito a tudo |
| 1 | Master de Campo |
| 2 | Admin de Sede |
| 3 | Admin de Setor |
| 4 | Usuário Local |

Convite de novo operador: `/dashboard/configuracoes/acessos/usuarios` → card
"Convidar novo operador". Só quem já é `GLOBAL_ADMIN` pode convidar outro nível 0.
