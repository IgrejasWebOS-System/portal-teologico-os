import { redirect } from "next/navigation";
import Link from "next/link";
import { GraduationCap, Link2, Link2Off, Pencil, CheckCircle2 } from "lucide-react";
import { createClient } from "@/utils/supabase/server";
import { checkIsSecretario, getNucleosDoEscopo } from "@/utils/secretaria";
import NucleoSelector from "../NucleoSelector";
import CopiarLinkButton from "./CopiarLinkButton";
import CriarTurmaSecretariaForm from "./CriarTurmaSecretariaForm";

export const metadata = { title: "Turmas — Área da Secretaria" };

// ============================================================
// /secretaria/turmas — Etapa 2/7 (04/10/2026). Lista das turmas dos
// núcleos no escopo do secretário + formulário "Criar turma nova"
// (CriarTurmaSecretariaForm, espelha professorCriarTurmaAction).
// "Editar" leva pra ficha do professor dono da turma (/dashboard/
// configuracoes/professores/editar/[id]), que já inclui o bloco de
// vínculos de turma (ProfessorTurmasVinculos — editar/excluir vínculo,
// ativar/desativar link) — não duplicado aqui. Essa escrita em
// `professor_turmas` só ficou segura pro escopo do secretário depois
// da migration 128 (professor_turmas_write_scoped) — antes dela a
// policy de escrita não olhava unidade nenhuma.
//
// `professor_turmas` tem SELECT aberto a qualquer autenticado
// (professor_turmas_select_authenticated, qual = true) — igual
// `churches`, não dá pra confiar só na RLS pra LER com escopo. Filtra
// explicitamente pelos professores que já estão no escopo (mesma lista
// usada em /secretaria/professores).
// ============================================================

const DIA_LABEL: Record<string, string> = {
  SEGUNDA: "Segunda",
  TERCA: "Terça",
  QUARTA: "Quarta",
  QUINTA: "Quinta",
  SEXTA: "Sexta",
  SABADO: "Sábado",
  DOMINGO: "Domingo",
};

