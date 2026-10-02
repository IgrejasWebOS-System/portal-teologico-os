"use client";

// ============================================================
// 26/09/2026, pedido do Joaquim: extraído do que já existia (inline)
// em ProfessorForm.tsx (campo "Naturalidade — cidade") pra virar um hook
// único, reaproveitado em toda ficha cadastral que tenha campo de Cidade
// (residencial ou naturalidade) — auditoria completa em
// staging/governance (ver ERROS-COMUNS-IA.md, entrada 26/09/2026,
// "padronização selects/datalist").
//
// Retorna a lista nacional de municípios (IBGE, endpoint plano — todas
// as ~5.570 cidades numa chamada só) + as regiões administrativas do DF
// (settings_custom_regions — o IBGE não separa Brasília em regiões,
// então essas entram como "cidades" extras só pra DF) pra alimentar um
// <datalist>. UF não depende de fetch nenhum — usa o espelho estático
// ESTADOS_BR (src/utils/estadosBrasil.ts), que já existia e evita uma
// segunda chamada à API do IBGE só pra listar 27 UFs.
//
// Uso (mesmo padrão em toda ficha):
//   const { catalogoCidades } = useCatalogoCidades();
//   <input list="lista-cidades-NOME_UNICO" ... />
//   <datalist id="lista-cidades-NOME_UNICO">
//     {catalogoCidades.map((c) => <option key={`${c.nome}-${c.uf}`} value={`${c.nome} (${c.uf})`} />)}
//   </datalist>
// ============================================================

import { useEffect, useState } from "react";
import { createClient } from "@/utils/supabase/client";

export type CidadeComUf = { nome: string; uf: string };

let cacheCatalogoCidades: CidadeComUf[] | null = null;
let promiseCatalogoCidades: Promise<CidadeComUf[]> | null = null;

async function carregarCatalogoCidades(): Promise<CidadeComUf[]> {
  if (cacheCatalogoCidades) return cacheCatalogoCidades;
  if (promiseCatalogoCidades) return promiseCatalogoCidades;

  promiseCatalogoCidades = (async () => {
    let doIbge: CidadeComUf[] = [];
    try {
      const resMunicipios = await fetch(
        "https://servicodados.ibge.gov.br/api/v1/localidades/municipios?orderBy=nome"
      );
      const municipios: { nome: string; microrregiao?: { mesorregiao?: { UF?: { sigla?: string } } } }[] =
        await resMunicipios.json();
      doIbge = municipios
        .filter((m) => m.microrregiao?.mesorregiao?.UF?.sigla)
        .map((m) => ({ nome: m.nome, uf: m.microrregiao!.mesorregiao!.UF!.sigla! }));
    } catch {
      // silencioso — datalist fica sem opções, campo continua editável na mão
    }

    let doDf: CidadeComUf[] = [];
    try {
      const supabase = createClient();
      const { data: regioesDf } = await supabase.from("settings_custom_regions").select("name").eq("state_uf", "DF");
      doDf = (regioesDf ?? []).map((r) => ({ nome: r.name, uf: "DF" }));
    } catch {
      // silencioso — idem
    }

    const catalogo = [...doIbge, ...doDf].sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR"));
    cacheCatalogoCidades = catalogo;
    return catalogo;
  })();

  return promiseCatalogoCidades;
}

export function useCatalogoCidades() {
  const [catalogoCidades, setCatalogoCidades] = useState<CidadeComUf[]>(cacheCatalogoCidades ?? []);

  useEffect(() => {
    let ativo = true;
    carregarCatalogoCidades().then((catalogo) => {
      if (ativo) setCatalogoCidades(catalogo);
    });
    return () => {
      ativo = false;
    };
  }, []);

  return { catalogoCidades };
}

// Ao digitar/escolher no datalist, se o texto bater "Nome (UF)" com uma
// cidade do catálogo, retorna { cidade, uf }; senão retorna a cidade como
// texto livre (uf null) — mesmo comportamento que já existia no
// ProfessorForm, agora compartilhado.
export function resolverCidadeDigitada(
  valorDigitado: string,
  catalogoCidades: CidadeComUf[]
): { cidade: string; uf: string | null } {
  const match = catalogoCidades.find((c) => `${c.nome} (${c.uf})` === valorDigitado || c.nome === valorDigitado);
  if (match) return { cidade: match.nome.toUpperCase(), uf: match.uf };
  return { cidade: valorDigitado.toUpperCase(), uf: null };
}
