import { redirect } from "next/navigation";
import { CheckCircle2, AlertTriangle } from "lucide-react";
import { createClient } from "@/utils/supabase/server";
import { createAdminClient } from "@/utils/supabase/admin";
import { checkIsProfessor } from "@/utils/professor";
import { professorAtualizarPerfilAction } from "../actions";
import ConfiguracoesPainel from "./ConfiguracoesPainel";
import TrocarSenhaCard from "./TrocarSenhaCard";

export const metadata = { title: "Configurações — Área do Professor" };

// ============================================================
// /professor/configuracoes (27/09/2026, ajustado no mesmo dia a pedido do
// Joaquim: o aviso "só a secretaria altera" saiu — o professor agora edita
// nome, CPF, cargo, igreja e setor direto por aqui, junto com telefone e
// foto que já eram editáveis). E-mail de login continua só leitura (é
// conta, não ficha).
// ============================================================

export default async function ConfiguracoesDoProfessorPage({
  searchParams,
}: {
  searchParams: Promise<{ msg?: string; error?: string }>;
}) {
  const { msg, error } = await searchParams;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const professor = await checkIsProfessor(supabase, user.id);
  if (!professor) redirect("/portal");

  const admin = createAdminClient();
  const [
    { data: setores },
    { data: churches },
    { data: cargosOpts },
    { data: sede },
    { data: generos },
    { data: estadosCivis },
    { data: escolaridadesOpts },
    { data: profissoesOpts },
  ] = await Promise.all([
    admin.from("sectors").select("id, name").order("name"),
    admin.from("churches").select("id, name, sector_id, unit_id").order("name"),
    admin.from("ecclesiastical_roles").select("id, name").order("name"),
    admin.from("units").select("id").eq("type", "SEDE").maybeSingle(),
    admin.from("settings_gender").select("id, name").order("name"),
    admin.from("settings_civil_status").select("id, name").order("name"),
    admin.from("settings_schooling").select("id, name").order("name"),
    admin.from("settings_professions").select("id, name").order("name"),
  ]);

  return (
    <div>
      <h1 className="text-2xl font-black text-black mb-6">Configurações</h1>

      {msg && (
        <div className="mb-4 max-w-lg flex items-center gap-2 bg-iw-success/8 border border-iw-success/30 text-iw-success px-4 py-3 rounded-xl text-sm font-medium">
          <CheckCircle2 className="w-4 h-4 shrink-0" /> {msg}
        </div>
      )}
      {error && (
        <div className="mb-4 max-w-lg flex items-center gap-2 bg-iw-error/8 border border-iw-error/30 text-iw-error px-4 py-3 rounded-xl text-sm font-medium">
          <AlertTriangle className="w-4 h-4 shrink-0" /> {error}
        </div>
      )}

      <ConfiguracoesPainel
        nomeInicial={professor.nome_completo}
        email={professor.email}
        cpfInicial={professor.cpf}
        cargoInicial={professor.cargo}
        sectorIdInicial={professor.sector_id}
        churchIdInicial={professor.church_id}
        telefoneInicial={professor.telefone}
        fotoUrlInicial={professor.foto_url}
        setores={setores ?? []}
        churches={churches ?? []}
        cargos={cargosOpts ?? []}
        sedeUnitId={sede?.id ?? null}
        action={professorAtualizarPerfilAction}
        fichaInicial={{
          rg: professor.rg,
          rg_orgao_emissor: professor.rg_orgao_emissor,
          rg_uf: professor.rg_uf,
          data_nascimento: professor.data_nascimento,
          genero: professor.genero,
          estado_civil: professor.estado_civil,
          escolaridade: professor.escolaridade,
          profissao: professor.profissao,
          naturalidade_cidade: professor.naturalidade_cidade,
          naturalidade_estado: professor.naturalidade_estado,
          nome_conjuge: professor.nome_conjuge,
          nome_mae: professor.nome_mae,
          nome_pai: professor.nome_pai,
          cep: professor.cep,
          endereco: professor.endereco,
          endereco_numero: professor.endereco_numero,
          endereco_complemento: professor.endereco_complemento,
          bairro: professor.bairro,
          cidade: professor.cidade,
          estado: professor.estado,
        }}
        generos={generos ?? []}
        estadosCivis={estadosCivis ?? []}
        escolaridades={escolaridadesOpts ?? []}
        profissoes={profissoesOpts ?? []}
      />

      <TrocarSenhaCard />
    </div>
  );
}
