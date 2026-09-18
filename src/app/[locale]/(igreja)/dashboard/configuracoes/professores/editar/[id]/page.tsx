import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, GraduationCap } from "lucide-react";
import { createClient } from "@/utils/supabase/server";
import ProfessorForm from "../../ProfessorForm";
import ProfessorTurmasVinculos, { type VinculoExistente } from "../../ProfessorTurmasVinculos";

interface PageProps {
  params: Promise<{ id: string }>;
}

type VinculoRow = {
  id: string;
  turno: string;
  dia_semana: string;
  course_editions: { nome: string; classe: string | null; units: { name: string } | null; courses: { title: string } | null } | null;
};

const CAMPOS_PROFESSOR =
  "id, unit_id, member_id, matricula, nome_completo, cargo, telefone, tipo_professor, cpf, rg, rg_orgao_emissor, rg_uf, data_nascimento, genero, estado_civil, escolaridade, profissao, naturalidade_cidade, naturalidade_estado, nacionalidade, nome_conjuge, nome_mae, nome_pai, cep, endereco, endereco_numero, endereco_complemento, bairro, cidade, estado";

export default async function EditarProfessorPage({ params }: PageProps) {
  const { id } = await params;
  const supabase = await createClient();

  const [{ data: professor }, unitsRes, churchesRes, { data: cursos }, { data: vinculosRaw }, { data: generos }, { data: estadosCivis }, { data: escolaridadesOpts }, { data: profissoesOpts }] = await Promise.all([
    supabase.from("professores").select(CAMPOS_PROFESSOR).eq("id", id).maybeSingle(),
    supabase.from("units").select("id, type, name, parent_id"),
    supabase.from("churches").select("id, unit_id"),
    supabase.from("courses").select("id, title").order("title"),
    supabase
      .from("professor_turmas")
      .select("id, turno, dia_semana, course_editions(nome, classe, units(name), courses(title))")
      .eq("professor_id", id)
      .order("dia_semana"),
    supabase.from("settings_gender").select("id, name").order("name"),
    supabase.from("settings_civil_status").select("id, name").order("name"),
    supabase.from("settings_schooling").select("id, name").order("name"),
    supabase.from("settings_professions").select("id, name").order("name"),
  ]);

  if (!professor) notFound();

  const vinculos: VinculoExistente[] = ((vinculosRaw ?? []) as unknown as VinculoRow[]).map((v) => ({
    id: v.id,
    turno: v.turno,
    dia_semana: v.dia_semana,
    turmaNome: v.course_editions?.nome ?? "—",
    classe: v.course_editions?.classe ?? null,
    cursoTitle: v.course_editions?.courses?.title ?? null,
    igrejaNome: v.course_editions?.units?.name ?? null,
  }));

  const unitsParaCascata = (unitsRes.data ?? []).filter((u) => ["SETOR", "IGREJA", "SEDE"].includes(u.type));

  return (
    <div className="w-full space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-2">
        <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
          <GraduationCap className="w-6 h-6 text-iw-gold shrink-0" />
          <h1 className="text-2xl font-black text-iw-navy tracking-tight">Editar Professor</h1>
          <p className="text-iw-muted text-sm">{professor.nome_completo}</p>
        </div>
        <Link
          href="/dashboard/configuracoes/professores"
          className="shrink-0 px-5 py-2.5 rounded-xl bg-iw-blue text-white text-sm font-bold uppercase tracking-wider hover:bg-iw-navy transition-colors shadow-sm inline-flex items-center gap-2"
        >
          <ArrowLeft className="w-4 h-4" />
          Voltar
        </Link>
      </div>

      <ProfessorForm
        units={unitsRes.data ?? []}
        churches={churchesRes.data ?? []}
        generos={generos ?? []}
        estadosCivis={estadosCivis ?? []}
        escolaridades={escolaridadesOpts ?? []}
        profissoes={profissoesOpts ?? []}
        submitLabel="Salvar alterações"
        existing={{
          id: professor.id,
          unitId: professor.unit_id,
          memberId: professor.member_id,
          matricula: professor.matricula,
          nome: professor.nome_completo,
          cargo: professor.cargo,
          telefone: professor.telefone,
          cpf: professor.cpf,
          rg: professor.rg,
          rgOrgaoEmissor: professor.rg_orgao_emissor,
          rgUf: professor.rg_uf,
          dataNascimento: professor.data_nascimento,
          genero: professor.genero,
          estadoCivil: professor.estado_civil,
          escolaridade: professor.escolaridade,
          profissao: professor.profissao,
          naturalidadeCidade: professor.naturalidade_cidade,
          naturalidadeEstado: professor.naturalidade_estado,
          nacionalidade: professor.nacionalidade,
          nomeConjuge: professor.nome_conjuge,
          nomeMae: professor.nome_mae,
          nomePai: professor.nome_pai,
          cep: professor.cep,
          endereco: professor.endereco,
          enderecoNumero: professor.endereco_numero,
          enderecoComplemento: professor.endereco_complemento,
          bairro: professor.bairro,
          cidade: professor.cidade,
          estado: professor.estado,
        }}
      />

      <ProfessorTurmasVinculos
        professorId={professor.id}
        units={unitsParaCascata}
        cursos={cursos ?? []}
        vinculos={vinculos}
      />
    </div>
  );
}
