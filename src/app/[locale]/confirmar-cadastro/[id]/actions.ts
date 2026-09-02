"use server";

import { createAdminClient } from "@/utils/supabase/admin";

export type ConfirmarCadastroResultado = { ok: true } | { ok: false; erro: string };

// ============================================================
// Confirmação pública de cadastro (aluno, via QR Code — ver
// admin/matriculas/ficha-rapida). Sem sessão: identifica a ficha
// só pelo id da URL (validado de novo aqui, nunca confia no que o
// client mandou sem checar o status atual no banco).
// ============================================================

export async function confirmarCadastroAction(
  alunoId: string,
  formData: FormData
): Promise<ConfirmarCadastroResultado> {
  const admin = createAdminClient();

  const { data: aluno } = await admin
    .from("ead_alunos")
    .select("id, nome_completo, status")
    .eq("id", alunoId)
    .maybeSingle();

  if (!aluno) return { ok: false, erro: "Ficha não encontrada." };
  if (aluno.status !== "FICHA_PENDENTE") {
    return { ok: false, erro: "Este cadastro já foi confirmado anteriormente." };
  }

  const email = (formData.get("email") as string)?.trim();
  const telefone = (formData.get("telefone") as string)?.trim() || null;
  const dataNascimento = (formData.get("data_nascimento") as string) || null;
  const rg = (formData.get("rg") as string)?.trim() || null;
  const rgOrgaoEmissor = (formData.get("rg_orgao_emissor") as string)?.trim() || null;
  const rgUf = (formData.get("rg_uf") as string)?.trim() || null;
  const genero = (formData.get("genero") as string) || null;
  const estadoCivil = (formData.get("estado_civil") as string) || null;
  const escolaridade = (formData.get("escolaridade") as string) || null;
  const profissao = (formData.get("profissao") as string) || null;
  const naturalidadeCidade = (formData.get("naturalidade_cidade") as string)?.trim() || null;
  const naturalidadeEstado = (formData.get("naturalidade_estado") as string)?.trim() || null;
  const nacionalidade = (formData.get("nacionalidade") as string)?.trim() || "Brasileira";
  const nomeConjuge = (formData.get("nome_conjuge") as string)?.trim() || null;
  const nomeMae = (formData.get("nome_mae") as string)?.trim() || null;
  const nomePai = (formData.get("nome_pai") as string)?.trim() || null;
  const cep = (formData.get("cep") as string)?.trim() || null;
  const endereco = (formData.get("endereco") as string)?.trim() || null;
  const enderecoNumero = (formData.get("endereco_numero") as string)?.trim() || null;
  const enderecoComplemento = (formData.get("endereco_complemento") as string)?.trim() || null;
  const bairro = (formData.get("bairro") as string)?.trim() || null;
  const cidade = (formData.get("cidade") as string)?.trim() || null;
  const estado = (formData.get("estado") as string) || null;
  const consentimentoLgpdAceito = (formData.get("consentimento_lgpd_aceito") as string) === "true";
  const foto = formData.get("foto") as File | null;

  if (!email || !email.includes("@")) {
    return { ok: false, erro: "Informe um e-mail válido — é por ele que você vai acessar o portal." };
  }
  if (!consentimentoLgpdAceito) {
    return { ok: false, erro: "É necessário aceitar o consentimento LGPD para concluir o cadastro." };
  }

  // E-mail não pode já pertencer a outra ficha (evita colisão com a
  // regra de convite do Supabase, que exige e-mail único por usuário).
  const { data: emailEmUso } = await admin
    .from("ead_alunos")
    .select("id")
    .eq("email", email)
    .neq("id", alunoId)
    .maybeSingle();
  if (emailEmUso) {
    return { ok: false, erro: "Este e-mail já está em uso por outro cadastro. Confira ou fale com a secretaria." };
  }

  let fotoUrl: string | null = null;
  if (foto && foto.size > 0) {
    try {
      const ext = foto.name.split(".").pop() || "jpg";
      const fileName = `aluno-${alunoId}-${Date.now()}.${ext}`;
      const buffer = Buffer.from(await foto.arrayBuffer());
      const { error: uploadError } = await admin.storage
        .from("avatars")
        .upload(fileName, buffer, { contentType: foto.type || "image/jpeg" });
      if (!uploadError) {
        const { data } = admin.storage.from("avatars").getPublicUrl(fileName);
        fotoUrl = data.publicUrl;
      }
    } catch {
      // Falha no upload da foto não deve travar a confirmação do resto do
      // cadastro — a secretaria pode pedir a foto de novo depois.
    }
  }

  const { error: updateError } = await admin
    .from("ead_alunos")
    .update({
      email,
      telefone,
      data_nascimento: dataNascimento,
      rg,
      rg_orgao_emissor: rgOrgaoEmissor,
      rg_uf: rgUf,
      genero,
      estado_civil: estadoCivil,
      escolaridade,
      profissao,
      naturalidade_cidade: naturalidadeCidade,
      naturalidade_estado: naturalidadeEstado,
      nacionalidade,
      nome_conjuge: nomeConjuge,
      nome_mae: nomeMae,
      nome_pai: nomePai,
      cep,
      endereco,
      endereco_numero: enderecoNumero,
      endereco_complemento: enderecoComplemento,
      bairro,
      cidade,
      estado,
      ...(fotoUrl ? { foto_url: fotoUrl } : {}),
      consentimento_lgpd_aceito: true,
      consentimento_lgpd_data: new Date().toISOString(),
      status: "ATIVO",
    })
    .eq("id", alunoId);

  if (updateError) {
    return { ok: false, erro: "Erro ao salvar cadastro: " + updateError.message };
  }

  // Só agora, com e-mail real confirmado pelo próprio aluno, sai o
  // convite de acesso ao portal — mesma rotina usada no resto do app.
  const { data: invited, error: inviteError } = await admin.auth.admin.inviteUserByEmail(email, {
    data: { full_name: aluno.nome_completo },
    redirectTo: `${process.env.NEXT_PUBLIC_APP_URL}/auth/callback?next=/definir-senha`,
  });

  if (!inviteError && invited?.user?.id) {
    await admin.from("ead_alunos").update({ user_id: invited.user.id }).eq("id", alunoId);
  }
  // Falha no convite não desfaz o cadastro já salvo — a secretaria pode
  // gerar acesso manualmente depois se o e-mail de convite falhar.

  return { ok: true };
}
