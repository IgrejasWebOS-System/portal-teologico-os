-- Produtos de demonstração para a Loja, no mesmo espírito da
-- migração 006 (dados de demonstração) — conteúdo placeholder,
-- claramente sinalizado. Os PDFs referenciam um arquivo_path que
-- ainda não existe fisicamente no bucket "biblioteca-pdfs": os
-- links de download/leitura só funcionam de verdade depois que o
-- arquivo for enviado pelo Dashboard do Supabase (Storage).

-- course_id buscado dinamicamente pelo título (não fixo) — o UUID do
-- curso "Homilética" é gerado pela migração 006 toda vez que ela roda,
-- então varia por ambiente (produção, branch, staging, restore). Um
-- UUID fixo aqui quebrava a aplicação das migrations em qualquer
-- ambiente novo (violação de FK products_course_id_fkey).
INSERT INTO public.products (tipo, titulo, descricao, preco_centavos, course_id, status)
SELECT
  'CURSO_AVULSO',
  'Homilética — A Arte de Pregar (avulso)',
  'Mesmo conteúdo do curso oficial, disponível para compra avulsa por quem não é membro do ministério.',
  15000,
  id,
  'ATIVO'
FROM public.courses
WHERE title = 'Homilética — A Arte de Pregar'
LIMIT 1;

INSERT INTO public.products (tipo, titulo, descricao, preco_centavos, estoque, status)
VALUES (
  'MATERIAL_FISICO',
  'Livro: Família Cristã',
  'Livro impresso usado no Curso Teológico Médio, disponível também para compra avulsa.',
  4500,
  20,
  'ATIVO'
);

INSERT INTO public.products (tipo, titulo, descricao, preco_centavos, arquivo_path, status)
VALUES (
  'PDF_DOWNLOAD',
  'Cartilha de Boas-Vindas ao Aluno',
  'Guia gratuito em PDF sobre como usar o Portal EAD.',
  0,
  'demo/cartilha-boas-vindas.pdf',
  'ATIVO'
);

INSERT INTO public.products (tipo, titulo, descricao, preco_centavos, arquivo_path, status)
VALUES (
  'PDF_VIRTUAL',
  'Apostila Digital — Hermenêutica Bíblica',
  'Leitura dentro do portal, sem opção de download (conteúdo protegido).',
  3000,
  'demo/apostila-hermeneutica.pdf',
  'ATIVO'
);
