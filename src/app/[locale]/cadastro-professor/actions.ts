"use server";

import { createAdminClient } from "@/utils/supabase/admin";
import { validarCPF } from "@/utils/cpf";
import { validarEmail } from "@/utils/email";

// ============================================================
// Autocadastro público de professor (mutirão, 18/09/2026). Sem sessão —
// roda inteiro com o client admin (service_role), mesmo padrão de
// /inscricao e /confirmar-cadastro. Cria login leve (professores.user_id,
// checado por checkIsProfessor() em /professor) -- NUNCA concede acesso
// de staff/secretaria (isso é o que grantNucleoAccess em
// configuracoes/actions.ts faz, é um mecanismo à parte, mais amplo, só
// disparado quando a secretaria cadastra alguém manualmente).
// ============================================================

export type CadastroProfessorResultado =
  | { success: true; matricula: string; avisoConvite: string | null }
  | { success: false; message: string };

export async function cadastrarProfessorPublicoAction(formData: FormData): Promise<CadastroProfessorResultado> {
  const nomeCompleto = (formData.get("nome_completo") as string)?.trim();
  const email = ((formData.get("email") as string) || "").trim().toLowerCase();
  const telefone = (formData.get("telefone") as string)?.trim() || null;
  const cpf = (formData.get("cpf") as string)?.trim() || null;

  // Reduzido a 4 campos (pedido do Joaquim, 20/09/2026) -- Cargo e
  // Campo/Setor/Igreja saíram daqui; a ficha completa (com essas
  // informações) é preenchida depois, no primeiro login, em
  // /completar-cadastro (mesma tela de "Novo Professor" da secretaria).
  if (!nomeCompleto) return { success: false, message: "Nome completo é obrigatório." };
  if (!validarEmail(email)) return { success: false, message: "Informe um e-mail válido, com domínio completo (ex.: nome@provedor.com)." };
  if (!telefone) return { success: false, message: "Informe seu telefone." };
  if (!cpf || !validarCPF(cpf)) return { success: false, message: "Informe um CPF válido." };

  const admin = createAdminClient();

  // Convite de acesso -- à prova de erro (mesmo espírito de
  // matricularAlunoEmCurso). Extraído em função porque é reaproveitado em
  // dois lugares: cadastro novo, e reenvio (ver abaixo) quando alguém
  // reabre /cadastro-professor com o mesmo e-mail de um cadastro cujo
  // convite falhou (ex.: caiu no spam, provedor de e-mail fora do ar).
  async function tentarConvidarProfessor(professorId: string): Promise<string | null> {
    try {
      const { data: invited, error: inviteError } = await admin.auth.admin.inviteUserByEmail(email, {
        data: { full_name: nomeCompleto },
        redirectTo: `${process.env.NEXT_PUBLIC_APP_URL}/auth/callback?next=/definir-senha`,
      });

      if (invited?.user?.id) {
        await admin
          .from("professores")
          .update({ user_id: invited.user.id, convite_status: "ENVIADO", convite_enviado_em: new Date().toISOString(), convite_erro: null })
          .eq("id", professorId);
        return null;
      }

      if (inviteError) {
        // E-mail já pertence a outra conta (já é membro com login, já é
        // aluno de algum curso, etc.) -- reaproveita o user_id em vez de
        // travar o cadastro (mesmo padrão de grantNucleoAccess).
        const { data: profileExistente } = await admin.from("profiles").select("id").eq("email", email).maybeSingle();
        if (profileExistente?.id) {
          await admin
            .from("professores")
            .update({ user_id: profileExistente.id, convite_status: "ENVIADO", convite_enviado_em: new Date().toISOString(), convite_erro: null })
            .eq("id", professorId);
          return "Seu cadastro foi salvo. Você já tinha uma conta com este e-mail — use sua senha atual pra entrar em /professor.";
        }
        await admin.from("professores").update({ convite_status: "FALHOU", convite_erro: inviteError.message }).eq("id", professorId);
        return "Seu cadastro foi salvo, mas o e-mail de acesso não pôde ser enviado agora. A secretaria vai te ajudar a entrar — fale com o CETADP.";
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : "erro desconhecido";
      console.error("[cadastro-professor] erro inesperado ao convidar", err);
      await admin.from("professores").update({ convite_status: "FALHOU", convite_erro: msg }).eq("id", professorId);
      return "Seu cadastro foi salvo, mas o e-mail de acesso não pôde ser enviado agora. A secretaria vai te ajudar a entrar — fale com o CETADP.";
    }
    return null;
  }

  // E-mail já usado por outro professor cadastrado. Se o convite dele já
  // foi entregue (tem user_id), é duplicidade de verdade -- bloqueia. Se o
  // convite nunca chegou (FALHOU, ou nem tentou), trata como REENVIO: a
  // pessoa provavelmente está tentando de novo porque o primeiro e-mail
  // não chegou -- em vez de travar com "já existe", só reenvia o convite
  // pro mesmo cadastro, sem duplicar a ficha.
  const { data: professorExistente } = await admin
    .from("professores")
    .select("id, user_id, matricula")
    .eq("email", email)
    .maybeSingle();
  if (professorExistente) {
    if (professorExistente.user_id) {
      return {
        success: false,
        message: "Já existe um cadastro de professor com este e-mail. Se você esqueceu sua senha, use \"Esqueci minha senha\" na tela de login.",
      };
    }
    const avisoConvite = await tentarConvidarProfessor(professorExistente.id);
    return { success: true, matricula: professorExistente.matricula, avisoConvite };
  }

  // Casamento "soft" com o cadastro de membros por CPF -- nunca bloqueia
  // o cadastro, só enriquece (tipo_professor=MEMBRO, member_id) quando bate.
  let memberId: string | null = null;
  if (cpf) {
    const { data: membro } = await admin.from("members").select("id").eq("cpf", cpf).maybeSingle();
    memberId = membro?.id ?? null;
  }

  const { data: matricula, error: matriculaError } = await admin.rpc("get_next_matricula_professor");
  if (matriculaError || !matricula) {
    console.error("[cadastro-professor] get_next_matricula_professor", matriculaError);
    return { success: false, message: "Erro ao gerar seu código de cadastro. Tente novamente em instantes." };
  }

  // unit_id/sector_id/church_id/cargo ficam vazios aqui -- só são
  // preenchidos na ficha completa de /completar-cadastro, no primeiro
  // login (ver professorPrecisaCompletar em utils/completarCadastro.ts).
  const { data: professor, error: professorError } = await admin
    .from("professores")
    .insert({
      tipo_professor: memberId ? "MEMBRO" : "EXTERNO",
      member_id: memberId,
      matricula,
      nome_completo: nomeCompleto,
      telefone,
      cpf,
      email,
      cadastro_publico: true,
    })
    .select("id")
    .single();

  if (professorError || !professor) {
    console.error("[cadastro-professor] insert professores", professorError);
    return { success: false, message: "Erro ao salvar seu cadastro. Tente novamente." };
  }

  const avisoConvite = await tentarConvidarProfessor(professor.id);

  return { success: true, matricula, avisoConvite };
}
