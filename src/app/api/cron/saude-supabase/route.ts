import { NextResponse } from "next/server";
import { executarVerificacoes } from "@/utils/monitor/verificacoes";
import { processarAlertas } from "@/utils/monitor/alertas";

export const dynamic = "force-dynamic";

// Chamada diária pelo Vercel Cron (ver vercel.json). A Vercel envia
// Authorization: Bearer <CRON_SECRET> automaticamente quando a variável
// CRON_SECRET existe no projeto.
export async function GET(request: Request) {
  const segredo = process.env.CRON_SECRET;
  if (!segredo || request.headers.get("authorization") !== `Bearer ${segredo}`) {
    return NextResponse.json({ erro: "Não autorizado" }, { status: 401 });
  }

  try {
    const resultado = await executarVerificacoes();
    const alertas = await processarAlertas(resultado);
    return NextResponse.json({
      ambiente: resultado.ambiente,
      geradoEm: resultado.geradoEm,
      verificacoes: resultado.verificacoes.map((v) => ({
        codigo: v.codigo,
        severidade: v.severidade,
        resumo: v.resumo,
      })),
      alertas,
    });
  } catch (e) {
    return NextResponse.json(
      { erro: e instanceof Error ? e.message : "Falha na verificação" },
      { status: 500 },
    );
  }
}
