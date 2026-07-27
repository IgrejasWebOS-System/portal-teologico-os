-- ============================================================
-- 070 — Povoa os 4 campos novos (Caruaru-PE, Centenário do Sul-PR,
-- Nova Andradina-MS, Pau da Lima-BA) com dados fictícios, no mesmo
-- espírito do que já existe em Campo Piracicaba: 5 Setores por
-- campo (ligados às 7 Regiões já existentes), 2 Igrejas, 1
-- Sub-congregação, 1 Célula, 6 Membros e 1 Professor.
--
-- Idempotente: cada bloco só roda se o primeiro Setor daquele
-- campo ainda não existir.
-- ============================================================

-- ── Campo Caruaru - PE ──────────────────────────────────────
DO $$
DECLARE
  v_sede_id uuid;
  v_setor1_id uuid; v_setor2_id uuid; v_setor3_id uuid; v_setor4_id uuid; v_setor5_id uuid;
  v_setor1_legacy uuid; v_setor2_legacy uuid;
  v_igreja1_id uuid; v_igreja2_id uuid; v_sub_id uuid; v_celula_id uuid;
  v_church1_id uuid; v_church2_id uuid; v_sub_church_id uuid; v_celula_church_id uuid;
  v_membro1_id uuid; v_membro2_id uuid; v_membro3_id uuid; v_membro4_id uuid; v_membro5_id uuid; v_membro6_id uuid;
