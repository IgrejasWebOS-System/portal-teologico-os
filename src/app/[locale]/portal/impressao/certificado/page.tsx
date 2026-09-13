import { redirect } from "next/navigation";
import { CheckCircle2, Lock } from "lucide-react";
import { createClient } from "@/utils/supabase/server";
import { createAdminClient } from "@/utils/supabase/admin";
import { resolverAlunoEMatricula } from "@/utils/aluno/matriculaAtiva";
import { calcularMediaCertificado, MEDIA_MINIMA_CERTIFICADO } from "@/utils/avaliacoes/mediaCertificado";
import ImpressaoShell from "@/components/impressao/ImpressaoShell";
import CertificadoVisual from "@/components/certificados/CertificadoVisual";

export const metadata = { title: "Certificado" };

export default async function CertificadoImpressaoPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const dados = await resolverAlunoEMatricula(user.id);
  if (!dados) redirect("/portal");
  const { aluno, matricula } = dados;

  const admin = createAdminClient();
  const voltarPara = matricula?.course_id ? `/escola/${matricula.course_id}` : "/escola";

  // 1) Já existe certificado emitido pela secretaria pra este curso?
  //    Emissão continua sendo ato da secretaria (tabela `certificates`,
  //    numeração e assinaturas) — a tela do aluno só mostra o que já
  //    foi emitido, ou a elegibilidade pra pedir.
  const { data: certificadoEmitido } = matricula
    ? await admin
        .from("certificates")
        .select(
          "numero_certificado, nome_aluno, nome_curso, carga_horaria, assinatura_presidente, assinatura_coordenador, emitido_em"
        )
        .eq("user_id", user.id)
        .eq("nome_curso", matricula.curso_nome_snapshot)
        .maybeSingle()
    : { data: null };

  if (certificadoEmitido) {
    return (
      <ImpressaoShell titulo="Certificado" voltarPara={voltarPara}>
        <CertificadoVisual
          nomeAluno={certificadoEmitido.nome_aluno}
          nomeCurso={certificadoEmitido.nome_curso}
          numeroCertificado={certificadoEmitido.numero_certificado}
          cargaHoraria={certificadoEmitido.carga_horaria}
          assinaturaPresidente={certificadoEmitido.assinatura_presidente}
          assinaturaCoordenador={certificadoEmitido.assinatura_coordenador}
          emitidoEm={certificadoEmitido.emitido_em}
        />
      </ImpressaoShell>
    );
  }

  // 2) Ainda não emitido — calcula elegibilidade pela média de Testes +
  //    Prova por matéria (não conta Simulado nem a Prova antiga por
  //    curso inteiro sem lesson_id).
  let resultado = { itens: [], media: null as number | null, aprovado: null as boolean | null, quantidade: 0 };
  if (matricula) {
    const { data: avaliacoes } = await admin
      .from("avaliacoes")
      .select("tipo, status, nota, lesson_id")
      .eq("matricula_id", matricula.id)
      .in("tipo", ["TESTE_LICAO", "PROVA"]);
    resultado = calcularMediaCertificado(avaliacoes ?? []);
  }

  return (
    <ImpressaoShell titulo="Certificado" voltarPara={voltarPara}>
      {!matricula ? (
        <p className="text-sm text-iw-muted">Nenhuma matrícula encontrada.</p>
      ) : resultado.quantidade === 0 ? (
        <div className="flex flex-col items-center gap-3 py-10 text-center">
          <Lock className="w-10 h-10 text-iw-muted/40" />
          <p className="text-sm text-iw-muted max-w-sm">
            Ainda não há Testes ou Prova finalizados para calcular a média. Complete os Testes 1-4 e a Prova das matérias
            do curso pra ficar elegível ao certificado.
          </p>
        </div>
      ) : resultado.aprovado ? (
        <div className="flex flex-col items-center gap-3 py-10 text-center">
          <CheckCircle2 className="w-10 h-10 text-iw-success" />
          <p className="font-bold text-iw-navy">Você está apto(a) a receber o certificado.</p>
          <p className="text-sm text-iw-muted max-w-sm">
            Média geral: <strong className="text-iw-navy">{resultado.media?.toFixed(1)}</strong> (mínimo exigido{" "}
            {MEDIA_MINIMA_CERTIFICADO.toFixed(1)}), com base em {resultado.quantidade} avaliação(ões) finalizada(s).
          </p>
          <p className="text-xs text-iw-muted max-w-sm">
            A emissão oficial (com número de certificado e assinaturas) é feita pela secretaria do CETADP — procure a
            secretaria pra formalizar.
          </p>
        </div>
      ) : (
        <div className="flex flex-col items-center gap-3 py-10 text-center">
          <Lock className="w-10 h-10 text-iw-error/60" />
          <p className="font-bold text-iw-navy">Certificado ainda não disponível.</p>
          <p className="text-sm text-iw-muted max-w-sm">
            Média geral: <strong className="text-iw-error">{resultado.media?.toFixed(1)}</strong> — abaixo do mínimo
            exigido de {MEDIA_MINIMA_CERTIFICADO.toFixed(1)}, com base em {resultado.quantidade} avaliação(ões)
            finalizada(s).
          </p>
        </div>
      )}

      <p className="mt-10 text-[11px] text-iw-muted/70 text-center print:mt-16">
        Documento gerado pelo Portal do Aluno CETADP em {new Date().toLocaleDateString("pt-BR")}.
      </p>
    </ImpressaoShell>
  );
}
