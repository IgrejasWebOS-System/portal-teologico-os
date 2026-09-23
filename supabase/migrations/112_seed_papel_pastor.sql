-- 112_seed_papel_pastor.sql
-- 23/09/2026, pedido do Joaquim: gerenciar Liderança de Setor (pastores,
-- secretários, tesoureiros, líderes de departamento) direto na tela
-- Configurações → Líderes de Setor, reaproveitando member_functions
-- (department_id + function_role_id + escopo IGREJA/SETOR, já existente).
-- SECRETÁRIO e TESOUREIRO já estavam cadastrados em function_roles;
-- só faltava PASTOR.
--
-- Aplicado manualmente em staging via MCP nesta mesma data — registrado
-- aqui pra não ficar só como INSERT solto (ver decisão em
-- staging/governance/ERROS-COMUNS-IA.md, linha 2026-09-23). Rodar em
-- produção só depois de validado em staging, junto do restante do PR
-- desta rodada (nunca direto).

insert into function_roles (name)
select 'PASTOR'
where not exists (select 1 from function_roles where name = 'PASTOR');