BEGIN
  SELECT id INTO v_sede_id FROM public.units WHERE type = 'SEDE' AND name = 'Sede Caruaru';

  IF v_sede_id IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM public.units WHERE type = 'SETOR' AND name = 'Setor Petrópolis' AND parent_id = v_sede_id
  ) THEN
    INSERT INTO public.units (type, name, parent_id) VALUES ('SETOR', 'Setor Petrópolis', v_sede_id) RETURNING id INTO v_setor1_id;
    INSERT INTO public.units (type, name, parent_id) VALUES ('SETOR', 'Setor Salgado', v_sede_id) RETURNING id INTO v_setor2_id;
    INSERT INTO public.units (type, name, parent_id) VALUES ('SETOR', 'Setor Indianópolis', v_sede_id) RETURNING id INTO v_setor3_id;
    INSERT INTO public.units (type, name, parent_id) VALUES ('SETOR', 'Setor Kennedy', v_sede_id) RETURNING id INTO v_setor4_id;
    INSERT INTO public.units (type, name, parent_id) VALUES ('SETOR', 'Setor Universitário', v_sede_id) RETURNING id INTO v_setor5_id;

    INSERT INTO public.sectors (name, regiao_id, unit_id) VALUES ('Setor Petrópolis', (SELECT id FROM regioes WHERE name = 'NORDESTE'), v_setor1_id) RETURNING id INTO v_setor1_legacy;
    INSERT INTO public.sectors (name, regiao_id, unit_id) VALUES ('Setor Salgado', (SELECT id FROM regioes WHERE name = 'SUL'), v_setor2_id) RETURNING id INTO v_setor2_legacy;
    INSERT INTO public.sectors (name, regiao_id, unit_id) VALUES ('Setor Indianópolis', (SELECT id FROM regioes WHERE name = 'LESTE'), v_setor3_id);
    INSERT INTO public.sectors (name, regiao_id, unit_id) VALUES ('Setor Kennedy', (SELECT id FROM regioes WHERE name = 'OESTE'), v_setor4_id);
    INSERT INTO public.sectors (name, regiao_id, unit_id) VALUES ('Setor Universitário', (SELECT id FROM regioes WHERE name = 'CENTRO/NORTE'), v_setor5_id);

    INSERT INTO public.units (type, name, parent_id) VALUES ('IGREJA', 'Igreja Petrópolis', v_setor1_id) RETURNING id INTO v_igreja1_id;
    INSERT INTO public.units (type, name, parent_id) VALUES ('IGREJA', 'Igreja Salgado', v_setor2_id) RETURNING id INTO v_igreja2_id;
    INSERT INTO public.units (type, name, parent_id) VALUES ('SUB_CONGREGACAO', 'Sub-congregação Boa Vista', v_igreja1_id) RETURNING id INTO v_sub_id;
    INSERT INTO public.units (type, name, parent_id) VALUES ('CELULA', 'Célula Nova Esperança', v_igreja2_id) RETURNING id INTO v_celula_id;

    INSERT INTO public.churches (name, city, state, sector_id, unit_id) VALUES ('Igreja Petrópolis', 'Caruaru', 'PE', v_setor1_legacy, v_igreja1_id) RETURNING id INTO v_church1_id;
    INSERT INTO public.churches (name, city, state, sector_id, unit_id) VALUES ('Igreja Salgado', 'Caruaru', 'PE', v_setor2_legacy, v_igreja2_id) RETURNING id INTO v_church2_id;
    INSERT INTO public.churches (name, city, state, sector_id, unit_id) VALUES ('Sub-congregação Boa Vista', 'Caruaru', 'PE', v_setor1_legacy, v_sub_id) RETURNING id INTO v_sub_church_id;
    INSERT INTO public.churches (name, city, state, sector_id, unit_id) VALUES ('Célula Nova Esperança', 'Caruaru', 'PE', v_setor2_legacy, v_celula_id) RETURNING id INTO v_celula_church_id;

    INSERT INTO public.members (church_id, full_name, cpf, phone, email, registration_number, gender, civil_status) VALUES
      (v_church1_id, 'Marcos Antônio da Silva',      '100.100.001-00', '(81) 98811-1001', 'marcos.silva.caruaru@teste.cetadp.org.br',      'CAR-001', 'Masculino', 'Casado(a)') RETURNING id INTO v_membro1_id;
    INSERT INTO public.members (church_id, full_name, cpf, phone, email, registration_number, gender, civil_status) VALUES
      (v_church1_id, 'Fernanda Cristina Oliveira',    '100.100.002-00', '(81) 98811-1002', 'fernanda.oliveira.caruaru@teste.cetadp.org.br', 'CAR-002', 'Feminino',  'Solteiro(a)') RETURNING id INTO v_membro2_id;
    INSERT INTO public.members (church_id, full_name, cpf, phone, email, registration_number, gender, civil_status) VALUES
      (v_church1_id, 'José Ribamar Costa',            '100.100.003-00', '(81) 98811-1003', 'jose.costa.caruaru@teste.cetadp.org.br',        'CAR-003', 'Masculino', 'Casado(a)') RETURNING id INTO v_membro3_id;
    INSERT INTO public.members (church_id, full_name, cpf, phone, email, registration_number, gender, civil_status) VALUES
      (v_church2_id, 'Patrícia Gomes Barbosa',        '100.100.004-00', '(81) 98811-1004', 'patricia.barbosa.caruaru@teste.cetadp.org.br',  'CAR-004', 'Feminino',  'Casado(a)') RETURNING id INTO v_membro4_id;
    INSERT INTO public.members (church_id, full_name, cpf, phone, email, registration_number, gender, civil_status) VALUES
      (v_church2_id, 'Edmilson Pereira dos Santos',   '100.100.005-00', '(81) 98811-1005', 'edmilson.santos.caruaru@teste.cetadp.org.br',   'CAR-005', 'Masculino', 'Solteiro(a)') RETURNING id INTO v_membro5_id;
    INSERT INTO public.members (church_id, full_name, cpf, phone, email, registration_number, gender, civil_status) VALUES
      (v_church2_id, 'Rosangela Maria Fernandes',     '100.100.006-00', '(81) 98811-1006', 'rosangela.fernandes.caruaru@teste.cetadp.org.br','CAR-006', 'Feminino', 'Casado(a)') RETURNING id INTO v_membro6_id;

    INSERT INTO public.professores (unit_id, sector_id, church_id, member_id, matricula, nome_completo, cargo, telefone) VALUES
      (v_igreja1_id, v_setor1_legacy, v_church1_id, v_membro1_id, 'CAR-001', 'Marcos Antônio da Silva', 'Professor(a) de Teologia Sistemática', '(81) 98811-1001');
  END IF;
END $$;

-- ── Campo Centenário do Sul - PR ────────────────────────────
DO $$
DECLARE
  v_sede_id uuid;
  v_setor1_id uuid; v_setor2_id uuid; v_setor3_id uuid; v_setor4_id uuid; v_setor5_id uuid;
  v_setor1_legacy uuid; v_setor2_legacy uuid;
  v_igreja1_id uuid; v_igreja2_id uuid; v_sub_id uuid; v_celula_id uuid;
  v_church1_id uuid; v_church2_id uuid; v_sub_church_id uuid; v_celula_church_id uuid;
  v_membro1_id uuid;
