# Portal EAD de Teologia — CETADP

**Centro Educacional Teológico das Assembleias de Deus Piracicaba**
Documento institucional do projeto · versão 12/07/2026 (nome da instituição corrigido em 13/07/2026)

---

## 1. Apresentação

O CETADP é a instituição de ensino teológico das Assembleias de Deus em
Piracicaba, dedicada à capacitação de membros, obreiros e líderes
evangélicos. Este documento apresenta o **Portal EAD de Teologia**, a
plataforma que leva essa formação para o ensino a distância, permitindo
que qualquer campo ou ministério — independentemente da distância física
até Piracicaba — tenha acesso ao mesmo padrão de ensino oficial do
CETADP.

O Portal EAD nasce integrado ao **IgrejasWebOS**, o sistema de gestão
eclesiástica já em uso, e é apresentado como um produto individual dentro
dessa mesma plataforma: reaproveita a base tecnológica já existente
(autenticação, infraestrutura, design), reduzindo custo e tempo de
desenvolvimento, e mantendo a porta aberta para uma integração natural
entre a vida da igreja local e a formação teológica de seus membros.

## 2. Problema e oportunidade

Hoje, a formação teológica presencial limita o alcance do CETADP a quem
consegue se deslocar até Piracicaba. Obreiros e líderes de campos e
ministérios mais distantes ficam de fora, ou dependem de iniciativas
isoladas e não padronizadas. O Portal EAD resolve isso oferecendo:

- Um único ponto de acesso para todos os campos e ministérios.
- Um padrão de ensino oficial, com controle de matrícula e progresso.
- Um processo de inscrição e aprovação claro, conduzido pela secretaria.

## 3. Público-alvo

Membros, obreiros e líderes evangélicos de qualquer campo ou ministério
vinculado, interessados em:

- Cursos oficiais de formação teológica.
- Cursos de reciclagem para quem já atua no ministério.
- Teologia em vários níveis — do básico ao avançado.
- Treinamentos e capacitação sob demanda dos departamentos/campos.

## 4. Como funciona o acesso

O acesso ao Portal do Aluno é feito por **matrícula**, num fluxo com três
etapas:

1. **Inscrição** — o interessado preenche um formulário público no site, indicando o curso pretendido e seu campo/ministério.
2. **Aprovação** — a secretaria do CETADP analisa a inscrição e, ao aprovar, o sistema gera automaticamente a matrícula do aluno.
3. **Acesso** — o aluno recebe as instruções por e-mail e passa a acessar o Portal com e-mail e senha, como em qualquer sistema acadêmico.

Esse desenho evita cadastro aberto sem controle (comum em portais
puramente self-service) e mantém a secretaria como responsável pela
qualidade e legitimidade de cada matrícula — um ponto importante tratando-se
de uma instituição de ensino oficial.

## 5. O que o portal oferece

- **Site institucional** — apresentação do CETADP, "Quem Somos" e a Biblioteca (livraria/distribuidora: livros, apostilas, Revista Escola Dominical e Jornal Semeador).
- **Cursos Oficiais, Reciclagem e Teologia em Níveis** — trilhas de estudo em vídeo, com acompanhamento de progresso do aluno.
- **EBD (Escola Bíblica Dominical)** — lições semanais organizadas por trimestre.
- **Painel da secretaria** — aprovação de inscrições, geração de matrícula e liberação de acesso.

## 6. Estado atual do projeto (atualizado em 21/07/2026)

O Portal EAD já está funcional, com banco de dados próprio (agora no
plano Pro do Supabase) e dados de demonstração prontos para o piloto:

- Site institucional público completo (home, "Quem Somos", Biblioteca, Loja).
- Fluxo de inscrição/matrícula → acesso, de ponta a ponta, testado com e-mail real.
- Banco de dados Supabase **isolado e dedicado** a este projeto — não mais compartilhado com outros sistemas internos, com controle de acesso (RLS) corrigido em todas as tabelas administrativas.
- Controle de papéis (secretaria/admin) aplicado em todas as rotas administrativas.
- 14 cursos cadastrados: Curso Teológico Básico e Médio publicados (10 aulas cada), mais 11 cursos preparatórios avulsos (Diaconato, Presbitério, EBOM, Homilética etc.), além de um trimestre completo de EBD.
- Loja com catálogo, carrinho e pagamento real via Mercado Pago (sandbox); painel financeiro (caixa diário, contas a pagar/receber); controle de patrimônio; matrícula direta pela secretaria; simulados e provas com nota mínima e aprovação/reprovação automática.
- Área do aluno ("Minha Área") integrada ao menu principal, com painel de matrícula, financeiro e avaliações.
- Um design system documentado, garantindo que novas telas mantenham o mesmo padrão visual e de qualidade.

## 7. Decisão de arquitetura: por que este projeto e não o sistema novo

A liderança precisa estar ciente de um ponto de governança: este Portal
EAD foi construído sobre o `portal-teologico-os`, enquanto o fornecedor
já iniciou, em paralelo, um sistema de gestão eclesiástica de nova geração
(`igrejas-web-system-os`), com arquitetura multi-tenant mais madura. A
decisão tomada foi **manter o pitch de hoje sobre o `portal-teologico-os`**
— é o que está pronto, testado e com a identidade visual do CETADP — e
migrar este Portal EAD para a arquitetura nova **depois** da aprovação,
sem colocar o prazo em risco. Essa migração já está planejada e
documentada (ver `ordem-tecnica-isolamento-e-migracao.md`).

## 8. Próximos passos (roadmap)

- Definir a tratativa comercial/operacional da Biblioteca (catálogo, pedidos, distribuição).
- Emissão e validação de certificado ao final de cada curso.
- Migrar o Portal EAD para o `igrejas-web-system-os` (RBAC multi-nível, isolamento por ministério) após a aprovação — ver documento técnico de ordem de migração.
- Avaliar abertura do portal a outros campos/ministérios e a outras igrejas como piloto controlado.

## 9. Considerações finais

O Portal EAD de Teologia amplia o alcance do CETADP sem exigir um
sistema novo do zero: é uma evolução direta do investimento já feito no
IgrejasWebOS, com um processo de matrícula pensado para preservar o rigor
institucional do ensino oficial. A proposta deste documento é servir de
base para a aprovação do projeto e definição dos próximos passos junto à
liderança.
