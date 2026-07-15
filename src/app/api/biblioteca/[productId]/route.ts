import { NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { obterAcessoPdf } from "@/utils/storage/biblioteca";

// ============================================================
// GET /api/biblioteca/[productId]?modo=download|ler
//
// Ponto único de entrega dos PDFs da Biblioteca. Confere sessão +
// titularidade (via obterAcessoPdf) e redireciona para uma signed
// URL de curta duração — nunca expõe o bucket nem o path do
// arquivo diretamente ao cliente.
// ============================================================

export async function GET(
  request: Request,
  { params }: { params: Promise<{ productId: string }> }
) {
  const { productId } = await params;
  const { searchParams } = new URL(request.url);
  const modo = searchParams.get("modo") === "download" ? "download" : "ler";

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ erro: "Faça login para acessar este material." }, { status: 401 });
  }

  const resultado = await obterAcessoPdf(user.id, productId, modo);

  if (!resultado.ok || !resultado.url) {
    return NextResponse.json({ erro: resultado.erro ?? "Acesso negado." }, { status: 403 });
  }

  return NextResponse.redirect(resultado.url);
}
