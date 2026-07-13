import { NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";

// ============================================================
// /auth/callback — troca o "code" enviado por e-mail (convite de
// aluno via inviteUserByEmail, ou recuperação de senha) por uma
// sessão válida, e então redireciona para "next" (por padrão,
// /definir-senha, já que quem chega aqui via convite ainda não
// tem senha nenhuma).
// ============================================================

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/portal";

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      return NextResponse.redirect(`${origin}${next}`);
    }
  }

  return NextResponse.redirect(
    `${origin}/login?error=` +
      encodeURIComponent(
        "Link de acesso inválido ou expirado. Peça um novo convite à secretaria do CETADP."
      )
  );
}
