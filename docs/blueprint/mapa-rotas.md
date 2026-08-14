# Mapa de rotas

Ver `blueprint/modulos.md` para o que cada área faz. Este documento é só o mapa
de URLs, por camada.

## Público (sem login)

| Rota | Descrição |
|---|---|
| `/` | Home institucional |
| `/sobre` | Sobre o CETADP |
| `/biblioteca` | Biblioteca |
| `/loja` | Loja pública |
| `/inscricao` | Inscrição pública em curso |
| `/certificados` | Validação pública de certificado |
| `/login`, `/cadastro` | Autenticação |

## Aluno (logado, não-staff)

| Rota | Descrição |
|---|---|
| `/portal` | Hub — 6 módulos fixos |
| `/escola` | Escola de Teologia |
| `/cursos` | Cursos & Preparatórios |
| `/ebd` | Escola Bíblica Dominical |
| `/provas` | Provas |
| `/portal/nova-matricula` | Nova matrícula (auto-serviço) |
| `/portal/avaliacoes` | Simulados e provas |
| `/portal/certificados` | Meus certificados |

## Admin (staff/secretaria)

| Rota | Descrição |
|---|---|
| `/admin` | Dashboard geral |
| `/admin/matriculas` | Matrículas |
| `/admin/financeiro` | Financeiro (+ `/caixa`, `/plano-de-contas`, `/contas-a-pagar`, `/contas-a-receber`) |
| `/admin/ebd` | Gestão de EBD (trimestres/lições) |
| `/admin/certificados` | Emissão de certificados |
| `/admin/conteudo` | Biblioteca (cursos/aulas), + `/trilhas`, `/nova` |
| `/admin/faq` | FAQ |
| `/admin/loja` | Admin da loja (+ `/pedidos`, `/produtos`, `/leads-loja`) |
| `/admin/patrimonio` | Patrimônio/Inventário |
| `/admin/inscricoes` | Aprovação de inscrições |

## Igreja / Configurações

| Rota | Descrição |
|---|---|
| `/dashboard` | Dashboard da igreja |
| `/dashboard/configuracoes` | Hub de configurações |
| `/dashboard/configuracoes/acessos` | Administração de acessos (+ `/usuarios`, `/campos`, `/sedes`, `/lideres-setor`) |
| `/dashboard/configuracoes/membrasia` | Membrasia |
| `/dashboard/configuracoes/persona` | Persona (professor/aluno/turmas) |
| `/dashboard/configuracoes/ministerio-setores-igrejas` | Ministério·Setores·Igrejas |
| `/dashboard/configuracoes/complementos` | Tabelas auxiliares |
| `/dashboard/ocorrencias` | Ocorrências |

## Infraestrutura por trás de tudo isso

```
Supabase (1 banco único: Auth + Postgres + Storage)
        ↓
GitHub (push em main)
        ↓
Vercel (deploy automático em Produção)
```
