// ============================================================
// Totais da tela de Turmas. Até 02/10/2026 este componente também tinha
// Setor/Regional e Igreja em cascata (substituídos pelos 3 blocos
// SEDE/SETOR/REGIONAL clicáveis da própria page.tsx).
//
// 16/10/2026, pedido do Joaquim:
//  - o seletor de ANO saiu daqui e foi para a linha da busca (TurmasBusca.tsx);
//  - este cartão ficou só com os totais do ano escolhido e aparece depois da
//    linha de busca, só quando um Ano está selecionado;
//  - o layout dos totais agora é compartilhado com Alunos e Professores
//    (@/components/layout/TotaisComposicao).
// ============================================================

import { CartaoTotais, TotaisComposicao } from "@/components/layout/TotaisComposicao";

export type UnitLite = { id: string; type: string; name: string; parent_id: string | null };

export function TotaisTurmas(props: { total: number; sede: number; setor: number; regional: number }) {
  return <TotaisComposicao rotuloTotal="Total de turmas" {...props} />;
}

interface Props {
  anoAtual: string;
  totalGeral: number;
  totalSede: number;
  totalSetor: number;
  totalRegional: number;
}

export default function TurmasFiltros({ anoAtual, totalGeral, totalSede, totalSetor, totalRegional }: Props) {
  if (!anoAtual) return null;

  return (
    <CartaoTotais
      rotuloTotal="Total de turmas"
      total={totalGeral}
      sede={totalSede}
      setor={totalSetor}
      regional={totalRegional}
    />
  );
}
