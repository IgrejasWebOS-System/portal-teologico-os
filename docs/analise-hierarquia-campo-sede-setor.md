# Análise técnica — Hierarquia Campo → Sede → Setor → Igreja → Sub/Célula

Data: 25/07/2026 (registrado a pedido do usuário, para uso posterior — nenhum código foi gerado nesta etapa).

## O modelo solicitado

Hierarquia de acesso descrita pelo usuário (exemplo com dois campos, Piracicaba e São Paulo):

- **Holding / Super-Admin** — acesso total a todos os Campos.
- **Campo** (ex: Campo Piracicaba, Campo São Paulo) — nomenclatura/agrupamento, não é uma igreja em si. Acesso master sobre tudo do seu campo.
- **Sede** — uma igreja normal (do tipo Igreja comum) dentro do campo, mas que é "mãe" de todas as outras do campo. Acesso master à Sede + todos os Setores do campo.
- **Setor** (ex: 15 setores por campo, 7 igrejas por setor) — cada setor tem uma "Igreja Mãe do Setor", marcada por uma flag/botão (padrão `false`, ativa quando marcada) que dá a quem administra aquela igreja acesso a todas as igrejas do próprio setor.
- **Usuário-Local** — acesso restrito à própria igreja/congregação.
- Alunos podem ou não ter vínculo de igreja: aluno/igreja, aluno/internet (sem igreja), aluno/outra igreja ou ministério.
- Pergunta em aberto do usuário: um único login consegue administrar mais de um Campo ao mesmo tempo (ex: mesma pessoa gerenciando Campo Madureira e Campo São Paulo)?

## O que existe hoje no portal-teologico-os (levantado no código e no schema)

- `profiles` tem só duas colunas de escopo: `church_id` (uma única igreja por pessoa) e `system_role`, com apenas 4 valores possíveis (`GLOBAL_ADMIN`, `SECTOR_ADMIN`, `LOCAL_ADMIN`, `MEMBER`) — sem tabela de papéis com escopo, sem N:N entre usuário e igrejas/setores/campos.
- Todas as políticas de RLS de escrita que existem hoje (membros, professores, regiões, turmas, produtos, EBD, FAQ, funções etc.) tratam `GLOBAL_ADMIN`, `SECTOR_ADMIN` e `LOCAL_ADMIN` como um grupo único e equivalente — não encontrei nenhuma política que restrinja `SECTOR_ADMIN` só ao seu próprio setor, ou `LOCAL_ADMIN` só à sua própria igreja. Na prática, os três nomes têm hoje o mesmo poder (acesso a tudo), a distinção é só de nome, não de escopo real.
- Não existe conceito de "Campo" nem "Sede" como nível de permissão. `churches.is_sede` e `sectors.mother_church_id` existem como *dados* (usados na tela de "Sedes Regionais" e "Líder de Setor" em Configurações → Acessos), mas essa marcação é só informativa — hoje ela não amplia automaticamente o acesso de quem loga por aquela igreja.
- Existe uma coluna `churches.ministry_id` (e `is_headquarters`, `is_mother_church`) no schema, mas são resíduos da época em que este banco era compartilhado com o `Igrejas-Web-os` (antes da separação em 13/07/2026). Não há tabela `ministries` neste projeto isolado e nenhum código do portal-teologico-os lê ou escreve essas colunas hoje — são colunas mortas, não uma funcionalidade em uso.
- O módulo de cursos/matrícula/EAD (courses, course_editions, ead_alunos, certificados) é todo modelado para **uma única instituição dona** (CETADP) servindo várias igrejas — não existe dimensão de "Campo" nele. `ead_alunos.church_id` e `ead_alunos.sector_id` já são opcionais (nullable), então aluno sem vínculo de igreja ("aluno/internet") já é suportado estruturalmente hoje.
- Um mesmo login não pode administrar dois Campos ao mesmo tempo hoje — `profiles.church_id` é uma FK simples (uma pessoa, uma igreja). Não existe tabela de vínculo N:N usuário↔campo/setor/igreja.

## Achado mais relevante: o projeto irmão já tem esse desenho

O hierarquia descrita pelo usuário — Super-Master / Master-Campo / Admin-Sede / Admin-Setor / Usuário-Local, com `ministry_id` como chave de isolamento multi-tenant — é **exatamente** a arquitetura já documentada (não necessariamente já construída) no projeto `igrejas-web-system-os`, que segundo o próprio `CLAUDE.md` dele "substitui e unifica IgrejasWebOS + portal-teologico-os" e prevê nativamente:
- `ministry_id uuid NOT NULL` obrigatório em toda tabela (isolamento de tenant).
- Hierarquia de 0 a 4: Super-Master, Master/Campo, Admin-Sede, Admin-Setor, Usuário-Local — quase idêntica ao que foi descrito aqui.

Ou seja: o modelo que o usuário quer para o portal-teologico-os já é, por design, o motivo de existir do outro projeto no mesmo workspace.

## Parecer

**Já temos essa rotina implementada no portal-teologico-os? Não.** Hoje o sistema tem só 3 papéis nominalmente diferentes mas com o mesmo poder efetivo, escopados no máximo a uma igreja por perfil, sem noção de Campo, sem N:N usuário↔organização, e sem RLS que realmente restrinja por setor/igreja.

**Podemos implementar? Tecnicamente sim, mas não é um ajuste pontual — é uma mudança estrutural grande.** Envolveria: criar um nível "Campo" acima de Setor; trocar `system_role` fixo por uma tabela de papéis com escopo (usuário + tipo de papel + campo/setor/igreja ao qual se aplica, permitindo inclusive mais de um vínculo por pessoa — o que resolveria a pergunta sobre gerenciar dois Campos ao mesmo tempo); reescrever a RLS de praticamente toda tabela do sistema para filtrar por esse escopo em vez do atual "qualquer staff vê tudo"; e estender o módulo de cursos/matrícula para reconhecer a dimensão Campo/Sede/Setor (hoje ele é mono-institucional).

**Recomendação prática:** dado que esse exato desenho já está planejado no `igrejas-web-system-os`, vale decidir conscientemente entre investir essa reformulação grande dentro do portal-teologico-os atual, ou tratar isso como confirmação de que o caminho certo é seguir/acelerar o outro projeto, que já nasceu pensado pra esse cenário multi-campo.

## Nota de segurança

O usuário compartilhou no chat uma senha-mestra em texto puro, com a informação de que a mesma senha está configurada como padrão para todas as contas do sistema. Essa senha **não foi armazenada em nenhum arquivo ou lugar por este assistente** — só o texto acima (sem a senha) foi guardado. Reforçando o parecer: senha padrão compartilhada entre todas as contas é um risco real (basta uma pessoa vazar/reaproveitar a senha em outro lugar para comprometer todas as contas do sistema de uma vez); o modelo mencionado pelo usuário de gerar senha temporária por conta + forçar troca no primeiro acesso é a abordagem correta e deveria substituir a senha fixa compartilhada assim que possível.
