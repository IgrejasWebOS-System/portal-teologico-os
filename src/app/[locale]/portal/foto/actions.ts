"use server";

import { createClient } from "@/utils/supabase/server";
import { createAdminClient } from "@/utils/supabase/admin";

// ============================================================
// O aluno adiciona/troca a PRÓPRIA foto pelo menu lateral (10/10/2026, pedido
// do Joaquim). A foto mora num único lugar — ead_alunos.foto_url — que é o
// mesmo campo lido pela Ficha, pelo cadastro (admin/secretaria/professor) e
// pelo menu; atualizar aqui atualiza em todos eles. (PDFs de matrícula já
// gerados são arquivos prontos e não mudam.)
// ============================================================

const TAMANHO_MAX = 5 * 1024 * 1024; // 5 MB
const TIPOS_OK = ["image/jpeg", "image/png", "image/webp"];

export async function atualizarMinhaFotoAction(
  formData: FormData
): Promise<{ ok: true; fotoUrl: string } | { ok: false; erro: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, erro: "Sessão expirada. Entre novamente." };

  const foto = formData.get("foto");
  if (!(foto instanceof File) || foto.size === 0) return { ok: false, erro: "Selecione uma imagem." };
  if (!TIPOS_OK.includes(foto.type)) return { ok: false, erro: "Use uma imagem JPG, PNG ou WEBP." };
  if (foto.size > TAMANHO_MAX) return { ok: false, erro: "A imagem passa de 5 MB. Escolha uma menor." };

  // A foto é sempre do aluno LOGADO (ead_alunos.user_id) — nunca de um id vindo do formulário.
  const admin = createAdminClient();
  const { data: aluno } = await admin.from("ead_alunos").select("id").eq("user_id", user.id).maybeSingle();
  if (!aluno) return { ok: false, erro: "Cadastro de aluno não encontrado para este acesso." };

  const ext = foto.type === "image/png" ? "png" : foto.type === "image/webp" ? "webp" : "jpg";
  const fileName = `aluno-${aluno.id}-${Date.now()}.${ext}`;
  const buffer = Buffer.from(await foto.arrayBuffer());
  const { error: uploadError } = await admin.storage.from("avatars").upload(fileName, buffer, { contentType: foto.type });
  if (uploadError) return { ok: false, erro: "Não foi possível enviar a foto: " + uploadError.message };

  const fotoUrl = admin.storage.from("avatars").getPublicUrl(fileName).data.publicUrl;
  const { error } = await admin.from("ead_alunos").update({ foto_url: fotoUrl }).eq("id", aluno.id);
  if (error) return { ok: false, erro: "Não foi possível salvar a foto: " + error.message };

  return { ok: true, fotoUrl };
}
