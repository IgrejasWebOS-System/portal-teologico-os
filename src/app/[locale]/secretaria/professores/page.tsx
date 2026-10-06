import { redirect } from "next/navigation";
import Link from "next/link";
import { GraduationCap, Pencil, CheckCircle2, UserPlus, AlertTriangle } from "lucide-react";
import ReenviarLinkButton from "@/components/ui/ReenviarLinkButton";
import { createClient } from "@/utils/supabase/server";
import { checkIsSecretario, getNucleosDoEscopo } from "@/utils/secretaria";
import { secretariaReenviarLinkProfessorAction } from "../actions";
import NucleoSelector from "../NucleoSelector";

export const metadata = { title: "Professores — Área da Secretaria" };

// ============================================================
// /secretaria/professores — Etapa 1 (04/10/2026). Lista enxuta dos
// professores dentro do escopo do secretário (mesmo princípio das
// outras páginas: client normal/RLS, migration 111 já escopa
// `professores` por unit_id sozinha). Cadastrar um professor novo
// continua pela tela de Configurações (addProfessorAction) — entra
// aqui como atalho numa próxima etapa, não hoje.
// ============================================================

export default async function ProfessoresSecretariaPage({
  searchParams,
}: {
  searchParams: Promise<{ nucleo?: string; msg?: string; error?: string }>;
}) {
  const { nucleo, msg, error } = await searchParams;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const secretario = await checkIsSecretario(supabase, user.id);
  if (!secretario) redirect("/login");

  const nucleos = await getNucleosDoEscopo(supabase);

  let query = supabase
    .from("professores")
    .select("id, nome_completo, cargo, telefone, email, matricula, church_id, churches(name)")
    .order("nome_completo");
  if (nucleo) query = query.eq("church_id", nucleo);
  const { data: professoresRaw } = await query;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const professores = (professoresRaw ?? []) as any[];

  return (
    <div className="max-w-5xl mx-auto space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-xl bg-iw-gold/10 flex items-center justify-center shrink-0">
            <GraduationCap className="w-5 h-5 text-iw-gold" />
          </div>
          <h1 className="text-2xl font-black text-black">
            Professores{" "}
            <span className="text-base font-normal text-black">
              - <span className="text-base font-black">{professores.length}</span> professor
              {professores.length === 1 ? "" : "es"} nos seus núcleos.
            </span>
          </h1>
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          <Link
            href="/secretaria/professores/novo"
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-black text-iw-gold text-sm font-bold uppercase tracking-wider hover:opacity-90 transition-opacity shadow-sm"
          >
            <UserPlus className="w-4 h-4" /> Novo Professor
          </Link>
          <NucleoSelector nucleos={nucleos} />
        </div>
      </div>

      {msg && (
        <div className="flex items-center gap-2 bg-iw-success/8 border border-iw-success/30 text-iw-success px-4 py-3 rounded-xl text-sm font-medium">
          <CheckCircle2 className="w-4 h-4 shrink-0" /> {msg}
        </div>
      )}
      {error && (
        <div className="flex items-center gap-2 bg-iw-error/8 border border-iw-error/30 text-iw-error px-4 py-3 rounded-xl text-sm font-medium">
          <AlertTriangle className="w-4 h-4 shrink-0" /> {error}
        </div>
      )}

      {professores.length === 0 ? (
        <div className="bg-iw-surface rounded-2xl border border-iw-gold overflow-hidden shadow-sm px-5 py-12 text-center">
          <GraduationCap className="w-10 h-10 text-iw-muted/30 mx-auto mb-3" />
          <p className="text-black text-sm font-medium">Nenhum professor cadastrado nos seus núcleos ainda.</p>
        </div>
      ) : (
        <div className="bg-iw-surface rounded-2xl border border-iw-border overflow-hidden shadow-sm">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-iw-border bg-iw-bg/50">
                <th className="py-2.5 px-4 font-semibold text-iw-muted text-left">Nome</th>
                <th className="py-2.5 px-4 font-semibold text-iw-muted text-left">Cargo</th>
                <th className="py-2.5 px-4 font-semibold text-iw-muted text-left">Núcleo</th>
                <th className="py-2.5 px-4 font-semibold text-iw-muted text-left">Telefone</th>
                <th className="py-2.5 px-4 font-semibold text-iw-muted text-left">Matrícula</th>
                <th className="py-2.5 px-4 font-semibold text-iw-muted text-left">Ações</th>
              </tr>
            </thead>
            <tbody>
              {professores.map((p) => (
                <tr key={p.id} className="border-b border-iw-border/50 last:border-0 hover:bg-iw-bg/30">
                  <td className="py-2.5 px-4 text-black font-medium">{p.nome_completo}</td>
                  <td className="py-2.5 px-4 text-black">{p.cargo ?? "—"}</td>
                  <td className="py-2.5 px-4 text-black">{p.churches?.name ?? "—"}</td>
                  <td className="py-2.5 px-4 text-black">{p.telefone ?? "—"}</td>
                  <td className="py-2.5 px-4 text-black">{p.matricula ?? "—"}</td>
                  <td className="py-2.5 px-4">
                    <div className="flex items-center gap-2 flex-wrap">
                      <Link
                        href={`/dashboard/configuracoes/professores/editar/${p.id}?voltarPara=/secretaria/professores&voltarLabel=Professores`}
                        className="inline-flex items-center gap-1 text-xs font-semibold text-black bg-black/5 border border-black/15 rounded-lg px-3 py-1.5 shadow-sm hover:bg-black/10 transition-colors"
                      >
                        <Pencil className="w-3.5 h-3.5" /> Editar
                      </Link>
                      <ReenviarLinkButton
                        action={secretariaReenviarLinkProfessorAction}
                        campo="professor_id"
                        valor={p.id}
                        nome={p.nome_completo}
                        email={p.email ?? null}
                        tipo="professor"
                      />
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
