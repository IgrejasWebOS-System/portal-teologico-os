"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Filter } from "lucide-react";

// ============================================================
// Filtro da tela de Matrículas (21/09/2026, pedido do Joaquim, achado em
// teste): por padrão a lista só mostra as matrículas de HOJE (ver page.tsx)
// -- este painel deixa ver outro período, ou ver tudo, e restringir por
// Setor/Regional e por "Igreja núcleo" (churches.is_nucleo_ensino, mais a
// SEDE -- ver migration 110). É um <form method="GET"> simples: cada campo
// vira querystring, a page.tsx (server component) lê e filtra.
//
// 26/09/2026, padronização pedida pelo Joaquim (varredura geral): mesmo
// sendo um filtro (não cadastro), passou a seguir o mesmo padrão visual —
// SEDE como opção dentro da própria caixa "Setor", grupos "Setor"/
// "Regional", e a caixa "Igreja núcleo" restrita às igrejas do Setor
// escolhido (ou travada na SEDE quando ela for a opção escolhida).
// ============================================================

type SelectItem = { id: string; name: string };
type IgrejaNucleo = { id: string; name: string; sector_id: string | null };

interface Props {
  setores: SelectItem[];
  igrejasNucleo: IgrejaNucleo[];
  sedeChurchId: string | null;
  dataInicio: string;
  dataFim: string;
  setorId: string;
  igrejaId: string;
  todas: boolean;
  temFiltroAtivo: boolean;
  busca: string;
}

