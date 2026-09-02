-- Concede nível 0 (Super-Master) aos 5 e-mails reais que hoje
-- administram o sistema, ligando pelo UUID de auth.users.
--
-- Guarda de portabilidade (adicionada ao versionar este arquivo):
-- nenhum desses 5 UUIDs de auth.users existe em ambientes que não
-- sejam produção (branches não herdam auth.users). O
-- WHERE EXISTS abaixo faz cada linha virar um no-op seguro quando o
-- usuário não existe no ambiente, em vez de violar a FK
-- admin_roles_user_id_fkey e quebrar a cadeia inteira — mesma
-- lógica já aplicada em 014/032/040/041.

INSERT INTO public.admin_roles (user_id, level, unit_id, role_title)
SELECT v.user_id, 0, NULL, 'Super-Master'
FROM (VALUES
  ('2863f041-5445-445a-87f7-52d6e0095540'::uuid),
  ('2ace841a-e8e2-4ac0-8730-a6e5d6957d61'::uuid),
  ('3b079167-cfb4-4a71-91ad-6ac7b2341c0b'::uuid),
  ('b5db16a6-388d-43d6-be54-e3bc890f0d8a'::uuid),
  ('7f400120-5195-448b-941c-52a5a34cba84'::uuid)
) AS v(user_id)
WHERE EXISTS (SELECT 1 FROM auth.users u WHERE u.id = v.user_id)
ON CONFLICT (user_id) WHERE level = 0 DO NOTHING;
