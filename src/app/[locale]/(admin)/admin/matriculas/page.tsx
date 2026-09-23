import Link from "next/link";
import { redirect } from "next/navigation";
import { GraduationCap, Plus, IdCard, Mail, QrCode, BarChart3, Search } from "lucide-react";
import { createClient } from "@/utils/supabase/server";
import { checkIsStaff } from "@/utils/staff";
import AcessoRestrito from "@/components/admin/AcessoRestrito";
import PageHeader from "@/components/layout/PageHeader";
import LinkPagamentoBanner from "./LinkPagamentoBanner";
import BotaoBaixarPdfMatricula from "./BotaoBaixarPdfMatricula";
import FiltroMatriculas from "./FiltroMatriculas";

export const metadata = { title: "Matrículas — CETADP" };

const STATUS_STYLE: Record<string, string> = {
  // Decisão do Joaquim em 13/09/2026: badge EM_ANDAMENTO passa a usar a
  // identidade visual CETADP (fundo preto + borda dourada) em vez do azul
  // genérico — só bg/border mudam, a fonte (cor/peso/tamanho do texto)
  // continua exatamente como já estava.
  EM_ANDAMENTO: "bg-[#0D0D0D] text-white border-[1.5px] border-[#CF8403]",
  APROVADO: "bg-iw-success-bg text-iw-success border-iw-success/30",
  REPROVADO: "bg-iw-error-bg text-iw-error border-iw-error/30",
  CANCELADO: "bg-iw-bg text-iw-muted border-iw-border",
};

const ORIGEM_LABEL: Record<string, string> = {
  INSCRICAO_PUBLICA: "Inscrição pública",
  MATRICULA_DIRETA: "Matrícula direta",
  MUTIRAO_LINK: "Mutirão (link de turma)",
};

interface PageProps {
  searchParams: Promise<{
    msg?: string;
    error?: string;
    link?: string;
    q?: string;
    data_inicio?: string;
    data_fim?: string;
    setor_id?: string;
    igreja_id?: string;
    todas?: string;
  }>;
}

// Busca por CPF (21/09/2026, achado em teste -- imagem 4): CPF é gravado
// com máscara (###.###.###-##) em ead_alunos.cpf, mas quem procura
// geralmente cola só os dígitos -- um ilike comparando dígitos crus contra
// o valor mascarado nunca bate. Quando a busca for só dígitos com 11
// caracteres (um CPF completo colado sem máscara), também procura a
// versão mascarada.
function possivelCpfMascarado(busca: string): string | null {
  const digitos = busca.replace(/\D/g, "");
  if (digitos.length !== 11 || digitos !== busca) return null;
  return `${digitos.slice(0, 3)}.${digitos.slice(3, 6)}.${digitos.slice(6, 9)}-${digitos.slice(9)}`;
}

function somarUmDia(iso: string): string {
  const [ano, mes, dia] = iso.split("-").map(Number);
  const d = new Date(Date.UTC(ano, mes - 1, dia + 1));
  return d.toISOString().slice(0, 10);
}