BEGIN
  SELECT id INTO v_sede_id FROM public.units WHERE type = 'SEDE' AND name = 'Sede Centenário do Sul';

  IF v_sede_id IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM public.units WHERE type = 'SETOR' AND name = 'Setor Centro' AND parent_id = v_sede_id
  ) THEN
    INSERT INTO public.units (type, name, parent_id) VALUES ('SETOR', 'Setor Centro', v_sede_id) RETURNING id INTO v_setor1_id;
    INSERT INTO public.units (type, name, parent_id) VALUES ('SETOR', 'Setor Jardim Primavera', v_sede_id) RETURNING id INTO v_setor2_id;
    INSERT INTO public.units (type, name, parent_id) VALUES ('SETOR', 'Setor Vila Rural', v_sede_id) RETURNING id INTO v_setor3_id;
    INSERT INTO public.units (type, name, parent_id) VALUES ('SETOR', 'Setor Vila Nova', v_sede_id) RETURNING id INTO v_setor4_id;
    INSERT INTO public.units (type, name, parent_id) VALUES ('SETOR', 'Setor São Judas', v_sede_id) RETURNING id INTO v_setor5_id;

    INSERT INTO public.sectors (name, regiao_id, unit_id) VALUES ('Setor Centro', (SELECT id FROM regioes WHERE name = 'SUDOESTE'), v_setor1_id) RETURNING id INTO v_setor1_legacy;
    INSERT INTO public.sectors (name, regiao_id, unit_id) VALUES ('Setor Jardim Primavera', (SELECT id FROM regioes WHERE name = 'NOROESTE'), v_setor2_id) RETURNING id INTO v_setor2_legacy;
    INSERT INTO public.sectors (name, regiao_id, unit_id) VALUES ('Setor Vila Rural', (SELECT id FROM regioes WHERE name = 'SUL'), v_setor3_id);
    INSERT INTO public.sectors (name, regiao_id, unit_id) VALUES ('Setor Vila Nova', (SELECT id FROM regioes WHERE name = 'LESTE'), v_setor4_id);
    INSERT INTO public.sectors (name, regiao_id, unit_id) VALUES ('Setor São Judas', (SELECT id FROM regioes WHERE name = 'OESTE'), v_setor5_id);

    INSERT INTO public.units (type, name, parent_id) VALUES ('IGREJA', 'Igreja Centro', v_setor1_id) RETURNING id INTO v_igreja1_id;
    INSERT INTO public.units (type, name, parent_id) VALUES ('IGREJA', 'Igreja Jardim Primavera', v_setor2_id) RETURNING id INTO v_igreja2_id;
    INSERT INTO public.units (type, name, parent_id) VALUES ('SUB_CONGREGACAO', 'Sub-congregação Vila Rural', v_igreja1_id) RETURNING id INTO v_sub_id;
    INSERT INTO public.units (type, name, parent_id) VALUES ('CELULA', 'Célula Fé e Vida', v_igreja2_id) RETURNING id INTO v_celula_id;

    INSERT INTO public.churches (name, city, state, sector_id, unit_id) VALUES ('Igreja Centro', 'Centenário do Sul', 'PR', v_setor1_legacy, v_igreja1_id) RETURNING id INTO v_church1_id;
    INSERT INTO public.churches (name, city, state, sector_id, unit_id) VALUES ('Igreja Jardim Primavera', 'Centenário do Sul', 'PR', v_setor2_legacy, v_igreja2_id) RETURNING id INTO v_church2_id;
    INSERT INTO public.churches (name, city, state, sector_id, unit_id) VALUES ('Sub-congregação Vila Rural', 'Centenário do Sul', 'PR', v_setor1_legacy, v_sub_id) RETURNING id INTO v_sub_church_id;
    INSERT INTO public.churches (name, city, state, sector_id, unit_id) VALUES ('Célula Fé e Vida', 'Centenário do Sul', 'PR', v_setor2_legacy, v_celula_id) RETURNING id INTO v_celula_church_id;

    INSERT INTO public.members (church_id, full_name, cpf, phone, email, registration_number, gender, civil_status) VALUES
      (v_church1_id, 'Antônio Carlos Rodrigues',      '100.200.001-00', '(43) 98811-2001', 'antonio.rodrigues.centenario@teste.cetadp.org.br', 'CTS-001', 'Masculino', 'Casado(a)') RETURNING id INTO v_membro1_id;
    INSERT INTO public.members (church_id, full_name, cpf, phone, email, registration_number, gender, civil_status) VALUES
      (v_church1_id, 'Simone Aparecida Lima',         '100.200.002-00', '(43) 98811-2002', 'simone.lima.centenario@teste.cetadp.org.br',       'CTS-002', 'Feminino',  'Solteiro(a)');
    INSERT INTO public.members (church_id, full_name, cpf, phone, email, registration_number, gender, civil_status) VALUES
      (v_church1_id, 'Valdemir José Souza',           '100.200.003-00', '(43) 98811-2003', 'valdemir.souza.centenario@teste.cetadp.org.br',    'CTS-003', 'Masculino', 'Casado(a)');
    INSERT INTO public.members (church_id, full_name, cpf, phone, email, registration_number, gender, civil_status) VALUES
      (v_church2_id, 'Cleusa Regina Martins',         '100.200.004-00', '(43) 98811-2004', 'cleusa.martins.centenario@teste.cetadp.org.br',    'CTS-004', 'Feminino',  'Casado(a)');
    INSERT INTO public.members (church_id, full_name, cpf, phone, email, registration_number, gender, civil_status) VALUES
      (v_church2_id, 'Roberto Carlos Nascimento',     '100.200.005-00', '(43) 98811-2005', 'roberto.nascimento.centenario@teste.cetadp.org.br','CTS-005', 'Masculino', 'Solteiro(a)');
    INSERT INTO public.members (church_id, full_name, cpf, phone, email, registration_number, gender, civil_status) VALUES
      (v_church2_id, 'Neusa Aparecida Ferreira',      '100.200.006-00', '(43) 98811-2006', 'neusa.ferreira.centenario@teste.cetadp.org.br',    'CTS-006', 'Feminino',  'Casado(a)');

    INSERT INTO public.professores (unit_id, sector_id, church_id, member_id, matricula, nome_completo, cargo, telefone) VALUES
      (v_igreja1_id, v_setor1_legacy, v_church1_id, v_membro1_id, 'CTS-001', 'Antônio Carlos Rodrigues', 'Professor(a) de Hermenêutica', '(43) 98811-2001');
  END IF;
