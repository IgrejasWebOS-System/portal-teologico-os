"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/utils/supabase/client";

// ============================================================
// /auth/callback — recebe o retorno dos links de e-mail do
// Supabase Auth (convite de professor/aluno via inviteUserByEmail,
// ou recuperação de senha via resetPasswordForEmail).
//
// IMPORTANTE (bug #1, corrigido em 19/09/2026): esses links NÃO
// chegam com "?code=" (fluxo PKCE) — o GoTrue devolve os tokens no
// FRAGMENTO da URL ("#access_token=...&refresh_token=...&type=invite"),
// que o navegador NUNCA envia pro servidor. A versão antiga desta rota
// era um route handler (route.ts) que só sabia ler "?code=" — por isso
// isso precisa ser uma página client-side (lê window.location.hash)
// em vez de um route handler.
//
// IMPORTANTE (bug #2, descoberto em 19/09/2026 via auth logs do
// Supabase — query_logs no projeto): o template de e-mail padrão do
// Supabase usa {{ .ConfirmationURL }}, que aponta pro endpoint
// /auth/v1/verify do PRÓPRIO Supabase. Esse endpoint, com PKCE
// habilitado (padrão do @supabase/ssr), redireciona de volta com
// "?code=..." em vez de tokens no fragmento — e o code_verifier
// (gerado no client do SERVIDOR, dentro da Server Action que chamou
// resetPasswordForEmail/inviteUserByEmail) só é comparado com sucesso
// se ainda bater com o salvo em cookie, o que falhou nos testes reais
// (erro "code challenge does not match previously saved code
// verifier" no log do /token). Ou seja: os dois caminhos acima
// (fragmento e "?code=") são frágeis para link de e-mail.
//
// Correção definitiva (recomendação oficial do Supabase p/ esse
// cenário — ver "Redirecting the user to a server-side endpoint" em
// supabase.com/docs/guides/auth/auth-email-templates): trocar o link
// do e-mail para usar {{ .TokenHash }} + {{ .Type }} direto (sem
// passar pelo /verify do Supabase) e validar aqui com
// supabase.auth.verifyOtp({ token_hash, type }) — não depende de
// nenhum cookie/estado salvo no navegador que iniciou o pedido.
// Isso exige trocar o TEMPLATE de e-mail no painel do Supabase
// (Authentication > Email Templates) em "Reset password" e "Invite
// user", nos dois projetos (staging e produção) — não dá pra fazer
// isso por código/migration, é config do painel.
// ============================================================

const ERRO_LINK_INVALIDO =
  "Link de acesso inválido ou expirado. Peça um novo convite à secretaria do CETADP.";

export default function AuthCallbackPage() {
  const router = useRouter();
  const jaProcessou = useRef(false);

  useEffect(() => {
    if (jaProcessou.current) return;
    jaProcessou.current = true;

    async function processar() {
      const params = new URLSearchParams(window.location.search);
      const next = params.get("next") || "/portal";
      const hash = new URLSearchParams(window.location.hash.slice(1));
      const accessToken = hash.get("access_token");
      const refreshToken = hash.get("refresh_token");
      const code = params.get("code");
      const tokenHash = params.get("token_hash");
      const type = params.get("type");

      const supabase = createClient();

      // Caminho novo (preferido) — link de e-mail com token_hash+type,
      // sem depender de code_verifier salvo em cookie. Ver comentário
      // acima (bug #2).
      if (tokenHash && type) {
        const { error } = await supabase.auth.verifyOtp({
          token_hash: tokenHash,
          type: type as
            | "invite"
            | "recovery"
            | "email"
            | "email_change"
            | "signup",
        });
        if (!error) {
          router.replace(next);
          return;
        }
      } else if (accessToken && refreshToken) {
        const { error } = await supabase.auth.setSession({
          access_token: accessToken,
          refresh_token: refreshToken,
        });
        if (!error) {
          router.replace(next);
          return;
        }
      } else if (code) {
        const { error } = await supabase.auth.exchangeCodeForSession(code);
        if (!error) {
          router.replace(next);
          return;
        }
      }

      router.replace("/login?error=" + encodeURIComponent(ERRO_LINK_INVALIDO));
    }

    processar();
  }, [router]);

  return (
    <div className="flex min-h-[60vh] items-center justify-center">
      <p className="text-sm text-iw-sky/70">Confirmando seu acesso...</p>
    </div>
  );
}
