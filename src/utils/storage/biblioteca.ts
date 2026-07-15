import { createAdminClient } from "@/utils/supabase/admin";

// ============================================================
// Acesso a PDFs da Biblioteca (bucket privado "biblioteca-pdfs").
//
// Ninguém lê o bucket direto — toda entrega passa por aqui, que:
// 1) confere se o usuário tem direito ao arquivo (produto gratuito
//    OU existe order_item pago para esse usuário+produto);
// 2) gera uma signed URL de validade curta com o cliente admin
//    (service_role, único que enxerga o bucket).
//
// "download" força o download do arquivo (Content-Disposition:
// attachment, PDF_DOWNLOAD). "ler" gera uma URL só para visualização
// inline, de validade mais curta, para ser embutida num visualizador
// no portal sem expor um link de download direto (PDF_VIRTUAL).
// Isso não é uma proteção contra print/captura de tela — é o
// equivalente razoável de "não facilitar" que o CETADP pediu.
// ============================================================

type ModoAcesso = "download" | "ler";

interface ResultadoAcesso {
  ok: boolean;
  url?: string;
  erro?: string;
}

async function usuarioTemDireito(
  userId: string,
  productId: string
): Promise<boolean> {
  const admin = createAdminClient();

  const { data: produto } = await admin
    .from("products")
    .select("preco_centavos, status")
    .eq("id", productId)
    .single();

  if (!produto || produto.status !== "ATIVO") return false;
  if (produto.preco_centavos === 0) return true; // material gratuito

  const { data: pedidosPagos } = await admin
    .from("orders")
    .select("id")
    .eq("user_id", userId)
    .eq("status", "PAGO");

  if (!pedidosPagos || pedidosPagos.length === 0) return false;

  const { data: itemPago } = await admin
    .from("order_items")
    .select("id")
    .eq("product_id", productId)
    .in(
      "order_id",
      pedidosPagos.map((p) => p.id)
    )
    .limit(1)
    .maybeSingle();

  return !!itemPago;
}

export async function obterAcessoPdf(
  userId: string,
  productId: string,
  modo: ModoAcesso
): Promise<ResultadoAcesso> {
  const admin = createAdminClient();

  const temDireito = await usuarioTemDireito(userId, productId);
  if (!temDireito) {
    return { ok: false, erro: "Você não tem acesso a este material." };
  }

  const { data: produto } = await admin
    .from("products")
    .select("tipo, arquivo_path")
    .eq("id", productId)
    .single();

  if (!produto?.arquivo_path) {
    return { ok: false, erro: "Arquivo não encontrado para este produto." };
  }

  if (modo === "download" && produto.tipo !== "PDF_DOWNLOAD") {
    return { ok: false, erro: "Este material não está disponível para download." };
  }
  if (modo === "ler" && produto.tipo !== "PDF_VIRTUAL" && produto.tipo !== "PDF_DOWNLOAD") {
    return { ok: false, erro: "Este material não está disponível para leitura." };
  }

  const expiraEmSegundos = modo === "download" ? 300 : 120; // 5min / 2min

  const { data, error } = await admin.storage
    .from("biblioteca-pdfs")
    .createSignedUrl(produto.arquivo_path, expiraEmSegundos, {
      download: modo === "download",
    });

  if (error || !data?.signedUrl) {
    return { ok: false, erro: "Não foi possível gerar o link de acesso." };
  }

  return { ok: true, url: data.signedUrl };
}
