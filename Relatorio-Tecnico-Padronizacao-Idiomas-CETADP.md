# Relatório Técnico — Padronização de Idiomas (pt-BR / en-US / es-419)
### Portal CETADP — Sistema `portal-teologico-os`

**Data:** 17/08/2026
**Autor:** Documentação técnica gerada com apoio de Claude (Anthropic), a pedido de Joaquim Coelho

---

## 1. Objetivo deste documento

Este relatório explica o porquê e o como da implementação de suporte a 3 idiomas (Português, Inglês e Espanhol) no Portal CETADP. Complementa o `Cronograma-Implementacao-i18n-CETADP.md` (que trata do prazo e das fases) com o raciocínio técnico por trás das decisões de arquitetura, os problemas reais encontrados durante a implementação e como foram resolvidos.

## 2. Contexto — por que o sistema precisa de 3 idiomas

O Portal CETADP deixou de atender só membros da igreja em Piracicaba-SP: passou a ser acessado por pessoas de outros países, que preferem se cadastrar, estudar e navegar em inglês ou espanhol. A diretoria do CETADP decidiu liberar esse recurso aos usuários a partir de 01/09/2026, o que definiu a meta técnica de ter tudo pronto e testado até 31/08/2026.

Dois pontos guiaram as decisões técnicas desde o início:

- **pt-BR não pode quebrar nem mudar de endereço.** É o idioma de praticamente todos os usuários atuais — nenhuma URL existente podia ser afetada pela adição dos outros dois idiomas.
- **O sistema tem uma camada de autenticação e controle de acesso sensível** (5 níveis hierárquicos, RLS no banco). Qualquer mudança de roteamento precisava ser testada com o mesmo rigor de uma mudança de segurança, não só de tradução visual.

## 3. Decisões técnicas de arquitetura

| Decisão | Escolha | Motivo |
|---|---|---|
| Biblioteca de i18n | `next-intl` | Integração nativa com o App Router do Next.js 16, tipagem forte de chaves de tradução (erro de chave errada vira erro de `tsc`, não texto quebrado em produção) |
| Estrutura de URL | `pt-BR` sem prefixo (`/login`), `en-US` e `es-419` com prefixo (`/en-US/login`, `/es-419/login`) | Preserva 100% das URLs atuais em português — o requisito inegociável do item 2 |
| Organização de conteúdo | Um arquivo JSON por idioma, por módulo (`common`, `home`, `auth`, e futuramente `academy`, `financeiro`, `secretaria`, `admin`, `ebd`) | Evita carregar um dicionário gigante numa página simples; cada módulo entra conforme é traduzido |
| Preferência de idioma do usuário logado | Coluna `locale` em `profiles`, sincronizada com o cookie no login | Usuário logado não perde o idioma escolhido entre sessões |
| Detecção automática de idioma | **Desligada** (`localeDetection: false`) | Ver item 4 — detecção automática por cookie/navegador causou um bug real e foi desativada de propósito |

A implementação seguiu 4 fases: infraestrutura técnica (Fase 0), home e páginas públicas (Fase 1), sistema autenticado por módulo (Fase 2) e QA/merge final (Fases 3–4), detalhadas no cronograma.

## 4. Problemas reais encontrados e como foram resolvidos

A implementação não foi só tradução de texto — três problemas técnicos genuínos apareceram durante os testes e cada um exigiu uma correção específica:

**a) Idioma "vazando" para o endereço sem prefixo.** Ao visitar `/en-US` ou `/es-419`, o `next-intl` grava um cookie de idioma por padrão. Esse cookie passou a valer também para o endereço sem prefixo (`/`, `/login`), fazendo o site em português "sumir" depois da primeira visita a outro idioma — quem abrisse `/login` via digitação direta às vezes caía em inglês, às vezes em espanhol, nunca mais em português. Corrigido desligando a detecção automática (`localeDetection: false`): o endereço sem prefixo agora é sempre português, independente de cookie ou idioma do navegador; só a troca explícita (futuro seletor de idioma) deve mudar o idioma.

**b) Tradução não funciona dentro de páginas assíncronas do servidor.** O hook `useTranslations` do `next-intl` não pode ser usado dentro de componentes de servidor `async` (página de login, cadastro e recuperação de senha usam `async` para ler parâmetros de busca) — gera erro em tempo de execução, não detectado pelo `tsc`. Corrigido trocando para a versão assíncrona equivalente (`getTranslations`) nessas três páginas específicas.

**c) Idioma se perdendo dentro de ações de formulário (login, cadastro, recuperar senha).** A forma padrão de descobrir o idioma atual dentro de uma Server Action (`getLocale()`) não é confiável nesse contexto — não é a mesma coisa que renderizar uma página. Isso causava um erro genérico do Next.js ao submeter o formulário de login. Corrigido passando o idioma por um campo oculto no próprio formulário, preenchido com o parâmetro de rota da página (sempre correto), em vez de tentar redescobrir o idioma dentro da ação.

Os três problemas tinham a mesma causa raiz: comportamento automático do `next-intl` que funciona bem no caminho mais comum (renderização de página), mas exige tratamento explícito em dois pontos mais sensíveis do sistema — o middleware de autenticação e as ações de formulário de login/cadastro/senha.

## 5. Conteúdo bíblico — cuidado adicional de licenciamento

O versículo institucional exibido no cabeçalho do site (2 Pedro 3:18) usa a tradução Almeida Revista e Corrigida (ARC, 2009), com uso autorizado pela Sociedade Bíblica do Brasil sob um número de licença específico. Essa autorização cobre o texto em português — **não** cobre automaticamente citar outra tradução bíblica com direitos autorais em inglês ou espanhol. Para os outros dois idiomas, foram usadas traduções de domínio público (King James Version em inglês, Reina-Valera 1909 em espanhol), evitando qualquer exposição a direitos autorais não licenciados. Por decisão do CETADP, o site hoje mostra apenas o texto do versículo, sem a citação de versão/editora, mantendo o registro completo da autorização apenas como documentação interna.

## 6. Situação atual (17/08/2026)

- **Fase 0 (infraestrutura)** — concluída e já mesclada em `main`.
- **Fase 1 (home + páginas públicas)** — em andamento. Home, cabeçalho, rodapé, login, cadastro e recuperação de senha já traduzidos e testados nos 3 idiomas; faltam inscrição, sobre, loja/carrinho e o seletor de idioma visível na interface.
- **Fases 2, 3 e 4** (sistema autenticado, QA, merge final) — ainda não iniciadas, conforme cronograma.

Todo o trabalho está sendo feito em `portal-teologico-os-staging`, seguindo o mesmo fluxo de validação descrito no `Relatorio-Tecnico-Ambiente-Staging-CETADP.md` — nada entra em produção antes de validado.
