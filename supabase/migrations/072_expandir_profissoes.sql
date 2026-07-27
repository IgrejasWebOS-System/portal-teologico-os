-- 072_expandir_profissoes.sql
-- Expande a lista de Profissões (hoje ~53 itens da seed 029) com mais
-- ~150 ocupações comuns no Brasil, organizadas pelas grandes áreas da
-- CBO (Classificação Brasileira de Ocupações, Ministério do Trabalho e
-- Emprego — https://www.gov.br/trabalho-e-emprego), sem importar a CBO
-- inteira (2.400+ famílias / 10 mil+ sinônimos): a granularidade oficial
-- inviabilizaria o <select> simples usado hoje nos formulários. Já
-- inseridas em maiúsculas (padrão definido na migração 071) e com
-- ON CONFLICT (name) DO NOTHING pra não duplicar o que já existe.

INSERT INTO public.settings_professions (name) VALUES
  -- Saúde
  ('FISIOTERAPEUTA'), ('NUTRICIONISTA'), ('FARMACÊUTICO(A)'), ('PSICÓLOGO(A)'),
  ('FONOAUDIÓLOGO(A)'), ('TERAPEUTA OCUPACIONAL'), ('BIOMÉDICO(A)'),
  ('TÉCNICO(A) EM RADIOLOGIA'), ('TÉCNICO(A) EM FARMÁCIA'),
  ('AGENTE COMUNITÁRIO(A) DE SAÚDE'), ('CUIDADOR(A) DE IDOSOS'), ('PARTEIRA'),
  ('VETERINÁRIO(A)'), ('TÉCNICO(A) VETERINÁRIO(A)'), ('MASSOTERAPEUTA'),
  ('ACUPUNTURISTA'), ('NUTRÓLOGO(A)'),
  -- Educação
  ('PEDAGOGO(A)'), ('COORDENADOR(A) PEDAGÓGICO(A)'), ('DIRETOR(A) ESCOLAR'),
  ('PROFESSOR(A) UNIVERSITÁRIO(A)'), ('MONITOR(A) ESCOLAR'),
  ('EDUCADOR(A) SOCIAL'), ('BIBLIOTECÁRIO(A)'), ('TRADUTOR(A) / INTÉRPRETE'),
  ('INSTRUTOR(A) DE AUTOESCOLA'),
  -- Tecnologia
  ('ANALISTA DE DADOS'), ('DESENVOLVEDOR(A) DE SOFTWARE'),
  ('SUPORTE TÉCNICO DE TI'), ('TÉCNICO(A) EM INFORMÁTICA'),
  ('ADMINISTRADOR(A) DE REDES'), ('ANALISTA DE SUPORTE'), ('WEBDESIGNER'),
  ('GESTOR(A) DE TRÁFEGO / MARKETING DIGITAL'), ('SOCIAL MEDIA'),
  -- Engenharia e construção
  ('ENGENHEIRO(A) CIVIL'), ('ENGENHEIRO(A) ELÉTRICO(A)'),
  ('ENGENHEIRO(A) MECÂNICO(A)'), ('ENGENHEIRO(A) DE PRODUÇÃO'),
  ('ENGENHEIRO(A) AMBIENTAL'), ('MESTRE DE OBRAS'), ('SERVENTE DE PEDREIRO'),
  ('GESSEIRO(A)'), ('AZULEJISTA'), ('VIDRACEIRO(A)'), ('SOLDADOR(A)'),
  ('TORNEIRO(A) MECÂNICO(A)'), ('SERRALHEIRO(A)'), ('FUNILEIRO(A)'),
  ('MONTADOR(A) DE MÓVEIS'), ('TAPECEIRO(A)'), ('ESTOFADOR(A)'),
  ('TOPÓGRAFO(A)'), ('DESENHISTA TÉCNICO(A)'),
  -- Direito, justiça e administração pública
  ('JUIZ(A)'), ('PROMOTOR(A) DE JUSTIÇA'), ('DELEGADO(A)'),
  ('OFICIAL DE JUSTIÇA'), ('ESCREVENTE'), ('DESPACHANTE'),
  ('SERVIDOR(A) PÚBLICO(A)'), ('FISCAL'), ('AGENTE PENITENCIÁRIO(A)'),
  ('GUARDA MUNICIPAL'),
  -- Finanças e negócios
  ('ECONOMISTA'), ('ANALISTA FINANCEIRO(A)'), ('CORRETOR(A) DE IMÓVEIS'),
  ('CORRETOR(A) DE SEGUROS'), ('CONSULTOR(A) DE VENDAS'),
  ('REPRESENTANTE COMERCIAL'), ('GERENTE COMERCIAL'), ('GERENTE DE LOJA'),
  ('CAIXA'), ('ESTOQUISTA'), ('CONFERENTE DE ESTOQUE'),
  ('EMPACOTADOR(A) / EMBALADOR(A)'), ('REPOSITOR(A) DE MERCADORIAS'),
  -- Serviços gerais
  ('PORTEIRO(A)'), ('ZELADOR(A)'), ('FAXINEIRO(A)'), ('JARDINEIRO(A)'),
  ('LAVADOR(A) DE CARROS'), ('AJUDANTE GERAL'), ('AUXILIAR DE LIMPEZA'),
  ('AUXILIAR DE COZINHA'), ('COPEIRO(A)'), ('ENTREGADOR(A)'), ('CARTEIRO(A)'),
  ('OPERADOR(A) DE TELEMARKETING'), ('ATENDENTE'), ('BABÁ'),
  -- Rural e agropecuária
  ('SITIANTE'), ('VAQUEIRO(A)'), ('TRATORISTA'), ('APICULTOR(A)'),
  ('FLORICULTOR(A)'), ('CRIADOR(A) DE ANIMAIS'),
  -- Transporte e logística
  ('TAXISTA'), ('MOTORISTA DE APLICATIVO'), ('MOTORISTA DE ÔNIBUS'),
  ('MOTORISTA PARTICULAR'), ('PILOTO(A) DE AVIÃO'), ('COMISSÁRIO(A) DE BORDO'),
  ('DESPACHANTE ADUANEIRO(A)'), ('OPERADOR(A) LOGÍSTICO(A)'),
  ('MARINHEIRO(A)'), ('FERROVIÁRIO(A)'),
  -- Segurança pública e forças armadas
  ('BOMBEIRO(A) CIVIL'), ('VIGILANTE'), ('GUARDA-COSTAS'),
  ('MILITAR DO EXÉRCITO'), ('MILITAR DA MARINHA'), ('MILITAR DA AERONÁUTICA'),
  -- Artes e comunicação
  ('ATOR / ATRIZ'), ('MÚSICO(A)'), ('CANTOR(A)'), ('FOTÓGRAFO(A)'),
  ('CINEGRAFISTA'), ('EDITOR(A) DE VÍDEO'), ('PUBLICITÁRIO(A)'),
  ('RELAÇÕES PÚBLICAS'), ('ESCRITOR(A)'), ('ARTESÃO(Ã)'), ('ILUSTRADOR(A)'),
  -- Beleza e estética
  ('ESTETICISTA'), ('BARBEIRO(A)'), ('MAQUIADOR(A)'),
  ('DESIGNER DE SOBRANCELHAS'), ('DEPILADOR(A)'), ('MASSAGISTA'),
  -- Alimentação e hotelaria
  ('CHEF DE COZINHA'), ('AÇOUGUEIRO(A)'), ('SORVETEIRO(A)'),
  ('PIZZAIOLO(A)'), ('BARISTA'), ('RECEPCIONISTA DE HOTEL'),
  ('CAMAREIRO(A)'), ('GOVERNANTA (HOTELARIA)'), ('GUIA DE TURISMO'),
  -- Ciências e pesquisa
  ('CIENTISTA'), ('PESQUISADOR(A)'), ('BIÓLOGO(A)'), ('QUÍMICO(A)'),
  ('FÍSICO(A)'), ('GEÓLOGO(A)'), ('METEOROLOGISTA'), ('ASTRÔNOMO(A)'),
  -- Esportes
  ('EDUCADOR(A) FÍSICO(A)'), ('PERSONAL TRAINER'),
  ('TÉCNICO(A) ESPORTIVO(A)'), ('ATLETA'), ('ÁRBITRO(A) ESPORTIVO(A)'),
  -- Religião (profissão declarada, distinto do cargo eclesiástico)
  ('TEÓLOGO(A)'), ('CAPELÃO(Ã)'),
  -- Indústria
  ('OPERADOR(A) DE MÁQUINAS'), ('OPERADOR(A) DE PRODUÇÃO'),
  ('TÉCNICO(A) INDUSTRIAL'), ('CONTROLADOR(A) DE QUALIDADE'),
  ('ALMOXARIFE'), ('SUPERVISOR(A) DE PRODUÇÃO')
ON CONFLICT (name) DO NOTHING;
