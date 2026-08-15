import Link from "next/link";
import { redirect } from "next/navigation";
import { Award, ArrowLeft, Eye } from "lucide-react";
import { createClient } from "@/utils/supabase/server";
import CertificadoVisual from "@/components/certificados/CertificadoVisual";

export const metadata = {
  title: "Meus Certificados",
};

export default async function MeusCertificadosPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: certificados } = await supabase
    .from("certificates")
    .select(
      "id, numero_certificado, nome_aluno, nome_curso, carga_horaria, assinatura_presidente, assinatura_coordenador, emitido_em"
    )
    .eq("user_id", user.id)
    .order("emitido_em", { ascending: false });

  return (
    <div className="min-h-screen bg-iw-bg">
      <header className="bg-iw-navy shadow-lg">
        <div className="max-w-3xl mx-auto px-6 py-5">
          <Link
            href="/portal"
            className="inline-flex items-center gap-1.5 text-iw-sky/70 hover:text-white text-xs font-medium transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            Voltar ao Portal
          </Link>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-6 py-12">
        <div className="flex items-center gap-3 mb-8">
          <div className="w-10 h-10 rounded-xl bg-iw-gold/10 flex items-center justify-center shrink-0">
            <Award className="w-5 h-5 text-iw-gold" />
          </div>
          <div>
            <h1 className="text-xl font-black text-iw-navy tracking-tight">Meus Certificados</h1>
            <p className="text-iw-muted text-xs mt-0.5">
              Emitidos pela secretaria ao concluir um curso.
            </p>
          </div>
        </div>

        {(!certificados || certificados.length === 0) ? (
          <div className="bg-iw-surface border border-iw-border rounded-2xl p-10 text-center">
            <p className="text-iw-muted text-sm">
              Você ainda não tem certificados emitidos.
            </p>
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            {certificados.map((c) => (
              <details
                key={c.id}
                className="bg-iw-surface border border-iw-border rounded-2xl shadow-sm overflow-hidden group"
              >
                <summary className="p-5 flex items-center justify-between gap-4 cursor-pointer list-none">
                  <div>
                    <p className="font-bold text-iw-navy">{c.nome_curso}</p>
                    {c.carga_horaria && (
                      <p className="text-xs text-iw-muted">{c.carga_horaria}h de carga horária</p>
                    )}
                    <p className="text-xs text-iw-muted mt-1">
                      Emitido em {new Date(c.emitido_em).toLocaleDateString("pt-BR")}
                    </p>
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    <span className="text-xs font-mono font-bold text-iw-gold bg-iw-gold/10 px-3 py-1.5 rounded-lg">
                      {c.numero_certificado}
                    </span>
                    <span className="inline-flex items-center gap-1 text-xs font-semibold text-iw-blue">
                      <Eye className="w-3.5 h-3.5" /> Ver certificado
                    </span>
                  </div>
                </summary>
                <div className="px-5 pb-5 pt-1 bg-iw-bg/40">
                  <CertificadoVisual
                    nomeAluno={c.nome_aluno}
                    nomeCurso={c.nome_curso}
                    numeroCertificado={c.numero_certificado}
                    cargaHoraria={c.carga_horaria}
                    assinaturaPresidente={c.assinatura_presidente}
                    assinaturaCoordenador={c.assinatura_coordenador}
                    emitidoEm={c.emitido_em}
                  />
                </div>
              </details>
            ))}
          </div>
        )}

        <p className="text-iw-muted/70 text-xs mt-6 text-center">
          Qualquer pessoa pode conferir a autenticidade em{" "}
          <Link href="/certificados" className="text-iw-gold hover:underline">
            /certificados
          </Link>
          , usando o número acima.
        </p>
      </main>
    </div>
  );
}
