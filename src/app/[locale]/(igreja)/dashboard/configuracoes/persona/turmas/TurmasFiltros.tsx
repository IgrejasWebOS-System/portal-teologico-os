"use client";

// ============================================================
// Filtro em cascata Ano → Setor/Regional → Igreja pra tela de Turmas.
// Ordem pedida pelo Joaquim (14/09/2026): com 6.800+ turmas geradas
// em lote (Básico + Médio × 427 igrejas × 4 turmas × 2026/2027), a
// tela não pode listar tudo de cara — só depois de escolher pelo
// menos o Ano é que a lista aparece; Setor e Igreja refinam mais.
// Navega via query string (?ano=&setor_id=&igreja_id=) pra ficar
// bookmarkável e não depender de estado perdido ao recarregar.
// ============================================================

import { useRouter } from "next/navigation";
import { CalendarDays, Map, Church } from "lucide-react";

export type UnitLite = { id: string; type: string; name: string; parent_id: string | null };

interface Props {
  anos: number[];
  units: UnitLite[];
  anoAtual: string;
  setorAtual: string;
  igrejaAtual: string;
}

const selectCls =
  "w-full bg-white border border-iw-navy rounded-xl px-3.5 py-2.5 text-sm text-iw-navy focus:border-iw-gold focus:outline-none focus:ring-2 focus:ring-iw-gold/40 cursor-pointer transition-colors disabled:opacity-50 disabled:cursor-not-allowed";
const labelCls = "block text-[11px] font-bold text-iw-muted uppercase tracking-wider mb-1.5";

export default function TurmasFiltros({ anos, units, anoAtual, setorAtual, igrejaAtual }: Props) {
  const router = useRouter();

  // 26/09/2026, padronização pedida pelo Joaquim (varredura geral, achado
  // em teste: com um Setor específico escolhido, a Sede ainda aparecia
  // misturada na lista de Igreja — igual ao bug já corrigido nas
  // matrículas). Agora segue o mesmo padrão de ProfessorForm.tsx: SEDE
  // vira uma opção dentro da própria caixa "Setor / Regional" (ela não
  // pertence a nenhum Setor, então nunca deve aparecer misturada na
  // caixa de Igreja de um Setor real).
  const setoresComuns = units
    .filter((u) => u.type === "SETOR" && !u.name.toUpperCase().startsWith("REGIONAL"))
    .sort((a, b) => a.name.localeCompare(b.name));
  const regionais = units
    .filter((u) => u.type === "SETOR" && u.name.toUpperCase().startsWith("REGIONAL"))
    .sort((a, b) => a.name.localeCompare(b.name));
  const sedes = units.filter((u) => u.type === "SEDE");
  const sedeSelecionada = sedes.find((s) => s.id === igrejaAtual);

  const igrejas = setorAtual
    ? units
        .filter((u) => u.type === "IGREJA" && u.parent_id === setorAtual)
        .sort((a, b) => a.name.localeCompare(b.name))
    : [];

  function navegar(params: { ano?: string; setor_id?: string; igreja_id?: string }) {
    const qs = new URLSearchParams();
    if (params.ano) qs.set("ano", params.ano);
    if (params.setor_id) qs.set("setor_id", params.setor_id);
    if (params.igreja_id) qs.set("igreja_id", params.igreja_id);
    router.push(`/dashboard/configuracoes/persona/turmas${qs.toString() ? "?" + qs.toString() : ""}`);
  }

  function handleSetorChange(value: string) {
    const sedeEscolhida = sedes.find((s) => s.id === value);
    if (sedeEscolhida) {
      // SEDE resolve direto pra Igreja (é ela mesma o núcleo) — não
      // existe "setor" nesse caso.
      navegar({ ano: anoAtual, igreja_id: sedeEscolhida.id });
    } else {
      navegar({ ano: anoAtual, setor_id: value });
    }
  }

  return (
    <div className="bg-iw-surface border border-iw-gold rounded-2xl p-5 grid grid-cols-1 sm:grid-cols-3 gap-4">
      <div>
        <label className={labelCls}>
          <span className="inline-flex items-center gap-1"><CalendarDays className="w-3 h-3" /> Ano *</span>
        </label>
        <select
          value={anoAtual}
          onChange={(e) => navegar({ ano: e.target.value })}
          className={selectCls}
        >
          <option value="">Selecione o ano...</option>
          {anos.map((a) => (
            <option key={a} value={a}>{a}</option>
          ))}
        </select>
      </div>

      <div>
        <label className={labelCls}>
          <span className="inline-flex items-center gap-1"><Map className="w-3 h-3" /> Setor / Regional</span>
        </label>
        <select
          value={sedeSelecionada ? sedeSelecionada.id : setorAtual}
          onChange={(e) => handleSetorChange(e.target.value)}
          disabled={!anoAtual}
          className={selectCls}
        >
          <option value="">{anoAtual ? "Todos os setores" : "Escolha o ano primeiro"}</option>
          {sedes.map((s) => (
            <option key={s.id} value={s.id}>SEDE — {s.name}</option>
          ))}
          <optgroup label="Setor">
            {setoresComuns.map((s) => (
              <option key={s.id} value={s.id}>{s.name}</option>
            ))}
          </optgroup>
          <optgroup label="Regional">
            {regionais.map((s) => (
              <option key={s.id} value={s.id}>{s.name}</option>
            ))}
          </optgroup>
        </select>
      </div>

      <div>
        <label className={labelCls}>
          <span className="inline-flex items-center gap-1"><Church className="w-3 h-3" /> Igreja</span>
        </label>
        <select
          value={igrejaAtual}
          onChange={(e) => navegar({ ano: anoAtual, setor_id: setorAtual, igreja_id: e.target.value })}
          disabled={!setorAtual || !!sedeSelecionada}
          className={selectCls}
        >
          <option value="">
            {sedeSelecionada
              ? "SEDE selecionada acima"
              : setorAtual
                ? "Todas as igrejas do setor"
                : "Escolha o setor primeiro"}
          </option>
          {igrejas.map((i) => (
            <option key={i.id} value={i.id}>{i.name}</option>
          ))}
        </select>
      </div>
    </div>
  );
}