export default function FiltroMatriculas({
  setores,
  igrejasNucleo,
  sedeChurchId,
  dataInicio,
  dataFim,
  setorId: setorIdInicial,
  igrejaId: igrejaIdInicial,
  todas,
  temFiltroAtivo,
  busca,
}: Props) {
  const [aberto, setAberto] = useState(false);
  const [setorId, setSetorId] = useState(setorIdInicial);
  const [igrejaId, setIgrejaId] = useState(igrejaIdInicial);

  const setoresComuns = useMemo(
    () => setores.filter((s) => !s.name.toUpperCase().startsWith("REGIONAL")),
    [setores]
  );
  const setoresRegionais = useMemo(
    () => setores.filter((s) => s.name.toUpperCase().startsWith("REGIONAL")),
    [setores]
  );
  const sedeChurch = useMemo(
    () => igrejasNucleo.find((i) => i.id === sedeChurchId) ?? null,
    [igrejasNucleo, sedeChurchId]
  );
  const sedeSelecionada = !!sedeChurch && setorId === sedeChurch.id;
  // Sem Setor escolhido → todas as igrejas núcleo (comportamento de
  // sempre); com SEDE escolhida → só ela; com um Setor real escolhido →
  // só os núcleos daquele Setor (a Sede nunca entra misturada — ela não
  // pertence a nenhum Setor).
  const igrejasFiltradas = useMemo(() => {
    if (sedeSelecionada) return sedeChurch ? [sedeChurch] : [];
    if (!setorId) return igrejasNucleo;
    return igrejasNucleo.filter((i) => i.sector_id === setorId);
  }, [sedeSelecionada, sedeChurch, setorId, igrejasNucleo]);

  const handleSetorChange = (value: string) => {
    setSetorId(value);
    setIgrejaId(sedeChurch && value === sedeChurch.id ? sedeChurch.id : "");
  };

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setAberto((v) => !v)}
        className={`inline-flex items-center gap-2 font-bold text-xs px-4 py-2.5 rounded-xl transition-colors border ${
          temFiltroAtivo
            ? "bg-[#0D0D0D] text-white border-[1.5px] border-[#CF8403]"
            : "bg-white hover:bg-iw-bg text-iw-navy border-iw-border"
        }`}
      >
        <Filter className="w-4 h-4" />
        Filtro
      </button>

      {aberto && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setAberto(false)} />
          <form
            method="GET"
            action="/admin/matriculas"
            className="absolute z-50 right-0 top-full mt-2 w-80 bg-white border border-iw-border rounded-2xl shadow-lg p-4 space-y-3"
          >
            {/* Preserva a busca por texto ao aplicar o filtro -- mesmo
                motivo do hidden espelhado no form de busca em page.tsx. */}
            {busca && <input type="hidden" name="q" value={busca} />}
            <div>
              <p className="text-[11px] font-bold text-iw-muted uppercase tracking-wider mb-1.5">Período</p>
              <div className="grid grid-cols-2 gap-2">
                <input
                  type="date"
                  name="data_inicio"
                  defaultValue={dataInicio}
                  className="bg-white border border-iw-border rounded-lg px-2 py-1.5 text-xs text-iw-navy focus:outline-none focus:border-iw-gold"
                />
                <input
                  type="date"
                  name="data_fim"
                  defaultValue={dataFim}
                  className="bg-white border border-iw-border rounded-lg px-2 py-1.5 text-xs text-iw-navy focus:outline-none focus:border-iw-gold"
                />
              </div>
            </div>

            <div>
              <p className="text-[11px] font-bold text-iw-muted uppercase tracking-wider mb-1.5">Setor / Regional</p>
              {/* O <select> visível só controla o estado local (pra poder
                  mostrar "SEDE — nome" selecionado); o valor de verdade
                  enviado no formulário é o hidden abaixo -- quando SEDE é a
                  opção escolhida, sector_id vai vazio (Sede não pertence a
                  nenhum Setor). */}
              <input type="hidden" name="setor_id" value={sedeSelecionada ? "" : setorId} />
              <select
                value={setorId}
                onChange={(e) => handleSetorChange(e.target.value)}
                className="w-full bg-white border border-iw-border rounded-lg px-2 py-1.5 text-xs text-iw-navy focus:outline-none focus:border-iw-gold"
              >
                <option value="">Todos</option>
                {sedeChurch && <option value={sedeChurch.id}>SEDE — {sedeChurch.name}</option>}
                <optgroup label="Setor">
                  {setoresComuns.map((s) => (
                    <option key={s.id} value={s.id}>{s.name}</option>
                  ))}
                </optgroup>
                <optgroup label="Regional">
                  {setoresRegionais.map((s) => (
                    <option key={s.id} value={s.id}>{s.name}</option>
                  ))}
                </optgroup>
              </select>
            </div>

            <div>
              <p className="text-[11px] font-bold text-iw-muted uppercase tracking-wider mb-1.5">Igreja núcleo</p>
              <select
                name="igreja_id"
                value={igrejaId}
                onChange={(e) => setIgrejaId(e.target.value)}
                disabled={sedeSelecionada}
                className="w-full bg-white border border-iw-border rounded-lg px-2 py-1.5 text-xs text-iw-navy focus:outline-none focus:border-iw-gold disabled:opacity-50"
              >
                <option value="">{sedeSelecionada ? "SEDE selecionada acima" : "Todas"}</option>
                {igrejasFiltradas.map((i) => (
                  <option key={i.id} value={i.id}>{i.name}</option>
                ))}
              </select>
            </div>

            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" name="todas" value="1" defaultChecked={todas} className="w-3.5 h-3.5 accent-iw-gold" />
              <span className="text-xs text-iw-navy">Ver todas as datas (sem o filtro padrão &ldquo;hoje&rdquo;)</span>
            </label>

            <div className="flex items-center justify-between gap-2 pt-1">
              <Link href="/admin/matriculas" className="text-xs font-semibold text-iw-muted hover:text-iw-navy">
                Limpar
              </Link>
              <button
                type="submit"
                className="bg-[#E88D0C] hover:opacity-90 text-white font-bold text-xs px-4 py-2 rounded-lg transition-opacity"
              >
                Aplicar
              </button>
            </div>
          </form>
        </>
      )}
    </div>
  );
}
