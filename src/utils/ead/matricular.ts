import type { SupabaseClient } from "@supabase/supabase-js";
import { labelCurso } from "@/utils/cursos-ead";

// ============================================================
// Auto-matrícula — decisão do CETADP de 16/07/2026: matrícula deixou
// de depender de aprovação manual da secretaria. Toda matrícula nova
// (curso gratuito, curso pago já confirmado pelo Mercado Pago, ou o
// aluno logado escolhendo o curso sozinho) passa por esta mesma
// rotina, que:
//
// 1. Resolve o curso real em `courses` (se houver correspondência —
//    hoje só Teologia Básico/Médio têm curso 1:1 cadastrado).
// 2. Reaproveita a ficha do aluno por CPF (ou por user_id, quando a
//    pessoa já está logada) se ela já existir, senão cria uma nova.
// 3. Aplica a regra do CETADP: mesmo CPF não pode ter matrícula
//    EM_ANDAMENTO/APROVADO no mesmo curso outra vez.
// 4. Gera o número de matrícula (RPC aceita chamada service_role).
// 5. Garante o acesso de login do aluno (convite por e-mail — só
//    quando ele ainda não tem `user_id`, i.e., não está logado
//    fazendo isso na hora).
// 6. Insere a linha em `ead_matriculas`.
//
// Sempre roda com o client admin (service_role) — quem chama já fez
// sua própria checagem de autorização antes (público, mas com
// pagamento confirmado; ou o próprio usuário logado se matriculando).
// Nunca usa `redirect()` aqui dentro — devolve um resultado pra quem
// chamou decidir o que fazer.
// ============================================================

const CURSO_PRETENDIDO_PARA_TITULO_CURSO: Record<string, string> = {
  TEOLOGIA_BASICO: "Curso Teológico Básico",
  TEOLOGIA_MEDIO: "Curso Teológico Médio",
};

export interface MatricularParams {
  cursoPretendido: string;
  nomeCompleto: string;
  cpf?: string | null;
  email: string;
  telefone?: string | null;
  campoMinisterioId?: string | null;
  campoMinisterioNome?: string | null;
  // Se a pessoa já está logada fazendo a própria matrícula, passa o
  // user.id aqui — pula o convite por e-mail (ela já tem acesso).
  userIdConhecido?: string | null;
  origem: "INSCRICAO_PUBLICA" | "AUTO_MATRICULA" | "MUTIRAO_LINK";
  // ── Mutirão de cadastro (18/09/2026) — matrícula vinda do link público
  // de uma turma específica (/matricula-turma/[token]): já se sabe o
  // course_id exato (pula a busca por título), a turma (course_edition_id,
  // pra o professor ver "quem entrou nesta turma"), o professor dono do
  // link, e o setor/igreja/unidade da turma (copiados pro cadastro do
  // aluno, já que ele se cadastrou por causa dela). Também aceita um
  // vínculo "soft" com members (member_id), quando o CPF bateu, e a
  // matrícula de membro que a pessoa digitou de cabeça — nunca usada
  // pra bloquear, só informativa.
  courseIdConhecido?: string | null;
  courseEditionId?: string | null;
  professorId?: string | null;
  unitId?: string | null;
  churchId?: string | null;
  sectorId?: string | null;
  memberId?: string | null;
  matriculaMembroInformada?: string | null;
}

export type MatricularResultado =
  | {
      ok: true;
      matricula: string;
      alunoId: string;
      // id da linha em ead_matriculas -- é isso (não alunoId) que
      // fin_contas_receber.origem_id precisa guardar quando
      // origem_tipo='MATRICULA_DIRETA', pro professor conseguir dar baixa
      // em parcela depois (professorBaixarParcelaAction junta origem_id
      // direto com ead_matriculas.id).
      matriculaId: string;
      courseId: string | null;
      // true = o e-mail já pertencia a outra conta (aluno de outro curso,
      // membro com login, etc.) e foi reaproveitado -- não saiu convite
      // novo. Quem chama usa isso pra não prometer "confira seu e-mail"
      // quando nenhum e-mail foi enviado de fato.
      contaExistentePromovida: boolean;
    }
  | { ok: false; erro: string };

