"use client";

// ============================================================
// Busca + filtro de Setor/Regional da tela de Turmas (15/10/2026, pedido do
// Joaquim): mesma barra que já existe em Professores e Alunos — caixa de
// busca por nome + seletor "Todos os setores/regionais" (com SEDE).
// As turmas vêm do servidor já filtradas, então a busca navega via query
// string (?q=&setor=), com espera de 300 ms depois de digitar, mantendo o
// Ano escolhido. Só funciona com um Ano selecionado (sem ano a lista de
// turmas nem é carregada — ver page.tsx).
// ============================================================

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Search } from "lucide-react";

export type SetorOpcao = { id: string; name: string };

interface Props {
  ano: string;
  q: string;
  setor: string;
  setores: SetorOpcao[];
}

export default function TurmasBusca({ ano, q, setor, setores }: Props) {
  const router = useRouter();
  const [busca, setBusca] = useState(q);
  const primeiraRender = useRef(true);

  function navegar(novaBusca: string, novoSetor: string) {
    const qs = new URLSearchParams();
    qs.set("ano", ano);
    if (novaBusca.trim()) qs.set("q", novaBusca.trim());
    if (novoSetor) qs.set("setor", novoSetor);
    router.replace(`/dashboard/configuracoes/persona/turmas?${qs.toString()}`);
  }

  // Espera o usuário parar de digitar antes de buscar.
  useEffect(() => {
    if (primeiraRender.current) {
      primeiraRender.current = false;
      return;
    }
    const t = setTimeout(() => navegar(busca, setor), 300);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [busca]);

  const semAno = !ano;

  return (
    <div className="flex flex-col sm:flex-row gap-3">
      <div
        className={`flex-1 flex items-center gap-2 bg-iw-surface border border-iw-navy rounded-xl px-3.5 py-2.5 ${
          semAno ? "opacity-60" : ""
        }`}
      >
        <Search className="w-4 h-4 text-iw-muted shrink-0" />
        <input
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
          disabled={semAno}
          placeholder={semAno ? "Selecione o Ano para buscar turmas..." : "Buscar por nome da turma..."}
          className="flex-1 bg-transparent border-none p-0 text-sm text-black placeholder-iw-muted focus:outline-none focus:ring-0"
        />
      </div>
      <select
        value={setor}
        disabled={semAno}
        onChange={(e) => navegar(busca, e.target.value)}
        className="bg-iw-surface border border-iw-navy rounded-xl px-3.5 py-2.5 text-sm text-black cursor-pointer sm:w-64 disabled:opacity-60"
      >
        <option value="">Todos os setores/regionais</option>
        <option value="SEDE">SEDE</option>
        {setores.map((s) => (
          <option key={s.id} value={s.id}>
            {s.name}
          </option>
        ))}
      </select>
    </div>
  );
}