export default async function TurmasSecretariaPage({
  searchParams,
}: {
  searchParams: Promise<{ nucleo?: string; msg?: string }>;
}) {
  const { nucleo, msg } = await searchParams;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const secretario = await checkIsSecretario(supabase, user.id);
  if (!secretario) redirect("/login");

  const nucleos = await getNucleosDoEscopo(supabase);

  // Lista de professores do escopo SEM filtro de núcleo da URL — o form
  // "Criar turma nova" precisa escolher entre todos os núcleos do
  // secretário, não só o que está selecionado no topo da página.
  const { data: todosProfessoresRaw } = await supabase
    .from("professores")
    .select("id, nome_completo, church_id, churches(name)");
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const todosProfessores = (todosProfessoresRaw ?? []) as any[];

  const professores = nucleo ? todosProfessores.filter((p) => p.church_id === nucleo) : todosProfessores;
  const professorInfo = new Map(professores.map((p) => [p.id, p]));
  const professorIds = professores.map((p) => p.id);

  const { data: turmasRaw } = professorIds.length
    ? await supabase
        .from("professor_turmas")
        .select(
          "id, professor_id, turno, dia_semana, link_ativo, link_token, course_edition_id, course_editions(nome, classe, courses(title))"
        )
        .in("professor_id", professorIds)
        .order("created_at", { ascending: false })
    : { data: [] };
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const turmas = (turmasRaw ?? []) as any[];

  const { data: cursosRaw } = await supabase.from("courses").select("id, title").order("title");
  const cursos = cursosRaw ?? [];

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "";

  return (
    <div className="max-w-5xl mx-auto space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-xl bg-iw-gold/10 flex items-center justify-center shrink-0">
            <GraduationCap className="w-5 h-5 text-iw-gold" />
          </div>
          <h1 className="text-2xl font-black text-black">
            Turmas{" "}
            <span className="text-base font-normal text-black">
              - <span className="text-base font-black">{turmas.length}</span> turma{turmas.length === 1 ? "" : "s"}{" "}
              nos seus núcleos.
            </span>
          </h1>
        </div>
        <NucleoSelector nucleos={nucleos} />
      </div>

      {msg && (
        <div className="flex items-center gap-2 bg-iw-success/8 border border-iw-success/30 text-iw-success px-4 py-3 rounded-xl text-sm font-medium">
          <CheckCircle2 className="w-4 h-4 shrink-0" /> {msg}
        </div>
      )}

      <CriarTurmaSecretariaForm
        professores={todosProfessores.map((p) => ({ id: p.id, nomeCompleto: p.nome_completo, churchId: p.church_id }))}
        cursos={cursos}
        nucleos={nucleos}
      />

      {turmas.length === 0 ? (
        <div className="bg-iw-surface rounded-2xl border border-iw-gold overflow-hidden shadow-sm px-5 py-12 text-center">
          <GraduationCap className="w-10 h-10 text-iw-muted/30 mx-auto mb-3" />
          <p className="text-black text-sm font-medium">Nenhuma turma cadastrada nos seus núcleos ainda.</p>
          <p className="text-black/60 text-xs mt-1">
            Use o formulário acima pra criar a primeira turma e gerar o link de matrícula.
          </p>
        </div>
      ) : (
        <div className="bg-iw-surface rounded-2xl border border-iw-border overflow-hidden shadow-sm">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-iw-border bg-iw-bg/50">
                <th className="py-2.5 px-4 font-semibold text-iw-muted text-left">Curso / Turma</th>
                <th className="py-2.5 px-4 font-semibold text-iw-muted text-left">Núcleo</th>
                <th className="py-2.5 px-4 font-semibold text-iw-muted text-left">Professor</th>
                <th className="py-2.5 px-4 font-semibold text-iw-muted text-left">Turno</th>
                <th className="py-2.5 px-4 font-semibold text-iw-muted text-left">Dia</th>
                <th className="py-2.5 px-4 font-semibold text-iw-muted text-left">Link</th>
                <th className="py-2.5 px-4 font-semibold text-iw-muted text-left">Ações</th>
              </tr>
            </thead>
            <tbody>
              {turmas.map((t) => {
                const professor = professorInfo.get(t.professor_id);
                const label =
                  `${t.course_editions?.courses?.title ?? "Curso"} — ${t.course_editions?.nome ?? ""}` +
                  (t.course_editions?.classe ? ` (Classe ${t.course_editions.classe})` : "");
                return (
                  <tr key={t.id} className="border-b border-iw-border/50 last:border-0 hover:bg-iw-bg/30">
                    <td className="py-2.5 px-4 text-black font-medium">{label}</td>
                    <td className="py-2.5 px-4 text-black">{professor?.churches?.name ?? "—"}</td>
                    <td className="py-2.5 px-4 text-black">{professor?.nome_completo ?? "—"}</td>
                    <td className="py-2.5 px-4 text-black">{t.turno ?? "—"}</td>
                    <td className="py-2.5 px-4 text-black">{DIA_LABEL[t.dia_semana] ?? t.dia_semana ?? "—"}</td>
                    <td className="py-2.5 px-4">
                      <div className="flex items-center gap-2 flex-wrap">
                        {t.link_ativo ? (
                          <span className="inline-flex items-center gap-1 text-xs font-semibold text-iw-success">
                            <Link2 className="w-3.5 h-3.5" /> Ativo
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-xs font-semibold text-black">
                            <Link2Off className="w-3.5 h-3.5" /> Inativo
                          </span>
                        )}
                        {t.link_token && (
                          <CopiarLinkButton url={`${appUrl}/matricula-turma/${t.link_token}`} />
                        )}
                      </div>
                    </td>
                    <td className="py-2.5 px-4">
                      <Link
                        href={`/dashboard/configuracoes/professores/editar/${t.professor_id}?voltarPara=/secretaria/turmas&voltarLabel=Turmas`}
                        className="inline-flex items-center gap-1 text-xs font-semibold text-black bg-black/5 border border-black/15 rounded-lg px-3 py-1.5 shadow-sm hover:bg-black/10 transition-colors"
                      >
                        <Pencil className="w-3.5 h-3.5" /> Editar
                      </Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
