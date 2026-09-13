"use client";

import { useEffect, useCallback } from "react";
import { useLocale } from "next-intl";
import { signOutAction } from "@/app/actions";

// ============================================================
// BackButtonLogout — decisão do Joaquim em 12/09/2026: dentro da
// área de trabalho do aluno, apertar o botão "voltar" da barra de
// navegação do navegador (não um Link interno do app — esses usam
// pushState, não disparam popstate) precisa encerrar a sessão e
// levar pra tela de login, em vez de mostrar uma página anterior
// em cache do histórico do navegador.
//
// Mecanismo: ao montar, empurra um estado extra no histórico
// (history.pushState). Isso faz o navegador tratar "voltar" como
// uma navegação dentro do próprio app primeiro — só quando esse
// evento popstate dispara é que sabemos que o usuário apertou
// voltar de verdade (não um link/botão do app), e aí forçamos
// logout + redirect. Mesmo padrão de signOutAction já usado no
// AutoLogout.tsx (FormData manual, já que não é um <form>).
// ============================================================
export default function BackButtonLogout() {
  const locale = useLocale();

  const doLogout = useCallback(async () => {
    const formData = new FormData();
    formData.set("locale", locale);
    await signOutAction(formData);
  }, [locale]);

  useEffect(() => {
    window.history.pushState(null, "", window.location.href);

    function onPopState() {
      doLogout();
    }

    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
  }, [doLogout]);

  return null;
}