export async function matricularAlunoEmCurso(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  admin: SupabaseClient<any>,
  params: MatricularParams
): Promise<MatricularResultado> {
  // Mutirão de cadastro: quem chamou já sabe o course_id exato (veio da
  // turma do link), não precisa resolver por título — evita um lookup a
  // mais e qualquer risco de não bater o título (ex.: curso renomeado).
  let courseId: string | null = params.courseIdConhecido ?? null;
  if (!courseId) {
    const tituloCurso = CURSO_PRETENDIDO_PARA_TITULO_CURSO[params.cursoPretendido];
    if (tituloCurso) {
      const { data: curso } = await admin.from("courses").select("id").eq("title", tituloCurso).maybeSingle();
      courseId = curso?.id ?? null;
    }
  }

  const cpfLimpo = params.cpf?.trim() || null;
  let aluno: { id: string; user_id: string | null } | null = null;

  if (params.userIdConhecido) {
    const { data } = await admin
      .from("ead_alunos")
      .select("id, user_id")
      .eq("user_id", params.userIdConhecido)
      .maybeSingle();
    aluno = data;
  }
  if (!aluno && cpfLimpo) {
    const { data } = await admin.from("ead_alunos").select("id, user_id").eq("cpf", cpfLimpo).maybeSingle();
    aluno = data;
  }

  // Convite de acesso — à prova de erro (pedido do Joaquim em 18/09/2026,
  // mutirão de cadastro): extraído em função porque é reaproveitado em
  // dois lugares — matrícula nova, e REENVIO (ver bloco de conflito logo
  // abaixo) quando a pessoa já tem cadastro+matrícula neste curso mas
  // nunca conseguiu entrar (convite caiu no spam, provedor de e-mail fora
  // do ar). Nunca desfaz o cadastro já salvo se o convite falhar — só
  // registra o resultado em convite_status pra dar pra reenviar depois
  // sem duplicar nada:
  // - ENVIADO: e-mail novo, convite saiu normalmente.
  // - ENVIADO (promovido): e-mail já pertencia a outra conta (aluno de
  //   outro curso, membro com login, etc.) — reaproveita o user_id em vez
  //   de tratar como erro (mesmo padrão de grantNucleoAccess em
  //   configuracoes/actions.ts).
  // - FALHOU: erro genuíno (rate limit do Supabase, provedor de e-mail
  //   fora do ar, etc.) — fica registrado em convite_erro pra reenviar.
  async function tentarConvite(
    alunoAtual: { id: string; user_id: string | null }
  ): Promise<{ userId: string | null; contaExistentePromovida: boolean }> {
    // Já tinha user_id antes mesmo de chegar aqui (achado por CPF/
    // userIdConhecido, ou por uma tentativa de convite anterior que já
    // tinha promovido) -- não sai convite nenhum, quem chama não deve
    // prometer "confira seu e-mail".
    if (alunoAtual.user_id) {
      return { userId: alunoAtual.user_id, contaExistentePromovida: true };
    }

    try {
      const { data: invited, error: inviteError } = await admin.auth.admin.inviteUserByEmail(params.email, {
        data: { full_name: params.nomeCompleto },
        redirectTo: `${process.env.NEXT_PUBLIC_APP_URL}/auth/callback?next=/definir-senha`,
      });

      if (invited?.user?.id) {
        await admin
          .from("ead_alunos")
          .update({
            user_id: invited.user.id,
            email: params.email,
            convite_status: "ENVIADO",
            convite_enviado_em: new Date().toISOString(),
            convite_erro: null,
          })
          .eq("id", alunoAtual.id);
        return { userId: invited.user.id, contaExistentePromovida: false };
      }

      if (inviteError) {
        // "E-mail já cadastrado" não é falha real — é sinal de que a
        // pessoa já tem login (outro curso, membro, staff). Busca o
        // user_id existente por e-mail e vincula, em vez de travar o
        // mutirão inteiro por causa disso.
        const { data: profileExistente } = await admin
          .from("profiles")
          .select("id")
          .eq("email", params.email)
          .maybeSingle();

        if (profileExistente?.id) {
          await admin
            .from("ead_alunos")
            .update({
              user_id: profileExistente.id,
              email: params.email,
              convite_status: "ENVIADO",
              convite_enviado_em: new Date().toISOString(),
              convite_erro: null,
            })
            .eq("id", alunoAtual.id);
          return { userId: profileExistente.id, contaExistentePromovida: true };
        }

        await admin
          .from("ead_alunos")
          .update({ convite_status: "FALHOU", convite_erro: inviteError.message })
          .eq("id", alunoAtual.id);
        return { userId: null, contaExistentePromovida: false };
      }
    } catch (err) {
      // inviteUserByEmail não deveria lançar, mas se lançar (rede,
      // timeout), o cadastro do aluno já está salvo — só marca o convite
      // como falho pra alguém reenviar depois.
      const msg = err instanceof Error ? err.message : "erro desconhecido";
      console.error("[matricularAlunoEmCurso] erro inesperado ao convidar aluno:", err);
      await admin.from("ead_alunos").update({ convite_status: "FALHOU", convite_erro: msg }).eq("id", alunoAtual.id);
    }

    return { userId: null, contaExistentePromovida: false };
  }

  if (aluno && courseId) {
    const { data: conflito } = await admin
      .from("ead_matriculas")
      .select("id, matricula")
      .eq("aluno_id", aluno.id)
      .eq("course_id", courseId)
      .in("status", ["EM_ANDAMENTO", "APROVADO"])
      .maybeSingle();

    if (conflito) {
      // Reenvio de convite (18/09/2026): a pessoa já tem cadastro E
      // matrícula neste curso, mas nunca conseguiu acessar (convite
      // falhou, e-mail caiu no spam, ou preencheu o formulário de novo
      // sem saber que já tinha se cadastrado antes) — em vez de bloquear
      // com "já matriculado", só tenta o convite de novo pro mesmo
      // cadastro. Só bloqueia de fato quando a pessoa já tem login ativo
      // (user_id preenchido), que aí sim é tentativa de matrícula
      // duplicada de verdade.
      if (!aluno.user_id) {
        const { contaExistentePromovida } = await tentarConvite(aluno);
        return {
          ok: true,
          matricula: conflito.matricula,
          alunoId: aluno.id,
          matriculaId: conflito.id,
          courseId,
          contaExistentePromovida,
        };
      }

      return {
        ok: false,
        erro:
          "Esta pessoa já possui matrícula em andamento ou aprovada neste curso. Só é possível matricular de novo se a tentativa anterior tiver sido reprovada.",
      };
    }
  }

  const { data: matricula, error: matriculaError } = await admin.rpc("get_next_matricula_ead");
  if (matriculaError || !matricula) {
    return { ok: false, erro: "Erro ao gerar matrícula: " + (matriculaError?.message ?? "desconhecido") };
  }

  if (!aluno) {
    const { data: novoAluno, error: alunoError } = await admin
      .from("ead_alunos")
      .insert({
        user_id: params.userIdConhecido ?? null,
        nome_completo: params.nomeCompleto,
        cpf: cpfLimpo,
        email: params.email,
        telefone: params.telefone ?? null,
        campo_ministerio_id: params.campoMinisterioId ?? null,
        campo_ministerio_nome: params.campoMinisterioNome ?? null,
        matricula,
        curso_pretendido: params.cursoPretendido,
        status: "ATIVO",
        unit_id: params.unitId ?? null,
        church_id: params.churchId ?? null,
        sector_id: params.sectorId ?? null,
        member_id: params.memberId ?? null,
        matricula_membro_informada: params.matriculaMembroInformada ?? null,
        // `tipo_aluno` tem CHECK constraint no banco (IGREJA | INTERNET |
        // OUTRA_IGREJA | NULL) -- "MEMBRO"/"EXTERNO" nunca foram valores
        // válidos, e isso quebrava todo INSERT por aqui (INSCRICAO_PUBLICA,
        // AUTO_MATRICULA e MUTIRAO_LINK) com
        // "violates check constraint ead_alunos_tipo_aluno_check". Corrigido
        // 20/09/2026 pra seguir a mesma convenção já usada em
        // admin/matriculas/actions.ts e ficha-rapida/actions.ts: IGREJA
        // quando já se sabe a igreja do aluno, null quando não.
        tipo_aluno: params.churchId ? "IGREJA" : null,
        nacionalidade: "Brasileira",
      })
      .select("id, user_id")
      .single();

    if (alunoError || !novoAluno) {
      return { ok: false, erro: "Erro ao criar aluno: " + (alunoError?.message ?? "desconhecido") };
    }
    aluno = novoAluno;
  }

  const { userId: userIdAposConvite, contaExistentePromovida } = await tentarConvite(aluno);
  if (userIdAposConvite) {
    aluno = { ...aluno, user_id: userIdAposConvite };
  }

  const { data: matriculaRow, error: matriculaInsertError } = await admin
    .from("ead_matriculas")
    .insert({
      aluno_id: aluno.id,
      course_id: courseId,
      course_edition_id: params.courseEditionId ?? null,
      professor_id: params.professorId ?? null,
      curso_nome_snapshot: labelCurso(params.cursoPretendido),
      matricula,
      status: "EM_ANDAMENTO",
      origem: params.origem,
    })
    .select("id")
    .single();

  if (matriculaInsertError || !matriculaRow) {
    return { ok: false, erro: "Erro ao registrar matrícula: " + (matriculaInsertError?.message ?? "desconhecido") };
  }

  // Também garante a matrícula no sistema genérico de aulas (enrollments),
  // que é quem controla o player de vídeo/progresso em /escola. Sem isso,
  // quem já tem matrícula oficial (ead_matriculas) ainda cairia na tela
  // de "Matricular-se nesta disciplina" ao abrir a própria aula.
  if (courseId && aluno.user_id) {
    await admin
      .from("enrollments")
      .upsert(
        { user_id: aluno.user_id, course_id: courseId, status: "ENROLLED" },
        { onConflict: "user_id,course_id", ignoreDuplicates: true }
      );
  }

  return { ok: true, matricula, alunoId: aluno.id, matriculaId: matriculaRow.id, courseId, contaExistentePromovida };
}