END $$;

-- ── Campo Nova Andradina - MS ───────────────────────────────
DO $$
DECLARE
  v_sede_id uuid;
  v_setor1_id uuid; v_setor2_id uuid; v_setor3_id uuid; v_setor4_id uuid; v_setor5_id uuid;
  v_setor1_legacy uuid; v_setor2_legacy uuid;
  v_igreja1_id uuid; v_igreja2_id uuid; v_sub_id uuid; v_celula_id uuid;
  v_church1_id uuid; v_church2_id uuid; v_sub_church_id uuid; v_celula_church_id uuid;
  v_membro1_id uuid;
BEGIN
  SELECT id INTO v_sede_id FROM public.units WHERE type = 'SEDE' AND name = 'Sede Nova Andradina';

  IF v_sede_id IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM public.units WHERE type = 'SETOR' AND name = 'Setor Centro' AND parent_id = v_sede_id
  ) THEN
    INSERT INTO public.units (type, name, parent_id) VALUES ('SETOR', 'Setor Centro', v_sede_id) RETURNING id INTO v_setor1_id;
    INSERT INTO public.units (type, name, parent_id) VALUES ('SETOR', 'Setor Jardim Alvorada', v_sede_id) RETURNING id INTO v_setor2_id;
    INSERT INTO public.units (type, name, parent_id) VALUES ('SETOR', 'Setor Vila Formosa', v_sede_id) RETURNING id INTO v_setor3_id;
    INSERT INTO public.units (type, name, parent_id) VALUES ('SETOR', 'Setor Parque das Nações', v_sede_id) RETURNING id INTO v_setor4_id;
    INSERT INTO public.units (type, name, parent_id) VALUES ('SETOR', 'Setor Jardim das Flores', v_sede_id) RETURNING id INTO v_setor5_id;

    INSERT INTO public.sectors (name, regiao_id, unit_id) VALUES ('Setor Centro', (SELECT id FROM regioes WHERE name = 'CENTRO/NORTE'), v_setor1_id) RETURNING id INTO v_setor1_legacy;
    INSERT INTO public.sectors (name, regiao_id, unit_id) VALUES ('Setor Jardim Alvorada', (SELECT id FROM regioes WHERE name = 'SUL'), v_setor2_id) RETURNING id INTO v_setor2_legacy;
    INSERT INTO public.sectors (name, regiao_id, unit_id) VALUES ('Setor Vila Formosa', (SELECT id FROM regioes WHERE name = 'LESTE'), v_setor3_id);
    INSERT INTO public.sectors (name, regiao_id, unit_id) VALUES ('Setor Parque das Nações', (SELECT id FROM regioes WHERE name = 'OESTE'), v_setor4_id);
    INSERT INTO public.sectors (name, regiao_id, unit_id) VALUES ('Setor Jardim das Flores', (SELECT id FROM regioes WHERE name = 'NORDESTE'), v_setor5_id);

    INSERT INTO public.units (type, name, parent_id) VALUES ('IGREJA', 'Igreja Centro', v_setor1_id) RETURNING id INTO v_igreja1_id;
    INSERT INTO public.units (type, name, parent_id) VALUES ('IGREJA', 'Igreja Jardim Alvorada', v_setor2_id) RETURNING id INTO v_igreja2_id;
    INSERT INTO public.units (type, name, parent_id) VALUES ('SUB_CONGREGACAO', 'Sub-congregação Vila Formosa', v_igreja1_id) RETURNING id INTO v_sub_id;
    INSERT INTO public.units (type, name, parent_id) VALUES ('CELULA', 'Célula Renovo', v_igreja2_id) RETURNING id INTO v_celula_id;

    INSERT INTO public.churches (name, city, state, sector_id, unit_id) VALUES ('Igreja Centro', 'Nova Andradina', 'MS', v_setor1_legacy, v_igreja1_id) RETURNING id INTO v_church1_id;
    INSERT INTO public.churches (name, city, state, sector_id, unit_id) VALUES ('Igreja Jardim Alvorada', 'Nova Andradina', 'MS', v_setor2_legacy, v_igreja2_id) RETURNING id INTO v_church2_id;
    INSERT INTO public.churches (name, city, state, sector_id, unit_id) VALUES ('Sub-congregação Vila Formosa', 'Nova Andradina', 'MS', v_setor1_legacy, v_sub_id) RETURNING id INTO v_sub_church_id;
    INSERT INTO public.churches (name, city, state, sector_id, unit_id) VALUES ('Célula Renovo', 'Nova Andradina', 'MS', v_setor2_legacy, v_celula_id) RETURNING id INTO v_celula_church_id;

    INSERT INTO public.members (church_id, full_name, cpf, phone, email, registration_number, gender, civil_status) VALUES
      (v_church1_id, 'Wellington dos Santos Gomes',   '100.300.001-00', '(67) 98811-3001', 'wellington.gomes.andradina@teste.cetadp.org.br',  'NAN-001', 'Masculino', 'Casado(a)') RETURNING id INTO v_membro1_id;
    INSERT INTO public.members (church_id, full_name, cpf, phone, email, registration_number, gender, civil_status) VALUES
      (v_church1_id, 'Aparecida Donizete Pires',      '100.300.002-00', '(67) 98811-3002', 'aparecida.pires.andradina@teste.cetadp.org.br',   'NAN-002', 'Feminino',  'Solteiro(a)');
    INSERT INTO public.members (church_id, full_name, cpf, phone, email, registration_number, gender, civil_status) VALUES
      (v_church1_id, 'Sebastião Ferreira Lima',       '100.300.003-00', '(67) 98811-3003', 'sebastiao.lima.andradina@teste.cetadp.org.br',    'NAN-003', 'Masculino', 'Casado(a)');
    INSERT INTO public.members (church_id, full_name, cpf, phone, email, registration_number, gender, civil_status) VALUES
      (v_church2_id, 'Marilene Cristina Alves',       '100.300.004-00', '(67) 98811-3004', 'marilene.alves.andradina@teste.cetadp.org.br',    'NAN-004', 'Feminino',  'Casado(a)');
    INSERT INTO public.members (church_id, full_name, cpf, phone, email, registration_number, gender, civil_status) VALUES
      (v_church2_id, 'Osvaldo Pereira Duarte',        '100.300.005-00', '(67) 98811-3005', 'osvaldo.duarte.andradina@teste.cetadp.org.br',    'NAN-005', 'Masculino', 'Solteiro(a)');
    INSERT INTO public.members (church_id, full_name, cpf, phone, email, registration_number, gender, civil_status) VALUES
      (v_church2_id, 'Ivanilde Souza Cardoso',        '100.300.006-00', '(67) 98811-3006', 'ivanilde.cardoso.andradina@teste.cetadp.org.br',  'NAN-006', 'Feminino',  'Casado(a)');

    INSERT INTO public.professores (unit_id, sector_id, church_id, member_id, matricula, nome_completo, cargo, telefone) VALUES
      (v_igreja1_id, v_setor1_legacy, v_church1_id, v_membro1_id, 'NAN-001', 'Wellington dos Santos Gomes', 'Coordenador(a) Pedagógico(a)', '(67) 98811-3001');
  END IF;
