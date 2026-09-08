// ============================================================
// Força a digitação em CAIXA ALTA em campos de texto livre, preservando
// a posição do cursor (sem isso, o cursor pula pro final do campo a
// cada tecla, tornando impossível editar no meio de uma palavra).
//
// Pedido do Joaquim (2026-09-06): padronizar em caixa alta todo campo de
// preenchimento livre do sistema — nome, endereço, bairro, cidade,
// observações etc. — EXCETO e-mail e senha, que seguem exatamente como
// digitados (convenção padrão).
//
// Uso em <input>/<textarea> "cru" (fora do componente TextInput do
// design system, que já tem a prop `uppercase` embutida):
//
//   <input onChange={aplicarMaiuscula(setValor)} className={CLASSE_MAIUSCULA} />
//
// ou, se precisar de lógica extra no onChange:
//
//   <input onChange={(e) => { aplicarMaiusculaNoEvento(e); minhaLogica(e); }} />
// ============================================================

import type { ChangeEvent } from "react";

/** Classe Tailwind pra deixar o texto visualmente em caixa alta enquanto digita. */
export const CLASSE_MAIUSCULA = "uppercase";

/** Transforma o valor do evento para caixa alta, preservando a posição do cursor. */
export function aplicarMaiusculaNoEvento(e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) {
  const pos = e.target.selectionStart;
  e.target.value = e.target.value.toUpperCase();
  if (pos !== null) e.target.setSelectionRange(pos, pos);
}

/**
 * Gera um onChange pronto pra usar em inputs controlados (value + setState
 * de string). Ex.: <input value={nome} onChange={aplicarMaiuscula(setNome)} />
 */
export function aplicarMaiuscula(setValor: (v: string) => void) {
  return (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setValor(e.target.value.toUpperCase());
  };
}
