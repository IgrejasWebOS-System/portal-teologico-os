"use client";

import { useCallback, useEffect, useState } from "react";
import { obterCarrinho, type ItemCarrinho } from "@/utils/carrinho";

export function useCarrinho() {
  const [itens, setItens] = useState<ItemCarrinho[]>([]);

  const recarregar = useCallback(() => setItens(obterCarrinho()), []);

  useEffect(() => {
    // Hidrata a partir do carrinho persistido (localStorage) assim que o
    // componente monta no client — intencionalmente síncrono aqui.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    recarregar();
    window.addEventListener("carrinho:atualizado", recarregar);
    window.addEventListener("storage", recarregar);
    return () => {
      window.removeEventListener("carrinho:atualizado", recarregar);
      window.removeEventListener("storage", recarregar);
    };
  }, [recarregar]);

  return { itens, recarregar };
}
