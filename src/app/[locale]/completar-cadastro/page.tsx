import { redirect } from "next/navigation";
import { AlertTriangle } from "lucide-react";
import { createClient } from "@/utils/supabase/server";
import { createAdminClient } from "@/utils/supabase/admin";
import { checkIsProfessor } from "@/utils/professor";
import { resolverDestinoPosLogin } from "@/utils/aluno/destino";
import { professorPrecisaCompletar } from "@/utils/completarCadastro";
import Logo from "@/components/Logo";
import CompletarCadastroProfessorForm from "./CompletarCadastroProfessorForm";
import CompletarCadastroAlunoForm from "./CompletarCadastroAlunoForm";
import type { UnitLite, CargoLite } from "../cadastro-professor/CadastroProfessorForm";

export const metadata = { title: "Complete seu cadastro — CETADP" };

// ============================================================
// Gate pós-login do mutirão de cadastro (18/09/2026) — só alcança quem
// veio de um link público (professor por /cadastro-professor, aluno por
// /matricula-turma/[token]) com a ficha ainda incompleta; ver
// utils/completarCadastro.ts pro critério exato e os 3 pontos que
// redirecionam pra cá (loginAction, updateSession, definirSenhaAction).
//
// Quem chega aqui sem precisar (link direto, ficha já completa, ou
// cadastro feito pela secretaria/professor -- nunca passa por este
// gate) é mandado de volta pro destino normal, pra esta rota nunca
// virar um beco sem saída.
// ============================================================

export default async function CompletarCadastroPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const professor = await checkIsProfessor(supabase, user.id);

  if (professor) {
    if (!professorPrecisaCompletar(professor)) redirect("/professor");

    const admin = createAdminClient();
    const [{ data: unitsRaw }, { data: cargosRaw }] = await Promise.all([
      admin.from("units").select("id, type, name, parent_id").in("type", ["SETOR", "IGREJA", "SEDE"]),
      admin.from("ecclesiastical_roles").select("id, name").order("name"),
    ]);

    return (
      <div className="min-h-screen bg-iw-bg flex items-center justify-center px-4 py-10">
        <div className="w-full max-w-2xl">
          <div className="flex justify-center mb-4">
            <Logo size="md" variant="dark" />
          </div>
          <div className="text-center mb-6">
            <p className="text-[11px] font-bold uppercase tracking-widest text-iw-gold">CETADP</p>
            <h1 className="text-2xl sm:text-3xl font-black text-iw-navy tracking-tight mt-1">
              Complete seu cadastro
            </h1>
          </div>

          <div className="mb-6 flex items-start gap-2.5 bg-amber-50 border border-amber-200 text-amber-800 px-4 py-3.5 rounded-xl text-sm">
            <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
            <p>
              <span className="font-bold">Cadastro incompleto.</span> O preenchimento integral dos seus
              dados e o registro de ao menos uma turma são pré-requisitos operacionais deste núcleo — sem
              eles, o sistema não tem base suficiente para gerar matrículas, vincular alunos ou consolidar
              relatórios de forma confiável. Complete as etapas abaixo para liberar o acesso à sua área
              administrativa.
            </p>
          </div>

          <div className="bg-iw-surface rounded-2xl border border-iw-gold shadow-sm p-6 sm:p-8">
            <CompletarCadastroProfessorForm
              units={(unitsRaw ?? []) as UnitLite[]}
              cargos={(cargosRaw ?? []) as CargoLite[]}
              atual={{
                telefone: professor.telefone,
                cpf: professor.cpf,
                cargo: professor.cargo,
                unit_id: professor.unit_id,
              }}
            />
          </div>
        </div>
      </div>
    );
  }

  // Não é professor -- checa se é aluno vindo de um link de mutirão com
  // telefone ainda em branco (mesmo critério de
  // resolverGateCompletarCadastro, mas repetido aqui pra já ter o
  // aluno_id em mãos e não duplicar a query).
  const admin = createAdminClient();
  const { data: aluno } = await admin.from("ead_alunos").select("id, telefone").eq("user_id", user.id).maybeSingle();

  if (!aluno || aluno.telefone) {
    redirect(await resolverDestinoPosLogin(supabase, user.id));
  }

  const { data: matriculaMutirao } = await admin
    .from("ead_matriculas")
    .select("id")
    .eq("aluno_id", aluno.id)
    .eq("origem", "MUTIRAO_LINK")
    .limit(1)
    .maybeSingle();

  if (!matriculaMutirao) {
    redirect(await resolverDestinoPosLogin(supabase, user.id));
  }

  return (
    <div className="min-h-screen bg-iw-bg flex items-center justify-center px-4 py-10">
      <div className="w-full max-w-md">
        <div className="flex justify-center mb-4">
          <Logo size="md" variant="dark" />
        </div>
        <div className="text-center mb-6">
          <p className="text-[11px] font-bold uppercase tracking-widest text-iw-gold">CETADP</p>
          <h1 className="text-2xl sm:text-3xl font-black text-iw-navy tracking-tight mt-1">
            Complete seu cadastro
          </h1>
        </div>

        <div className="mb-6 flex items-start gap-2.5 bg-amber-50 border border-amber-200 text-amber-800 px-4 py-3.5 rounded-xl text-sm">
          <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
          <p>
            Informe seu telefone para liberar o acesso ao portal — é o contato que o professor e a
            secretaria usam para confirmar sua matrícula e avisos do curso.
          </p>
        </div>

        <div className="bg-iw-surface rounded-2xl border border-iw-gold shadow-sm p-6 sm:p-8">
          <CompletarCadastroAlunoForm />
        </div>
      </div>
    </div>
  );
}
