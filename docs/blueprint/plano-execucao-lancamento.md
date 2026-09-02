# Plano de Execução — Lançamento CETADP

⚠ **Conflito de data no texto original**: título pede produção em 01/10/2026,
cronograma termina em 19/09/2026. Confirmar qual é a data real antes de travar
o cronograma abaixo (assumido 01/10 por ora, ajustável).

Formato de consulta rápida. Cada módulo: o quê / onde / validação / status.
Atualizar só o status ao concluir — não reescrever o histórico.

**Legenda**: 🔲 pendente · 🔄 em andamento · ✅ validado em localhost · 🚀 em produção

---

## 1. Admin master (seed + RBAC) — ✅
- Não existia `admin_master` — projeto já usa `admin_roles` (level 0-4, mesmo
  padrão do igrejas-web-system-os). Nada de tabela nova.
- Migration `075_seed_admin_master.sql` aplicada em produção
  (`toduvwtzklntyptcodkf`): 2 dos 5 e-mails (josias, joaquim@cetadp.teo.br)
  não eram Super-Master ainda — inseridos. Os outros 3 já eram.
- Validado via SQL: os 5 e-mails têm `admin_roles.level = 0` em produção.
- Pendente à parte (não bloqueia): confirmar login de fato de cada um em
  `/login` quando tiverem a senha em mãos — checagem de banco já garante o
  acesso, mas vale o teste humano antes do lançamento.

## 2+3+4. Ficha rápida por QR Code + foto (substituiu os 3 módulos originais) — 🔄
- ⚠ Achado: não existe import de "alunos 2026" a fazer — nem o CSV do
  sistema antigo (`SistemaAntigo/aluno_matricula.csv`, só até 2023) nem o
  portal novo (12 matrículas desde jul/2026, todas de teste) têm esses
  dados. Confirmado com o Joaquim: os alunos de 2026 vêm de **fichas de
  papel preenchidas pelos professores**, sem foto (sistema antigo não
  tinha). Financeiro desses alunos é lançado manualmente depois, à parte
  — não faz parte deste módulo.
- Construído: `/admin/matriculas/ficha-rapida` — secretaria digita só o
  essencial da ficha (nome, CPF, curso, campo/igreja) e o sistema gera
  matrícula + QR Code na hora. O aluno escaneia, abre
  `/confirmar-cadastro/[id]` (rota pública, sem login) no próprio celular,
  completa o resto (endereço, RG, mãe/pai, e-mail) e tira/anexa a foto
  (`accept="image/*"` já oferece câmera ou galeria nativamente no mobile —
  não precisou de código extra pra isso). Foto vai pro bucket `avatars`
  (mesmo já usado em Matrícula Direta/Membros). Convite de acesso ao
  portal só é enviado quando o aluno confirma o e-mail de verdade — nunca
  pro e-mail placeholder da ficha.
- Nada de migration de banco: reaproveitou `ead_alunos.status` (texto
  livre) com um valor novo (`FICHA_PENDENTE` → `ATIVO` na confirmação).
- Precisa rodar `npm install` (adicionei `qrcode` + `@types/qrcode` no
  package.json) antes do próximo `npm run dev`/`build`.
- Validação pendente (localhost): 1) criar ficha rápida em
  `/admin/matriculas/ficha-rapida`, 2) escanear o QR gerado com o celular
  (ou abrir o link direto), 3) completar o cadastro + anexar foto pelo
  celular, 4) conferir em `/admin/matriculas` que o aluno virou ATIVO e a
  foto aparece.
- Fora de escopo (confirmado): pagamento desses alunos — lançamento
  manual depois, direto na ficha do aluno (tela já existente).

## 5. Pagamento PIX — 🔲
- ⚠ CNPJ/agência/conta **não vão neste arquivo nem em docs/** — só em
  `.env.local` / envs do Vercel (`PIX_CNPJ`, `PIX_BANCO`, `PIX_AGENCIA`,
  `PIX_CONTA`), fora do Git.
- Endpoint `/api/pagamento/pix`, QR PIX dinâmico, atualizar status da
  matrícula na confirmação.
- Validação: 1 pagamento real de teste (valor simbólico) ponta a ponta.

## 6. Migrar sistema antigo → staging → produção — 🔲
- Origem: `C:\Projetos\CETADP\SistemaAntigo`. Destino intermediário:
  `portal-teologico-os-staging`.
- Passos: script de leitura → mapear campos → relatório de inconsistências
  → importar em staging → validar integridade → só então produção (manual).
- Validação: contagem de registros bate + amostragem de 10 registros
  conferidos campo a campo.

## 7. Auditoria de pastas diversas — 🔲
- `CETADP\Diversos`, `Identidade_Visual_CETADP`, `Matricula`, `Prova`.
- Checklist: corrompidos, duplicados, classificação por tipo → só o válido
  migra pra staging.
- Validação: relatório final de auditoria (contagem antes/depois).

## 8. Prova online — 🔲
- `/api/provas/solicitar`, UI com timer + questões + envio automático,
  respostas no Supabase, relatório pro professor.
- Validação: 1 prova completa do lado aluno + relatório aparece pro
  professor.

## 9. Correção via scanner (OCR) — 🔲
- `corrigirProvaViaScanner()`, OCR → gabarito → nota automática.
- Validação: 1 folha real fotografada com celular, nota bate com correção
  manual.

## 10. Congelamento + checklist de produção — 🔲
- Freeze de features 30 dias antes da data confirmada.
- Checklist: RLS, RBAC, auditoria de segurança, build final Vercel+Supabase
  produção, monitoramento ativo no dia da abertura.

---

## Cronograma (a recalcular quando a data-alvo for confirmada)
- Semana 1: módulo 1 ✅ + módulo 2+3+4 (ficha rápida/QR/foto)
- Semana 2: módulos 5, 7
- Semana 3: módulo 6
- Semana 4: módulos 8, 9
- Semana 5: testes finais + auditoria geral + módulo 10
- Lançamento: ⚠ confirmar 19/09 ou 01/10/2026

## Execução
- Edição de código/docs dentro das pastas já conectadas: sigo direto, sem
  pedir autorização a cada arquivo.
- Git push, deploy em produção e migration em banco de produção: sempre
  peço confirmação antes — não dá pra pré-autorizar isso de forma
  permanente (regra de segurança fixa, não é configurável).
- Pra processar módulo a módulo sem parar pra confirmar cada um: basta
  dizer "segue" — processo, valido em localhost, atualizo o status aqui, e
  já entro no próximo.
