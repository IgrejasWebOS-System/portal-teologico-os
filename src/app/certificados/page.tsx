import Link from "next/link";
import { BadgeCheck, CheckCircle2, XCircle } from "lucide-react";
import { createClient } from "@/utils/supabase/server";
import PublicHeader from "@/components/public/PublicHeader";
import PublicFooter from "@/components/public/PublicFooter";
import CertificadoVisual from "@/components/certificados/CertificadoVisual";

export const metadata = {
  title: "Validar Certificado",
};

interface PageProps {
  searchParams: Promise<{ numero?: string }>;
}

// ============================================================
// /certificados — validação pública de certificados por número
// (ex: CETADP-CERT-2026-0001). Consulta direta em `certificates`,
// que tem SELECT público (migração 010) exatamente para esse uso —
// mesmo tipo de validação que aparece impressa em qualquer diploma
// físico. Antes desta versão, a página era um placeholder estático.
// ============================================================
export default async function CertificadosPage({ searchParams }: PageProps) {
  const { numero } = await searchParams;
  const numeroBuscado = numero?.trim();

  let certificado: {
    numero_certificado: string;
    nome_aluno: string;
    nome_curso: string;
    carga_horaria: number | null;
    assinatura_presidente: string;
    assinatura_coordenador: string;
    emitido_em: string;
  } | null = null;
  let buscado = false;

  if (numeroBuscado) {
    buscado = true;
    const supabase = await createClient();
    const { data } = await supabase
      .from("certificates")
      .select(
        "numero_certificado, nome_aluno, nome_curso, carga_horaria, assinatura_presidente, assinatura_coordenador, emitido_em"
      )
      .eq("numero_certificado", numeroBuscado)
      .maybeSingle();
    certificado = data;
  }

  return (
    <div className="w-full min-h-screen bg-iw-bg flex flex-col">
      <PublicHeader />

      <main className="flex-1 flex flex-col items-center justify-center px-4 py-16 gap-6">
        <div className="w-full max-w-md bg-iw-surface rounded-2xl border border-iw-border shadow-sm p-8 text-center">
          <div className="w-14 h-14 rounded-full bg-iw-gold/10 flex items-center justify-center mx-auto mb-5">
            <BadgeCheck className="w-7 h-7 text-iw-gold" />
          </div>
          <h1 className="text-xl font-black text-iw-navy mb-2">
            Validação de Certificados
          </h1>
          <p className="text-iw-muted text-sm leading-relaxed mb-6">
            Digite o número do certificado impresso para confirmar sua
            autenticidade.
          </p>

          <form className="flex gap-2 mb-6" action="/certificados">
            <input
              type="text"
              name="numero"
              defaultValue={numeroBuscado}
              placeholder="CETADP-CERT-2026-0001"
              className="flex-1 border border-iw-border rounded-lg px-3 py-2.5 text-sm text-iw-navy placeholder-iw-muted outline-none focus:ring-2 focus:ring-iw-blue/30 focus:border-iw-blue"
            />
            <button
              type="submit"
              className="bg-iw-gold hover:opacity-90 text-white font-semibold text-sm px-4 py-2.5 rounded-lg transition-opacity"
            >
              Validar
            </button>
          </form>

          {buscado && !certificado && (
            <div className="p-4 rounded-xl border text-left mb-6 bg-iw-error-bg border-iw-error">
              <p className="flex items-center gap-2 text-iw-error font-bold text-sm">
                <XCircle className="w-4 h-4" /> Certificado não encontrado. Confira o
                número e tente novamente.
              </p>
            </div>
          )}

          {certificado && (
            <p className="flex items-center justify-center gap-2 text-iw-success font-bold text-sm mb-6">
              <CheckCircle2 className="w-4 h-4" /> Certificado válido
            </p>
          )}

          <Link
            href="/"
            className="inline-block border border-iw-navy/30 hover:border-iw-navy text-iw-navy font-semibold px-6 py-3 rounded-xl text-sm transition-colors"
          >
            Voltar para o início
          </Link>
        </div>

        {certificado && (
          <div className="w-full max-w-3xl px-2">
            <CertificadoVisual
              nomeAluno={certificado.nome_aluno}
              nomeCurso={certificado.nome_curso}
              numeroCertificado={certificado.numero_certificado}
              cargaHoraria={certificado.carga_horaria}
              assinaturaPresidente={certificado.assinatura_presidente}
              assinaturaCoordenador={certificado.assinatura_coordenador}
              emitidoEm={certificado.emitido_em}
            />
          </div>
        )}
      </main>

      <PublicFooter />
    </div>
  );
}