END $$;

-- ── Campo Pau da Lima (Salvador) - BA ───────────────────────
DO $$
DECLARE
  v_sede_id uuid;
  v_setor1_id uuid; v_setor2_id uuid; v_setor3_id uuid; v_setor4_id uuid; v_setor5_id uuid;
  v_setor1_legacy uuid; v_setor2_legacy uuid;
  v_igreja1_id uuid; v_igreja2_id uuid; v_sub_id uuid; v_celula_id uuid;
  v_church1_id uuid; v_church2_id uuid; v_sub_church_id uuid; v_celula_church_id uuid;
  v_membro1_id uuid;
BEGIN
  SELECT id INTO v_sede_id FROM public.units WHERE type = 'SEDE' AND name = 'Sede Pau da Lima';

  IF v_sede_id IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM public.units WHERE type = 'SETOR' AND name = 'Setor Pau da Lima' AND parent_id = v_sede_id
  ) THEN
    INSERT INTO public.units (type, name, parent_id) VALUES ('SETOR', 'Setor Pau da Lima', v_sede_id) RETURNING id INTO v_setor1_id;
    INSERT INTO public.units (type, name, parent_id) VALUES ('SETOR', 'Setor Águas Claras', v_sede_id) RETURNING id INTO v_setor2_id;
    INSERT INTO public.units (type, name, parent_id) VALUES ('SETOR', 'Setor Tancredo Neves', v_sede_id) RETURNING id INTO v_setor3_id;
    INSERT INTO public.units (type, name, parent_id) VALUES ('SETOR', 'Setor Sussuarana', v_sede_id) RETURNING id INTO v_setor4_id;
    INSERT INTO public.units (type, name, parent_id) VALUES ('SETOR', 'Setor Cajazeiras', v_sede_id) RETURNING id INTO v_setor5_id;

    INSERT INTO public.sectors (name, regiao_id, unit_id) VALUES ('Setor Pau da Lima', (SELECT id FROM regioes WHERE name = 'LESTE'), v_setor1_id) RETURNING id INTO v_setor1_legacy;
    INSERT INTO public.sectors (name, regiao_id, unit_id) VALUES ('Setor Águas Claras', (SELECT id FROM regioes WHERE name = 'OESTE'), v_setor2_id) RETURNING id INTO v_setor2_legacy;
    INSERT INTO public.sectors (name, regiao_id, unit_id) VALUES ('Setor Tancredo Neves', (SELECT id FROM regioes WHERE name = 'NORDESTE'), v_setor3_id);
    INSERT INTO public.sectors (name, regiao_id, unit_id) VALUES ('Setor Sussuarana', (SELECT id FROM regioes WHERE name = 'SUDOESTE'), v_setor4_id);
    INSERT INTO public.sectors (name, regiao_id, unit_id) VALUES ('Setor Cajazeiras', (SELECT id FROM regioes WHERE name = 'NOROESTE'), v_setor5_id);

    INSERT INTO public.units (type, name, parent_id) VALUES ('IGREJA', 'Igreja Pau da Lima', v_setor1_id) RETURNING id INTO v_igreja1_id;
    INSERT INTO public.units (type, name, parent_id) VALUES ('IGREJA', 'Igreja Águas Claras', v_setor2_id) RETURNING id INTO v_igreja2_id;
    INSERT INTO public.units (type, name, parent_id) VALUES ('SUB_CONGREGACAO', 'Sub-congregação Tancredo Neves', v_igreja1_id) RETURNING id INTO v_sub_id;
    INSERT INTO public.units (type, name, parent_id) VALUES ('CELULA', 'Célula Vida Nova', v_igreja2_id) RETURNING id INTO v_celula_id;

    INSERT INTO public.churches (name, city, state, sector_id, unit_id) VALUES ('Igreja Pau da Lima', 'Salvador', 'BA', v_setor1_legacy, v_igreja1_id) RETURNING id INTO v_church1_id;
    INSERT INTO public.churches (name, city, state, sector_id, unit_id) VALUES ('Igreja Águas Claras', 'Salvador', 'BA', v_setor2_legacy, v_igreja2_id) RETURNING id INTO v_church2_id;
    INSERT INTO public.churches (name, city, state, sector_id, unit_id) VALUES ('Sub-congregação Tancredo Neves', 'Salvador', 'BA', v_setor1_legacy, v_sub_id) RETURNING id INTO v_sub_church_id;
    INSERT INTO public.churches (name, city, state, sector_id, unit_id) VALUES ('Célula Vida Nova', 'Salvador', 'BA', v_setor2_legacy, v_celula_id) RETURNING id INTO v_celula_church_id;

    INSERT INTO public.members (church_id, full_name, cpf, phone, email, registration_number, gender, civil_status) VALUES
      (v_church1_id, 'Eduardo Henrique Barbosa',      '100.400.001-00', '(71) 98811-4001', 'eduardo.barbosa.paudalima@teste.cetadp.org.br',   'PDL-001', 'Masculino', 'Casado(a)') RETURNING id INTO v_membro1_id;
    INSERT INTO public.members (church_id, full_name, cpf, phone, email, registration_number, gender, civil_status) VALUES
      (v_church1_id, 'Luciana Santos Almeida',        '100.400.002-00', '(71) 98811-4002', 'luciana.almeida.paudalima@teste.cetadp.org.br',   'PDL-002', 'Feminino',  'Solteiro(a)');
    INSERT INTO public.members (church_id, full_name, cpf, phone, email, registration_number, gender, civil_status) VALUES
      (v_church1_id, 'Gilberto Nunes da Paz',         '100.400.003-00', '(71) 98811-4003', 'gilberto.paz.paudalima@teste.cetadp.org.br',      'PDL-003', 'Masculino', 'Casado(a)');
    INSERT INTO public.members (church_id, full_name, cpf, phone, email, registration_number, gender, civil_status) VALUES
      (v_church2_id, 'Cristiane Jesus Santana',       '100.400.004-00', '(71) 98811-4004', 'cristiane.santana.paudalima@teste.cetadp.org.br', 'PDL-004', 'Feminino',  'Casado(a)');
    INSERT INTO public.members (church_id, full_name, cpf, phone, email, registration_number, gender, civil_status) VALUES
      (v_church2_id, 'Jorge Luiz Conceição',          '100.400.005-00', '(71) 98811-4005', 'jorge.conceicao.paudalima@teste.cetadp.org.br',   'PDL-005', 'Masculino', 'Solteiro(a)');
    INSERT INTO public.members (church_id, full_name, cpf, phone, email, registration_number, gender, civil_status) VALUES
      (v_church2_id, 'Vanessa Oliveira Reis',         '100.400.006-00', '(71) 98811-4006', 'vanessa.reis.paudalima@teste.cetadp.org.br',      'PDL-006', 'Feminino',  'Casado(a)');

    INSERT INTO public.professores (unit_id, sector_id, church_id, member_id, matricula, nome_completo, cargo, telefone) VALUES
      (v_igreja1_id, v_setor1_legacy, v_church1_id, v_membro1_id, 'PDL-001', 'Eduardo Henrique Barbosa', 'Professor(a) de Missiologia', '(71) 98811-4001');
  END IF;
END $$;

-- Conferência final
SELECT type, count(*) FROM public.units WHERE type IN ('SETOR','IGREJA','SUB_CONGREGACAO','CELULA') GROUP BY type ORDER BY type;