export default async function MatriculasPage({ searchParams }: PageProps) {
  const { msg, error, link, q, data_inicio, data_fim, setor_id, igreja_id, todas } = await searchParams;
  // Remove vírgula/parênteses -- têm significado especial na sintaxe de
  // filtro .or() do PostgREST (ver abaixo); sem isso, um desses caracteres
  // digitados por acaso quebraria a consulta.
  const busca = (q ?? "").trim().replace(/[,()]/g, "");
  const setorId = setor_id ?? "";
  const igrejaId = igreja_id ?? "";
  const verTodas = todas === "1";
  const temFiltroAtivo = !!(data_inicio || data_fim || setorId || igrejaId || verTodas);

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

  // Listas do painel de filtro (Setor/Regional + Igreja núcleo -- churches
  // com is_nucleo_ensino=true, mais a SEDE, ver migration 110).
  const [{ data: setoresRaw }, { data: igrejasNucleoRaw }, { data: sedeUnit }] = await Promise.all([
    supabase.from("sectors").select("id, name").order("name"),
    supabase.from("churches").select("id, name").eq("is_nucleo_ensino", true).order("name"),
    supabase.from("units").select("id").eq("type", "SEDE").maybeSingle(),
  ]);

  let sedeChurch: { id: string; name: string } | null = null;
  if (sedeUnit?.id) {
    const { data } = await supabase.from("churches").select("id, name").eq("unit_id", sedeUnit.id).maybeSingle();
    sedeChurch = data ?? null;
  }
  const igrejasNucleo = [...(igrejasNucleoRaw ?? [])];
  if (sedeChurch && !igrejasNucleo.some((i) => i.id === sedeChurch!.id)) {
    igrejasNucleo.unshift(sedeChurch);
  }

  // Busca (20/09/2026, pedido do Joaquim): pesquisa por matrícula do CURSO
  // (ead_matriculas.matricula, ex. CETADP-2026-0031), nome, CPF, ou matrícula
  // de MEMBRO informada no autocadastro (ead_alunos.matricula_membro_informada
  // -- texto livre, puramente informativo, nem sempre bate com um member_id
  // real -- ver migration 108). Setor/Igreja núcleo filtram pelo cadastro do
  // próprio aluno (ead_alunos.sector_id/church_id). Quando algum desses dois
  // está ativo, a busca por texto passa a valer só pro lado do aluno (nome/
  // CPF/matrícula de membro) -- abrir mão do "bate pelo número da matrícula
  // do curso" nesse combo específico, pra não complicar a query.
  let matriculasQuery = supabase
    .from("ead_matriculas")
    .select("*, ead_alunos(nome_completo, cpf, email, pdf_matricula_path)")
    .order("data_matricula", { ascending: false });

  const temFiltroPorAluno = !!(busca || setorId || igrejaId);
  if (temFiltroPorAluno) {
    let alunosQuery = supabase.from("ead_alunos").select("id");
    if (setorId) alunosQuery = alunosQuery.eq("sector_id", setorId);
    if (igrejaId) alunosQuery = alunosQuery.eq("church_id", igrejaId);
    if (busca) {
      alunosQuery = alunosQuery.or(
        `nome_completo.ilike.%${busca}%,cpf.ilike.%${busca}%,matricula_membro_informada.ilike.%${busca}%`
      );
    }
    const { data: alunosBatidos } = await alunosQuery;
    const alunoIds = (alunosBatidos ?? []).map((a) => a.id);

    if (busca && !setorId && !igrejaId) {
      const filtroOr =
        alunoIds.length > 0
          ? `matricula.ilike.%${busca}%,aluno_id.in.(${alunoIds.join(",")})`
          : `matricula.ilike.%${busca}%`;
      matriculasQuery = matriculasQuery.or(filtroOr);
    } else {
      // id-fantasma garante 0 resultados quando ninguém bate, em vez de
      // trazer tudo -- .in() com array vazio é ignorado pelo supabase-js.
      matriculasQuery = matriculasQuery.in(
        "aluno_id",
        alunoIds.length > 0 ? alunoIds : ["00000000-0000-0000-0000-000000000000"]
      );
    }
  }

  // Período: por padrão só mostra as matrículas de HOJE (pedido do Joaquim,
  // achado em teste -- lista tava crescendo sem filtro nenhum). "Ver todas
  // as datas" ou um Período explícito no painel de filtro substituem esse
  // padrão.
  if (data_inicio || data_fim) {
    if (data_inicio) matriculasQuery = matriculasQuery.gte("data_matricula", data_inicio);
    if (data_fim) matriculasQuery = matriculasQuery.lt("data_matricula", somarUmDia(data_fim));
  } else if (!verTodas && !busca) {
    // Busca por texto ignora o padrão "só hoje" -- procurar alguém
    // implica em achar independente de quando foi matriculado.
    const hoje = new Date().toISOString().slice(0, 10);
    matriculasQuery = matriculasQuery.gte("data_matricula", hoje).lt("data_matricula", somarUmDia(hoje));
  }

  const { data: matriculas } = await matriculasQuery;

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <PageHeader
        icon={GraduationCap}
        title="Matrículas"
        actions={
          <div className="flex items-center gap-2">
            <form action="/admin/matriculas" method="GET" className="relative">
              {/* Campos ocultos preservam o filtro do painel (Filtro) ao
                  buscar por texto -- sem isso, os dois <form> GET separados
                  se anulariam (submeter um zera o outro). */}
              {data_inicio && <input type="hidden" name="data_inicio" value={data_inicio} />}
              {data_fim && <input type="hidden" name="data_fim" value={data_fim} />}
              {setorId && <input type="hidden" name="setor_id" value={setorId} />}
              {igrejaId && <input type="hidden" name="igreja_id" value={igrejaId} />}
              {verTodas && <input type="hidden" name="todas" value="1" />}
              <Search className="w-3.5 h-3.5 text-iw-muted absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                name="q"
                defaultValue={busca}
                placeholder="Buscar por nome, CPF, matrícula..."
                className="bg-white border border-iw-border rounded-xl pl-8 pr-3 py-2.5 text-xs text-iw-navy placeholder-iw-muted focus:outline-none focus:border-iw-gold w-56"
              />
            </form>
            <FiltroMatriculas
              setores={setoresRaw ?? []}
              igrejasNucleo={igrejasNucleo}
              dataInicio={data_inicio ?? ""}
              dataFim={data_fim ?? ""}
              setorId={setorId}
              igrejaId={igrejaId}
              todas={verTodas}
              temFiltroAtivo={temFiltroAtivo}
              busca={busca}
            />
            <Link
              href="/admin/matriculas/relatorio-territorio"
              className="inline-flex items-center gap-2 bg-white hover:bg-iw-bg text-iw-navy font-bold text-xs px-4 py-2.5 rounded-xl transition-colors border border-iw-border"
            >
              <BarChart3 className="w-4 h-4" />
              Relatório por território
            </Link>
            <Link
              href="/admin/matriculas/ficha-rapida"
              className="inline-flex items-center gap-2 bg-white hover:bg-iw-bg text-iw-navy font-bold text-xs px-4 py-2.5 rounded-xl transition-colors border border-iw-border"
            >
              <QrCode className="w-4 h-4" />
              Ficha rápida (QR Code)
            </Link>
            <Link
              href="/admin/matriculas/nova"
              className="inline-flex items-center gap-2 bg-[#E88D0C] hover:opacity-90 text-white font-bold text-xs px-4 py-2.5 rounded-xl transition-opacity border border-black"
            >
              <Plus className="w-4 h-4" />
              Nova matrícula direta
            </Link>
          </div>
        }
      />

      {msg && (
        <div className="px-4 py-3 rounded-lg bg-iw-success-bg border border-iw-success text-iw-success text-sm font-medium">
          {decodeURIComponent(msg)}
        </div>
      )}
      {link && <LinkPagamentoBanner link={decodeURIComponent(link)} />}
      {!temFiltroAtivo && !busca && (
        <div className="px-4 py-2.5 rounded-lg bg-iw-bg border border-iw-border text-iw-muted text-xs">
          Mostrando só as matrículas de hoje. Use o botão <strong>Filtro</strong> pra ver outro período ou todas as datas.
        </div>
      )}
      {error && (
        <div className="px-4 py-3 rounded-lg bg-iw-error-bg border border-iw-error text-iw-error text-sm font-medium">
          {decodeURIComponent(error)}
        </div>
      )}

      {!matriculas || matriculas.length === 0 ? (
        <div className="bg-iw-surface border border-iw-border rounded-2xl p-10 text-center">
          <p className="text-iw-muted text-sm">Nenhuma matrícula registrada ainda.</p>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {matriculas.map((m) => {
            const alunoInfo = m.ead_alunos as unknown as
              | { nome_completo: string; cpf: string | null; email: string; pdf_matricula_path: string | null }
              | null;
            return (
              <Link
                key={m.id}
                href={`/admin/matriculas/${m.id}`}
                className="bg-iw-surface border border-iw-border rounded-2xl p-5 shadow-sm flex flex-col gap-2 hover:border-iw-gold/40 transition-colors"
              >
                <div className="flex items-start justify-between gap-4 flex-wrap">
                  <div>
                    <p className="font-bold text-iw-navy">{alunoInfo?.nome_completo ?? "—"}</p>
                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-1 text-xs text-iw-muted">
                      {alunoInfo?.email && (
                        <span className="inline-flex items-center gap-1">
                          <Mail className="w-3 h-3" />
                          {alunoInfo.email}
                        </span>
                      )}
                      {alunoInfo?.cpf && (
                        <span className="inline-flex items-center gap-1">
                          <IdCard className="w-3 h-3" />
                          {alunoInfo.cpf}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span
                      className={`text-[11px] font-bold uppercase px-2.5 py-1 rounded-full border ${STATUS_STYLE[m.status] ?? STATUS_STYLE.EM_ANDAMENTO}`}
                    >
                      {m.status}
                    </span>
                    {alunoInfo?.pdf_matricula_path && <BotaoBaixarPdfMatricula alunoId={m.aluno_id} />}
                  </div>
                </div>

                <div className="flex flex-wrap gap-x-6 gap-y-1 text-xs text-iw-muted">
                  <span><strong className="text-iw-navy">Curso:</strong> {m.curso_nome_snapshot}</span>
                  <span><strong className="text-iw-navy">Matrícula:</strong> {m.matricula}</span>
                  <span><strong className="text-iw-navy">Origem:</strong> {ORIGEM_LABEL[m.origem] ?? m.origem}</span>
                  {m.nota_final != null && (
                    <span><strong className="text-iw-navy">Nota final:</strong> {Number(m.nota_final).toFixed(1)}</span>
                  )}
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
