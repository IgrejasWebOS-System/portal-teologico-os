-- Popula as tabelas auxiliares usadas em Configurações (módulo Igreja):
-- gênero, estado civil, escolaridade, profissões, cargos eclesiásticos,
-- departamentos e regiões administrativas do DF. Todas estavam vazias.

INSERT INTO public.settings_gender (name) VALUES
  ('Masculino'), ('Feminino');

INSERT INTO public.settings_civil_status (name) VALUES
  ('Solteiro(a)'), ('Casado(a)'), ('Divorciado(a)'), ('Viúvo(a)'),
  ('União Estável'), ('Separado(a) Judicialmente');

INSERT INTO public.settings_schooling (name) VALUES
  ('Analfabeto'), ('Fundamental Incompleto'), ('Fundamental Completo'),
  ('Médio Incompleto'), ('Médio Completo'), ('Superior Incompleto'),
  ('Superior Completo'), ('Pós-Graduação'), ('Mestrado'), ('Doutorado');

INSERT INTO public.ecclesiastical_roles (name) VALUES
  ('Membro'), ('Obreiro(a)'), ('Auxiliar de Obreiro'), ('Diácono'),
  ('Diaconisa'), ('Presbítero'), ('Evangelista'), ('Missionário(a)'),
  ('Pastor'), ('Pastor Auxiliar'), ('Pastor Presidente'),
  ('Líder de Departamento'), ('Cooperador(a)');

INSERT INTO public.departments (name) VALUES
  ('CIBEPI'), ('EBD - Escola Bíblica Dominical'), ('Jovens'), ('Mocidade'),
  ('Ministério de Louvor'), ('Diaconato'), ('Presbitério'), ('Missões'),
  ('Ação Social'), ('Círculo de Oração (Mulheres)'), ('Homens em Ação'),
  ('Infantil / Crianças'), ('Casais');

INSERT INTO public.settings_professions (name) VALUES
  ('Pastor(a)'), ('Professor(a)'), ('Estudante'), ('Autônomo(a)'),
  ('Comerciante'), ('Empresário(a)'), ('Vendedor(a)'), ('Motorista'),
  ('Doméstica'), ('Diarista'), ('Pedreiro'), ('Eletricista'), ('Encanador'),
  ('Mecânico'), ('Cabeleireiro(a)'), ('Manicure'), ('Cozinheiro(a)'),
  ('Costureira'), ('Enfermeiro(a)'), ('Técnico(a) de Enfermagem'),
  ('Médico(a)'), ('Dentista'), ('Advogado(a)'), ('Contador(a)'),
  ('Engenheiro(a)'), ('Arquiteto(a)'), ('Administrador(a)'),
  ('Analista de Sistemas'), ('Programador(a)'), ('Designer'),
  ('Jornalista'), ('Policial'), ('Militar'), ('Bombeiro'), ('Segurança'),
  ('Auxiliar Administrativo'), ('Recepcionista'), ('Secretário(a)'),
  ('Bancário(a)'), ('Agricultor(a)'), ('Pecuarista'), ('Pescador(a)'),
  ('Pintor(a)'), ('Marceneiro(a)'), ('Padeiro(a)'), ('Confeiteiro(a)'),
  ('Garçom / Garçonete'), ('Motoboy'), ('Caminhoneiro(a)'),
  ('Aposentado(a)'), ('Do Lar'), ('Desempregado(a)'), ('Outra');

INSERT INTO public.settings_custom_regions (state_uf, name) VALUES
  ('DF', 'Plano Piloto'), ('DF', 'Gama'), ('DF', 'Taguatinga'),
  ('DF', 'Brazlândia'), ('DF', 'Sobradinho'), ('DF', 'Sobradinho II'),
  ('DF', 'Planaltina'), ('DF', 'Paranoá'), ('DF', 'Núcleo Bandeirante'),
  ('DF', 'Ceilândia'), ('DF', 'Guará'), ('DF', 'Cruzeiro'),
  ('DF', 'Samambaia'), ('DF', 'Santa Maria'), ('DF', 'São Sebastião'),
  ('DF', 'Recanto das Emas'), ('DF', 'Lago Sul'), ('DF', 'Riacho Fundo'),
  ('DF', 'Riacho Fundo II'), ('DF', 'Lago Norte'), ('DF', 'Candangolândia'),
  ('DF', 'Águas Claras'), ('DF', 'Sudoeste/Octogonal'), ('DF', 'Varjão'),
  ('DF', 'Park Way'), ('DF', 'SCIA/Estrutural'), ('DF', 'Jardim Botânico'),
  ('DF', 'Itapoã'), ('DF', 'SIA'), ('DF', 'Vicente Pires'), ('DF', 'Fercal'),
  ('DF', 'Sol Nascente/Pôr do Sol'), ('DF', 'Arniqueira');
