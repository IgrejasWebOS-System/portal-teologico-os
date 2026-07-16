import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft, CheckCircle2, GraduationCap } from "lucide-react";
import { createClient } from "@/utils/supabase/server";
import AutoMatriculaForm from "./AutoMatriculaForm";

export const metadata = { title: "Nova Matrícula — Portal do Aluno" };

interface PageProps {
  searchParams: Promise<{ error?: string; matricula?: string }>;
}

export default async function NovaMatriculaPage({ searchParams }: PageProps) {
  const { error, matricula } = await searchParams;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login?redirectTo=" + encodeURIComponent("/portal/nova-matricula"));

  const { data: campos } = await supabase
    .from("ead_campos_ministerios")
    .select("id, nome, tipo")
    .eq("ativo", true)
    .order("nome");

  return (
    <div className="min-h-screen bg-iw-bg">
      <div className="max-w-xl mx-auto px-6 py-12">
        <Link
          href="/portal"
          className="inline-flex items-center gap-1.5 text-xs text-iw-muted hover:text-iw-navy font-medium transition-colors mb-6"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          Voltar ao Portal
        </Link>

        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-xl bg-iw-gold/10 flex items-center justify-center shrink-0">
            <GraduationCap className="w-5 h-5 text-iw-gold" />
          </div>
          <div>
            <h1 className="text-xl font-black text-iw-navy tracking-tight">Nova Matrícula</h1>
            <p className="text-iw-muted text-xs mt-0.5">
              Escolha o curso e sua matrícula é confirmada na hora — sem espera de aprovação.
            </p>
          </div>
        </div>

        {matricula ? (
          <div className="bg-iw-surface rounded-2xl border border-iw-border shadow-sm p-8 text-center">
            <div className="w-14 h-14 rounded-full bg-iw-success-bg flex items-center justify-center mx-auto mb-5">
              <CheckCircle2 className="w-7 h-7 text-iw-success" />
            </div>
            <h2 className="text-lg font-black text-iw-navy mb-2">Matrícula confirmada!</h2>
            <p className="text-iw-gold font-black text-lg mb-2">{decodeURIComponent(matricula)}</p>
            <p className="text-iw-muted text-sm leading-relaxed mb-6">
              Sua matrícula já está ativa. Você já pode acompanhar seu curso no Portal.
            </p>
            <Link
              href="/portal"
              className="inline-block bg-iw-gold hover:opacity-90 text-white font-bold px-6 py-3 rounded-xl text-sm transition-opacity"
            >
              Voltar ao Portal
            </Link>
          </div>
        ) : (
          <div className="bg-iw-surface rounded-2xl border border-iw-border shadow-sm p-6 sm:p-8">
            {error && (
              <div className="mb-4 px-4 py-3 rounded-lg bg-iw-error-bg border border-iw-error text-iw-error text-sm font-medium">
                {decodeURIComponent(error)}
              </div>
            )}
            <AutoMatriculaForm campos={campos ?? []} />
          </div>
        )}
      </div>
    </div>
  );
}
