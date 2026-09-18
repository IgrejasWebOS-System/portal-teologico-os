import { redirect } from "next/navigation";
import { createClient } from "@/utils/supabase/server";
import { checkIsStaff } from "@/utils/staff";
import AcessoRestrito from "@/components/admin/AcessoRestrito";
import NovaMatriculaForm from "./NovaMatriculaForm";

export const metadata = { title: "Nova Matrícula — CETADP" };

interface PageProps {
  searchParams: Promise<{ error?: string }>;
}

export default async function NovaMatriculaPage({ searchParams }: PageProps) {
  const { error } = await searchParams;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const isStaff = await checkIsStaff(supabase, user.id);
  if (!isStaff) {
    return (
      <div className="min-h-screen flex items-center px-8">
        <AcessoRestrito />
      </div>
    );
  }

  const [
    { data: campos },
    { data: cursos },
    { data: churches },
    { data: setores },
    { data: turmas },
    { data: professores },
    { data: precos },
    { data: sedeUnit },
  ] = await Promise.all([
    supabase.from("ead_campos_ministerios").select("id, nome, tipo").eq("ativo", true).order("nome"),
    supabase.from("courses").select("id, title, module").order("title"),
    supabase.from("churches").select("id, name, sector_id, unit_id").order("name"),
    supabase.from("sectors").select("id, name").order("name"),
    // Só as turmas SEM igreja específica (genéricas) entram pré-carregadas —
    // com 6.800+ turmas geradas em lote (uma por igreja), buscar tudo de
    // cara batia no limite padrão de 1000 linhas do Supabase e cortava as
    // turmas 2/3/4 de quase toda igreja, sobrando só "Turma 1" pra ver
    // (14/09/2026). As turmas de cada igreja agora são buscadas sob
    // demanda (buscarTurmasPorUnidadeAction) assim que ela é selecionada.
    supabase.from("course_editions").select("id, nome, classe, course_id, unit_id, ano").is("unit_id", null).order("nome"),
    supabase.from("professores").select("id, nome_completo, church_id").order("nome_completo"),
    supabase.from("course_pricing").select("course_id, valor_matricula_centavos, valor_parcela_centavos, numero_parcelas"),
    // Sede não é Setor nem Regional — fica acima desse nível na hierarquia
    // (churches.sector_id dela é nulo). Sem isso, ela some da caixa "Igreja
    // (núcleo)" assim que qualquer Setor é escolhido (14/09/2026).
    supabase.from("units").select("id").eq("type", "SEDE").maybeSingle(),
  ]);

  return (
    <NovaMatriculaForm
      campos={campos ?? []}
      cursos={cursos ?? []}
      churches={churches ?? []}
      setores={setores ?? []}
      turmasIniciais={turmas ?? []}
      professoresIniciais={professores ?? []}
      precos={precos ?? []}
      sedeUnitId={sedeUnit?.id ?? null}
      errorMsg={error ? decodeURIComponent(error) : undefined}
    />
  );
}
