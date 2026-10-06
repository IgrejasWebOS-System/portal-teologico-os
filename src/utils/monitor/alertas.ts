import { createAdminClient } from "@/utils/supabase/admin";
import { enviarEmail } from "@/utils/email/resend";
import type { ResultadoMonitor, Verificacao } from "./verificacoes";

// Registra/resolve alertas (um aberto por código) e avisa por e-mail os
// administradores globais quando surge um problema novo ou o estado piora
// para CRÍTICO. Server-only.

function escapar(t: string) {
  return t.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

async function emailsDestino(): Promise<string[]> {
  const fixos = (process.env.MONITOR_ALERT_EMAILS ?? "")
    .split(",")
    .map((e) => e.trim())
    .filter(Boolean);
  if (fixos.length > 0) return fixos;

  const admin = createAdminClient();
  const { data: roles } = await admin.from("admin_roles").select("user_id").eq("level", 0);
  const ids = Array.from(new Set((roles ?? []).map((r) => r.user_id as string)));
  const emails: string[] = [];
  for (const id of ids) {
    const { data } = await admin.auth.admin.getUserById(id);
    if (data?.user?.email) emails.push(data.user.email);
  }
  return Array.from(new Set(emails));
}

function montarHtml(ambiente: string, problemas: Verificacao[]): string {
  const itens = problemas
    .map(
      (p) => `
      <div style="border:1px solid #ddd;border-left:5px solid ${p.severidade === "CRITICO" ? "#c0392b" : "#e0a100"};border-radius:6px;padding:12px;margin:12px 0">
        <strong>[${p.severidade}] ${escapar(p.titulo)}</strong><br/>
        <p style="margin:6px 0"><b>O que aconteceu:</b> ${escapar(p.resumo)}</p>
        ${p.causa ? `<p style="margin:6px 0"><b>Causa técnica provável:</b> ${escapar(p.causa)}</p>` : ""}
        ${p.procedimento ? `<p style="margin:6px 0"><b>Procedimento:</b> ${escapar(p.procedimento)}</p>` : ""}
      </div>`,
    )
    .join("");
  return `<div style="font-family:Arial,sans-serif;max-width:640px">
    <h2>Alerta de saúde do sistema — ${escapar(ambiente)}</h2>
    ${itens}
    <p style="color:#666;font-size:12px">Veja o painel completo em /admin/saude-sistema.</p>
  </div>`;
}

export async function processarAlertas(
  r: ResultadoMonitor,
): Promise<{ abertos: number; resolvidos: number; emailEnviado: boolean }> {
  const admin = createAdminClient();
  const agora = new Date().toISOString();
  const paraNotificar: Verificacao[] = [];
  let abertos = 0;
  let resolvidos = 0;

  const { data: existentes } = await admin
    .from("monitor_alertas")
    .select("id, codigo, severidade, ocorrencias, notificado_em")
    .is("resolvido_em", null);
  const porCodigo = new Map((existentes ?? []).map((a) => [a.codigo as string, a]));

  for (const v of r.verificacoes) {
    const aberto = porCodigo.get(v.codigo);
    if (v.severidade === "OK") {
      if (aberto) {
        await admin.from("monitor_alertas").update({ resolvido_em: agora }).eq("id", aberto.id);
        resolvidos++;
      }
      continue;
    }
    const detalhe = [v.resumo, v.causa && `Causa: ${v.causa}`, v.procedimento && `Procedimento: ${v.procedimento}`]
      .filter(Boolean)
      .join("\n");
    if (!aberto) {
      await admin.from("monitor_alertas").insert({
        codigo: v.codigo,
        severidade: v.severidade === "INFO" ? "INFO" : v.severidade,
        titulo: v.titulo,
        detalhe,
      });
      abertos++;
      if (v.severidade !== "INFO") paraNotificar.push(v);
    } else {
      const piorou = aberto.severidade !== "CRITICO" && v.severidade === "CRITICO";
      await admin
        .from("monitor_alertas")
        .update({
          severidade: v.severidade,
          detalhe,
          ultimo_em: agora,
          ocorrencias: (aberto.ocorrencias as number) + 1,
        })
        .eq("id", aberto.id);
      if (piorou) paraNotificar.push(v);
    }
  }

  let emailEnviado = false;
  if (paraNotificar.length > 0) {
    const destinos = await emailsDestino();
    const html = montarHtml(r.ambiente, paraNotificar);
    const criticos = paraNotificar.some((p) => p.severidade === "CRITICO");
    const resultados = await Promise.all(
      destinos.map((para) =>
        enviarEmail({
          para,
          assunto: `${criticos ? "[CRÍTICO]" : "[AVISO]"} Saúde do sistema (${r.ambiente}): ${paraNotificar[0].titulo}`,
          html,
        }),
      ),
    );
    emailEnviado = resultados.some(Boolean);
    if (emailEnviado) {
      await admin
        .from("monitor_alertas")
        .update({ notificado_em: agora })
        .is("resolvido_em", null)
        .in(
          "codigo",
          paraNotificar.map((p) => p.codigo),
        );
    }
  }

  return { abertos, resolvidos, emailEnviado };
}
