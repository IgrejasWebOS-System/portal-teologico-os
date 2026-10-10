"use client";

import { useState } from "react";
import { Eye, EyeOff, Printer } from "lucide-react";
import { BOTAO, BADGE } from "@/components/provas/TestesProvasPainel";
import { imprimirProva, fmtDataHora, COR_ACERTOU, COR_ERROU } from "@/components/provas/imprimirProva";
import type { ProvaPublicaDoAluno } from "@/utils/provasPublicas/provasDoAluno";

// ============================================================
// Lista de testes/provas feitos pelo link público, na tela do ALUNO
// (Impressão > Testes e Prova). 10/10/2026, pedido do Joaquim: mesmo
// "Visualizar" (questão por questão) e "Imprimir" da tela do professor.
// ============================================================

export default function ProvasLinkDoAluno({
  alunoNome,
  matricula,
  curso,
  professorNome,
  itens,
}: {
  alunoNome: string;
  matricula: string;
  curso?: string;
  professorNome?: string;
  itens: ProvaPublicaDoAluno[];
}) {
  const [aberta, setAberta] = useState<string | null>(null);

  return (
    <div className="space-y-3 text-black">
      {itens.map((r) => (
        <div key={r.provaId} className="border border-black/15 rounded-xl p-3 space-y-2 bg-white break-inside-avoid">
          {/* Tudo na mesma linha: Título - Matéria - acertos · nota · enviada em */}
          <p className="text-[#000000]">
            <span className="text-[12.5pt] font-bold">
              {r.titulo} - {r.materia}
            </span>
            <span className="text-[11pt]">
              {" "}
              - {r.acertos}/{r.total} acertos{" "}
              <span className="font-black bg-[#FFE08A] rounded px-1">· nota {r.nota.toFixed(1)} ·</span> enviada em{" "}
              {fmtDataHora(r.enviadoEm)}
            </span>
          </p>

          <div className="flex gap-2 flex-wrap items-center print:hidden">
            <button type="button" className={BOTAO} onClick={() => setAberta(aberta === r.provaId ? null : r.provaId)}>
              {aberta === r.provaId ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
              {aberta === r.provaId ? "Ocultar" : "Visualizar"}
            </button>
            <button
              type="button"
              className={BOTAO}
              onClick={() =>
                imprimirProva({
                  alunoNome,
                  matricula,
                  curso,
                  professorNome,
                  titulo: r.titulo,
                  materia: r.materia,
                  enviadoEm: r.enviadoEm,
                  acertos: r.acertos,
                  total: r.total,
                  nota: r.nota,
                  aprovado: r.aprovado,
                  marcadas: r.marcadas,
                  questoes: r.questoes,
                })
              }
            >
              <Printer className="w-3.5 h-3.5" /> Imprimir
            </button>
            <span className={`${BADGE} ${r.aprovado ? "bg-iw-success-bg" : "bg-iw-error-bg"}`}>
              {r.aprovado ? "Aprovado" : "Reprovado"}
            </span>
          </div>

          {aberta === r.provaId && (
            <ol className="space-y-2 pt-1 print:hidden">
              {r.questoes.map((q) => {
                const marcada = r.marcadas[q.ordem] || "em branco";
                const ok = marcada === q.respostaCorreta;
                return (
                  <li key={q.ordem} className="text-[11pt] text-[#000000] rounded-lg p-2.5 border border-black/15">
                    {/* Na TELA o resultado fica numa linha abaixo da pergunta; só no
                        PDF impresso ele vai na mesma linha (imprimirProva.ts). */}
                    <p>
                      <b>{q.ordem}.</b> {q.enunciado}
                    </p>
                    {q.opcoes && <p className="mt-0.5">{q.opcoes.join("  |  ")}</p>}
                    <p className="mt-1">
                      Marcada: <b>{marcada}</b> &nbsp;Correta: <b>{q.respostaCorreta}</b> &nbsp;
                      <b style={{ color: ok ? COR_ACERTOU : COR_ERROU }}>{ok ? "ACERTOU" : "ERROU"}</b>
                    </p>
                  </li>
                );
              })}
            </ol>
          )}
        </div>
      ))}
    </div>
  );
}
