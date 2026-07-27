-- 068: Flag piloto — usuário autorizado a usar o scanner de provas (OMR) no mobile
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS pode_escanear_provas boolean NOT NULL DEFAULT false;
