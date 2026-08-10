# Parecer Técnico — Isolamento de Dados e Confirmação de Arquitetura (Adendo)

**Data:** 10/08/2026 · **Contexto:** adendo ao `PLANO-REESTRUTURACAO-CETADP.md` (em `C:\Projetos`), após diagnóstico adicional pedido por você sobre isolamento entre os três sistemas.

---

## 1. Confirmações que fecham as perguntas em aberto do plano anterior

- **Vercel de produção é real, ativa e testada** — não é mais um risco em aberto.
- **A conta que fez o deploy é "connectioncyberos"** — já existe, é um dado novo relevante para a decisão de nomenclatura (seção 4).
- **Dados no banco atual (`toduvwtzklntyptcodkf`): confirmados só fictícios/de teste.** Isso confirma, sem nenhuma alteração, a recomendação de arquitetura do plano anterior (seção 3.2): o banco atual vira staging oficial (zero migração, zero risco), e um projeto novo e limpo vira produção.
- **Diretório local do `portal-teologico-os`: confirmado engano de digitação** — é de fato `C:\Projetos\portal-teologico-os`. Nenhuma ação necessária.

## 2. Mapa final dos três sistemas (confirmado por você)

| Projeto | GitHub | Supabase | Diretório local | Status neste plano |
|---|---|---|---|---|
| `portal-teologico-os` | `IgrejasWebOS-System/portal-teologico-os` | `toduvwtzklntyptcodkf` | `C:\Projetos\portal-teologico-os` | **Fica** — é o piloto da reestruturação |
| `Igrejas-Web-System-OS` | `IgrejasWebOS-System/Igrejas-Web-System-OS` | `outlsupecrgsiathvhcl` | `C:\Projetos\igrejas-web-system-os` | **Sai** — isolar e preservar, sem mexer no Supabase |
| `igrejas-web-os` | `IgrejasWebOS-System/igrejas-web-os` | `swczhmhyqygpdzxwpvfo` | `C:\Projetos\Igrejas-Web-os` | **Sai** — isolar e preservar; esse Supabase está em produção real de outro sistema, não tocar |

## 3. Resultado do escaneamento de isolamento de código

Busquei `outlsupecrgsiathvhcl` e `swczhmhyqygpdzxwpvfo` em todo o código-fonte do `portal-teologico-os`. Resultado: **zero contaminação funcional.**

- 5 arquivos são documentação histórica (`README.md`, os pareceres técnicos, `ordem-tecnica-isolamento-e-migracao.md`, `auditoria-comparativa-3-projetos.md`) — fazem parte do próprio registro do isolamento já feito em 13/07/2026. Ficam como estão.
- 6 arquivos de código/migration tinham só comentário de cabeçalho documentando origem (ex.: `-- portado de swczhmhyqygpdzxwpvfo`), sem nenhuma conexão ou import funcional.
- Um item ativo precisava de limpeza: **já removi** as 3 linhas comentadas em `.env.local` que guardavam a URL/chave antiga do banco compartilhado "como referência". A variável ativa já apontava só para `toduvwtzklntyptcodkf` — era ruído, não risco funcional, mas quebrava o isolamento estrito que você pediu.

**Conclusão:** o isolamento de dados do `portal-teologico-os` já estava, na prática, completo. Faltava só essa limpeza cosmética, que já foi feita.

## 4. Achado extra: a identidade Vercel já existe

O deploy de produção foi criado pela conta **"connectioncyberos"** (sem hífens). Antes de renomear a organização do GitHub para `connection-cyber-os` (seção 3.3 do plano anterior), vale decidir se você quer usar o mesmo formato sem hífen (`connectioncyberos`) para manter as duas identidades consistentes, em vez de ter uma grafia com hífen no GitHub e outra sem hífen na Vercel.

## 5. Achado de segurança fora do escopo pedido, mas relevante

O `MERCADOPAGO_ACCESS_TOKEN` em `.env.local` está comentado como "SANDBOX/teste", mas o valor começa com o prefixo `APP_USR-` — no Mercado Pago, esse prefixo normalmente identifica uma credencial de aplicação **real**, enquanto credenciais de teste costumam começar com `TEST-`. Vale confirmar diretamente no painel do Mercado Pago (Credenciais → Teste vs. Produção) se esse token é mesmo de sandbox antes do dia 14 — se for uma credencial de produção rodando disfarçada de teste, isso é um risco maior do que qualquer item deste plano de reestruturação.

## 6. O que muda no plano anterior

Nada na arquitetura recomendada muda. As confirmações de hoje removem incerteza, não alteram direção: Fase 0 (congelamento até 14/08) e Fase 1 (reestruturação a partir de 18/08) continuam valendo como estavam. Duas adições à checklist da Fase 0: confirmar a grafia `connectioncyberos` vs. `connection-cyber-os` (seção 4) e verificar a credencial do Mercado Pago (seção 5).
