import { createAdminClient } from "@/utils/supabase/admin";
import Logo from "@/components/Logo";
import CadastroProfessorForm, { type UnitLite, type CargoLite } from "./CadastroProfessorForm";

export const metadata = { title: "Cadastro de Professor — CETADP" };

// ============================================================
// Rota pública (sem login) — mutirão de cadastro, 18/09/2026: link
// enviado a todo professor pra ele mesmo criar seu acesso e, depois de
// logado em /professor, suas próprias turmas. Mesmo espírito de
// /confirmar-cadastro (client admin, sem sessão, form auto-contido).
//
// Campo é fixo (hoje só existe "Campo AD Brás Piracicaba" nesta
// instalação) — o professor só escolhe Setor/Regional e Igreja, mesma
// cascata já usada em Nova Turma (persona/turmas/NovaTurmaForm.tsx).
// ============================================================

export default async function CadastroProfessorPage() {
  const admin = createAdminClient();

  const [{ data: unitsRaw }, { data: cargosRaw }] = await Promise.all([
    admin.from("units").select("id, type, name, parent_id").in("type", ["SETOR", "IGREJA", "SEDE"]),
    admin.from("ecclesiastical_roles").select("id, name").order("name"),
  ]);

  const units = (unitsRaw ?? []) as UnitLite[];
  const cargos = (cargosRaw ?? []) as CargoLite[];

  return (
    <div className="min-h-screen bg-iw-bg flex items-center justify-center px-4 py-10">
      <div className="w-full max-w-2xl">
        <div className="flex justify-center mb-4">
          <Logo size="md" variant="dark" />
        </div>
        <div className="text-center mb-6">
          <p className="text-[11px] font-bold uppercase tracking-widest text-iw-gold">
            Campo AD Brás Piracicaba
          </p>
          <h1 className="text-2xl sm:text-3xl font-black text-iw-navy tracking-tight mt-1">
            Cadastro de Professor
          </h1>
          <p className="text-iw-muted text-sm mt-2 max-w-md mx-auto">
            Preencha seus dados pra criar seu acesso ao CETADP. Você recebe um e-mail pra
            definir sua senha e, depois de entrar, cria as turmas em que dá aula.
          </p>
        </div>

        <div className="bg-iw-surface rounded-2xl border border-iw-gold shadow-sm p-6 sm:p-8">
          <CadastroProfessorForm units={units} cargos={cargos} />
        </div>
      </div>
    </div>
  );
}
