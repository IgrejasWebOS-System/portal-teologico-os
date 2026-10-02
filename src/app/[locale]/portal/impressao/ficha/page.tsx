import { redirect } from "next/navigation";
import { createClient } from "@/utils/supabase/server";
import { createAdminClient } from "@/utils/supabase/admin";
import { resolverAlunoParaImpressao } from "@/utils/aluno/matriculaAtiva";
import ImpressaoShell from "@/components/impressao/ImpressaoShell";

export const metadata = { title: "Ficha do Aluno" };

interface PageProps {
  searchParams: Promise<{ alunoId?: string }>;
}

function fmtData(iso: string | null) {
  if (!iso) return "—";
  return new Date(iso.length === 10 ? iso + "T00:00:00" : iso).toLocaleDateString("pt-BR");
}

function fmtCentavos(centavos: number | null | undefined) {
  if (!centavos) return "—";
  return (centavos / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

// ============================================================
// Ficha do Aluno (/portal/impressao/ficha) — 24/09/2026, achado em
// teste (Joaquim): esta tela mostrava só 6+4 campos soltos, bem
// diferente do padrão oficial já usado em gerarPdfMatricula (MATRIZ
// FICHA ALUNO.pdf) — Curso e Vínculo / Dados Pessoais completos /
// Endereço / Pagamento / Consentimento LGPD. Reescrita pra seguir
// exatamente essas mesmas seções, buscando os dados extras (professor,
// turma, setor/igreja, parcelas em fin_contas_receber) que a versão
// antiga não buscava.
// ============================================================
export default async function FichaAlunoPage({ searchParams }: PageProps) {
  const { alunoId } = await searchParams;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const dados = await resolverAlunoParaImpressao(supabase, user.id, alunoId);
  if (!dados) redirect("/portal");
  const { aluno, matricula } = dados;

  const admin = createAdminClient();

  const [{ data: turma }, { data: professor }, { data: sector }, { data: church }, { data: parcelas }] =
    await Promise.all([
      matricula?.course_edition_id
        ? admin.from("course_editions").select("nome, classe").eq("id", matricula.course_edition_id).maybeSingle()
        : Promise.resolve({ data: null }),
      matricula?.professor_id
        ? admin.from("professores").select("nome_completo").eq("id", matricula.professor_id).maybeSingle()
        : Promise.resolve({ data: null }),
      aluno.sector_id
        ? admin.from("sectors").select("name").eq("id", aluno.sector_id).maybeSingle()
        : Promise.resolve({ data: null }),
      aluno.church_id
        ? admin.from("churches").select("name").eq("id", aluno.church_id).maybeSingle()
        : Promise.resolve({ data: null }),
      matricula
        ? admin
            .from("fin_contas_receber")
            .select("descricao, valor_bruto_centavos, total_parcelas, numero_parcela, data_vencimento, forma_pagamento_prevista, responsavel_pagamento")
            .eq("origem_tipo", "MATRICULA_DIRETA")
            .eq("origem_id", matricula.id)
            .order("numero_parcela")
        : Promise.resolve({ data: null }),
    ]);

  const contaMatricula = (parcelas ?? []).find((p) => p.descricao.startsWith("Matrícula"));
  const contaMensalidade = (parcelas ?? []).find((p) => p.descricao.startsWith("Mensalidade"));
  const temPagamento = !!contaMensalidade;

  return (
    <ImpressaoShell
      titulo="Ficha do Aluno"
      voltarPara={
        alunoId
          ? `/dashboard/configuracoes/persona/alunos/${alunoId}`
          : matricula?.course_id
            ? `/escola/${matricula.course_id}`
            : "/escola"
      }
    >
      {/* Curso e Vínculo */}
      <Secao titulo="Curso e Vínculo">
        <div className="flex items-start gap-6">
          {/* 25/09/2026, achado em teste (Joaquim): a foto tinha sido
              colocada à DIREITA, mas o layout oficial (MATRIZ FICHA
              ALUNO.pdf, o mesmo gerado por gerarPdfMatricula em
              admin/matriculas) coloca a foto à ESQUERDA, alinhada com toda
              a seção "Curso e Vínculo" — reposicionado pra bater exatamente
              com esse padrão. */}
          {/* 25/09/2026, pedido do Joaquim: o padrão de foto do sistema é
              redondo (igual completar-cadastro e o avatar do professor),
              não quadrado com cantos arredondados. */}
          {aluno.foto_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={aluno.foto_url}
              alt={`Foto de ${aluno.nome_completo}`}
              className="w-24 h-24 rounded-full object-cover border border-iw-border shrink-0 print:w-20 print:h-20"
            />
          ) : (
            <div className="w-24 h-24 rounded-full border border-dashed border-iw-border shrink-0 print:w-20 print:h-20" />
          )}
          <dl className="grid grid-cols-2 sm:grid-cols-3 gap-x-6 gap-y-4 text-sm flex-1">
            <Campo label="Matrícula" valor={matricula?.matricula ?? "—"} />
            <Campo label="Curso" valor={matricula?.curso_nome_snapshot ?? "—"} />
            <Campo label="Turma" valor={turma ? `${turma.nome}${turma.classe ? ` (Classe ${turma.classe})` : ""}` : "—"} />
            <Campo label="Professor(a)" valor={professor?.nome_completo ?? "—"} />
            <Campo label="Campo / Ministério" valor={aluno.campo_ministerio_nome ?? "—"} />
            <Campo label="Setor / Igreja" valor={[sector?.name, church?.name].filter(Boolean).join(" — ") || "—"} />
          </dl>
        </div>
      </Secao>

      {/* Dados Pessoais */}
      <Secao titulo="Dados Pessoais">
        <dl className="grid grid-cols-2 sm:grid-cols-3 gap-x-6 gap-y-4 text-sm">
          <Campo label="Nome completo" valor={aluno.nome_completo} full />
          <Campo label="CPF" valor={aluno.cpf ?? "—"} />
          <Campo label="Data de nascimento" valor={fmtData(aluno.data_nascimento)} />
          <Campo label="E-mail" valor={aluno.email} />
          <Campo label="Telefone" valor={aluno.telefone ?? "—"} />
          <Campo label="RG" valor={[aluno.rg, aluno.rg_orgao_emissor, aluno.rg_uf].filter(Boolean).join(" / ") || "—"} />
          <Campo label="Sexo" valor={aluno.genero ?? "—"} />
          <Campo label="Estado civil" valor={aluno.estado_civil ?? "—"} />
          <Campo label="Escolaridade" valor={aluno.escolaridade ?? "—"} />
          <Campo label="Profissão" valor={aluno.profissao ?? "—"} />
          <Campo label="Naturalidade" valor={[aluno.naturalidade_cidade, aluno.naturalidade_estado].filter(Boolean).join(" / ") || "—"} />
          <Campo label="Nacionalidade" valor={aluno.nacionalidade ?? "—"} />
          <Campo label="Cônjuge" valor={aluno.nome_conjuge ?? "—"} />
          <Campo label="Nome da mãe" valor={aluno.nome_mae ?? "—"} />
          <Campo label="Nome do pai" valor={aluno.nome_pai ?? "—"} />
        </dl>
      </Secao>

      {/* Endereço */}
      <Secao titulo="Endereço">
        <dl className="grid grid-cols-2 sm:grid-cols-3 gap-x-6 gap-y-4 text-sm">
          <Campo label="CEP" valor={aluno.cep ?? "—"} />
          <Campo label="Endereço" valor={aluno.endereco ?? "—"} />
          <Campo label="Número" valor={aluno.endereco_numero ?? "—"} />
          <Campo label="Complemento" valor={aluno.endereco_complemento ?? "—"} />
          <Campo label="Bairro" valor={aluno.bairro ?? "—"} />
          <Campo label="Cidade / UF" valor={[aluno.cidade, aluno.estado].filter(Boolean).join(" / ") || "—"} />
        </dl>
      </Secao>

      {/* Pagamento */}
      {temPagamento && (
        <Secao titulo="Pagamento">
          <dl className="grid grid-cols-2 sm:grid-cols-3 gap-x-6 gap-y-4 text-sm">
            <Campo label="Valor da matrícula" valor={fmtCentavos(contaMatricula?.valor_bruto_centavos)} />
            <Campo label="Valor da parcela" valor={fmtCentavos(contaMensalidade?.valor_bruto_centavos)} />
            <Campo label="Parcelas" valor={String(contaMensalidade?.total_parcelas ?? "—")} />
            <Campo label="1º vencimento" valor={fmtData(contaMensalidade?.data_vencimento ?? null)} />
            <Campo label="Forma de pagamento" valor={contaMensalidade?.forma_pagamento_prevista ?? "—"} />
            <Campo label="Quem paga" valor={contaMensalidade?.responsavel_pagamento ?? "—"} />
          </dl>
        </Secao>
      )}

      {/* Consentimento LGPD */}
      <div className="mt-8 pt-6 border-t border-iw-border">
        <p className="text-xs font-bold text-[#CF8403] uppercase tracking-wider mb-2">Consentimento LGPD</p>
        <p className="text-xs text-iw-navy font-semibold">Aluno: {aluno.nome_completo}</p>
        {professor?.nome_completo && (
          <p className="text-xs text-iw-navy font-semibold">Professor(a) responsável: {professor.nome_completo}</p>
        )}
        <p className="text-xs text-iw-muted mt-2 leading-relaxed">
          Declaro estar ciente das informações acima e autorizo o uso e tratamento dos meus dados pessoais para
          cadastro, de acordo com os artigos 7º e 11 da Lei nº 13.709/2018 (LGPD).
        </p>
      </div>

      <p className="mt-10 text-[11px] text-iw-muted/70 text-center print:mt-16">
        Documento gerado pelo Portal do Aluno CETADP em {new Date().toLocaleDateString("pt-BR")} — uso informativo, sem valor de certidão oficial.
      </p>
    </ImpressaoShell>
  );
}

function Secao({ titulo, children }: { titulo: string; children: React.ReactNode }) {
  return (
    <div className="mb-6 pb-6 border-b border-iw-border last:border-b-0">
      <p className="text-xs font-bold text-iw-muted uppercase tracking-wider mb-3">{titulo}</p>
      {children}
    </div>
  );
}

function Campo({ label, valor, full = false }: { label: string; valor: string; full?: boolean }) {
  return (
    <div className={full ? "col-span-2 sm:col-span-3" : undefined}>
      <p className="text-[10px] font-bold text-iw-muted uppercase tracking-wider">{label}</p>
      <p className="text-sm text-iw-navy font-semibold mt-0.5">{valor}</p>
    </div>
  );
}
