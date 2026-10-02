"use client";

import { useRef, useState, useTransition } from "react";
import { AlertTriangle, CheckCircle2, XCircle, Loader2, User, Gauge } from "lucide-react";
import { enviarProvaPublicaAction, checarProvaPublicaAction } from "./actions";
import { validarCPF } from "@/utils/cpf";

type Questao = {
  ordem: number;
  formato: "CERTO_ERRADO" | "ASSOCIACAO_COLUNAS";
  enunciado: string;
  opcoes: string[] | null;
};

interface Props {
  slug: string;
  questoes: Questao[];
}

const NOTA_MINIMA = 6.1;

const inputCls =
  "w-full bg-white border border-iw-navy rounded-xl px-3 py-2.5 text-[15px] text-black placeholder-iw-muted focus:border-iw-gold focus:outline-none focus:ring-2 focus:ring-iw-gold/40 transition-colors";
const labelCls = "block text-[11px] font-bold text-black uppercase tracking-wider mb-1.5";

function maskCPF(raw: string): string {
  let v = raw.replace(/\D/g, "").slice(0, 11);
  v = v.replace(/(\d{3})(\d)/, "$1.$2");
  v = v.replace(/(\d{3})(\d)/, "$1.$2");
  v = v.replace(/(\d{3})(\d{1,2})$/, "$1-$2");
  return v;
}

// ── Pill Certo/Errado — verde "C" / vermelho "E", à direita da pergunta ──
function PillCertoErrado({
  valorSelecionado,
  travada,
  onSelecionar,
}: {
  valorSelecionado: string | undefined;
  travada: boolean;
  onSelecionar: (valor: "C" | "E") => void;
}) {
  return (
    <div className="flex gap-2 shrink-0">
      {(["C", "E"] as const).map((valor) => {
        const selecionado = valorSelecionado === valor;
        const corBase =
          valor === "C"
            ? selecionado
              ? "bg-iw-success text-white border-iw-success"
              : "bg-white text-iw-success border-iw-success"
            : selecionado
              ? "bg-iw-error text-white border-iw-error"
              : "bg-white text-iw-error border-iw-error";
        return (
          <button
            key={valor}
            type="button"
            disabled={travada}
            onClick={() => onSelecionar(valor)}
            className={`w-11 h-11 rounded-full border-2 font-black text-base flex items-center justify-center transition-colors disabled:opacity-60 disabled:cursor-not-allowed ${corBase}`}
          >
            {valor}
          </button>
        );
      })}
    </div>
  );
}

export default function ProvaPublicaForm({ slug, questoes }: Props) {
  const [nome, setNome] = useState("");
  const [cpf, setCpf] = useState("");
  const [respostas, setRespostas] = useState<Record<number, string>>({});
  const [travadas, setTravadas] = useState<Record<number, boolean>>({});
  const [faltando, setFaltando] = useState<Set<number>>(new Set());
  const [error, setError] = useState("");
  const [cpfErro, setCpfErro] = useState("");
  const [isPending, startTransition] = useTransition();
  const [modo, setModo] = useState<"preenchendo" | "refazendo" | "final">("preenchendo");
  const [live, setLive] = useState<{ acertos: number; total: number; nota: number } | null>(null);
  // true assim que o índice ao vivo atinge a média -- trava tudo na hora
  // (não deixa responder mais nada) enquanto o envio final é confirmado
  // no servidor.
  const [finalizando, setFinalizando] = useState(false);
  const [resultadoFinal, setResultadoFinal] = useState<{
    acertos: number;
    total: number;
    nota: number;
    aprovado: boolean;
    vinculadoAgora: boolean;
  } | null>(null);

  const refsQuestao = useRef<Record<number, HTMLDivElement | null>>({});
  const topoRef = useRef<HTMLDivElement | null>(null);

  function handleCpfChange(raw: string) {
    const mascarado = maskCPF(raw);
    setCpf(mascarado);
    // 01/10/2026, achado em teste (Joaquim, celular): digitar CPF errado e
    // só descobrir depois de rolar a tela até o topo era confuso. Agora
    // valida assim que o CPF estiver completo (14 caracteres com máscara),
    // mostrando o erro embaixo do próprio campo, sem esperar o envio.
    if (mascarado.length === 14) {
      setCpfErro(validarCPF(mascarado) ? "" : "CPF inválido — confira os números.");
    } else {
      setCpfErro("");
    }
  }

  function montarRespostas() {
    return questoes.map((q) => ({ ordem: q.ordem, resposta: respostas[q.ordem] ?? "" }));
  }

  function scrollParaQuestao(ordem: number) {
    refsQuestao.current[ordem]?.scrollIntoView({ behavior: "smooth", block: "center" });
  }

  async function finalizar() {
    const res = await enviarProvaPublicaAction(slug, cpf, nome.trim(), montarRespostas());
    if (!res.success) {
      setError(res.message);
      return;
    }
    setResultadoFinal({
      acertos: res.acertos,
      total: res.total,
      nota: res.nota,
      aprovado: res.aprovado,
      vinculadoAgora: res.vinculadoAgora,
    });
    if (res.aprovado) {
      setModo("final");
    } else {
      // Trava as certas, limpa só as erradas pro aluno refazer.
      const novasRespostas = { ...respostas };
      const novasTravadas: Record<number, boolean> = {};
      for (const [ordemStr, certa] of Object.entries(res.porQuestao)) {
        const ordem = Number(ordemStr);
        novasTravadas[ordem] = certa;
        if (!certa) delete novasRespostas[ordem];
      }
      setRespostas(novasRespostas);
      setTravadas(novasTravadas);
      setLive({ acertos: res.acertos, total: res.total, nota: res.nota });
      setModo("refazendo");
    }
  }

  function handleEnviarInicial() {
    setError("");
    if (!nome.trim()) {
      setError("Informe seu nome completo.");
      topoRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
      return;
    }
    if (!cpf.trim() || !validarCPF(cpf)) {
      setCpfErro("CPF inválido — confira os números.");
      setError("Informe um CPF válido.");
      topoRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
      return;
    }

    const faltam = questoes.filter((q) => !respostas[q.ordem]).map((q) => q.ordem);
    if (faltam.length > 0) {
      setFaltando(new Set(faltam));
      scrollParaQuestao(faltam[0]);
      return;
    }
    setFaltando(new Set());
    startTransition(finalizar);
  }

  function handleSelecionarRefazendo(ordem: number, valor: string) {
    const novasRespostas = { ...respostas, [ordem]: valor };
    setRespostas(novasRespostas);

    startTransition(async () => {
      const resposta = questoes.map((q) => ({ ordem: q.ordem, resposta: novasRespostas[q.ordem] ?? "" }));
      const res = await checarProvaPublicaAction(slug, resposta);
      if (!res.success) return;

      setLive({ acertos: res.acertos, total: res.total, nota: res.nota });

      // Trava de novo qualquer questão que acabou de acertar -- só as que
      // continuam erradas seguem editáveis.
      setTravadas((t) => {
        const novas = { ...t };
        for (const [ordemStr, certa] of Object.entries(res.porQuestao)) {
          if (certa) novas[Number(ordemStr)] = true;
        }
        return novas;
      });

      if (res.aprovado) {
        // Trava tudo na hora -- não deixa responder mais nenhuma questão
        // enquanto confirma o envio final no servidor.
        setFinalizando(true);
        // permitirParcial=true: pode sobrar questão errada ainda em branco
        // (já contou como errada no cálculo acima) -- não bloqueia o envio
        // já que a média mínima já foi atingida.
        const final = await enviarProvaPublicaAction(slug, cpf, nome.trim(), resposta, true);
        if (final.success) {
          setResultadoFinal({
            acertos: final.acertos,
            total: final.total,
            nota: final.nota,
            aprovado: final.aprovado,
            vinculadoAgora: final.vinculadoAgora,
          });
          setModo("final");
        } else {
          setFinalizando(false);
          setError(final.message);
        }
      }
    });
  }

  if (modo === "final" && resultadoFinal) {
    return (
      <div className="text-center space-y-4 py-4">
        {resultadoFinal.aprovado ? (
          <CheckCircle2 className="w-12 h-12 text-iw-success mx-auto" />
        ) : (
          <XCircle className="w-12 h-12 text-iw-error mx-auto" />
        )}
        <div>
          <p className="font-bold text-black text-[20px]">Teste enviado!</p>
          <p className="text-[17px] text-black mt-1">
            Você acertou <span className="font-bold">{resultadoFinal.acertos}</span> de{" "}
            <span className="font-bold">{resultadoFinal.total}</span> — nota{" "}
            <span className="font-bold">{resultadoFinal.nota.toFixed(1)}</span>.
          </p>
          <p
            className={`text-[17px] font-bold uppercase mt-2 ${
              resultadoFinal.aprovado ? "text-iw-success" : "text-iw-error"
            }`}
          >
            {resultadoFinal.aprovado ? "Aprovado" : `Não atingiu a média mínima (${NOTA_MINIMA.toFixed(1).replace(".", ",")})`}
          </p>
        </div>
        <p className="text-[18px] text-black max-w-md mx-auto">
          {resultadoFinal.vinculadoAgora
            ? "Você já tem matrícula no sistema com este CPF — este resultado já foi vinculado automaticamente ao seu histórico."
            : "Assim que sua matrícula for cadastrada pela secretaria com este mesmo CPF, este resultado será vinculado automaticamente ao seu histórico."}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6 relative" ref={topoRef}>
      {error && (
        <div className="flex items-center gap-2 text-iw-error text-[15px] bg-iw-error-bg border border-iw-error/20 px-4 py-3 rounded-xl">
          <AlertTriangle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {modo === "refazendo" && (
        <div className="flex items-center justify-center gap-2 text-center bg-iw-warning-bg border border-iw-warning/30 px-4 py-3 rounded-xl text-[16px]">
          <AlertTriangle className="w-5 h-5 shrink-0 text-iw-warning" />
          <span className="text-black">
            Você não atingiu a média mínima ({NOTA_MINIMA.toFixed(1).replace(".", ",")}). As questões certas ficaram
            travadas — corrija só as marcadas em vermelho.
          </span>
        </div>
      )}

      {modo === "refazendo" && live && (
        <div className="sticky top-4 z-40 flex justify-center">
          <div className="bg-iw-navy text-white rounded-2xl shadow-lg px-5 py-3 flex items-center gap-3">
            <Gauge className="w-5 h-5 text-iw-gold shrink-0" />
            <div className="text-center leading-tight">
              <p className="text-[11px] uppercase tracking-wide text-white/70">Progresso ao vivo</p>
              <p className="text-sm font-bold">
                {live.acertos}/{live.total} · nota {live.nota.toFixed(1)} (mínimo{" "}
                {NOTA_MINIMA.toFixed(1).replace(".", ",")})
              </p>
            </div>
            {(isPending || finalizando) && <Loader2 className="w-4 h-4 animate-spin shrink-0" />}
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className={labelCls}>
            <span className="inline-flex items-center gap-1">
              <User className="w-3 h-3" /> Nome completo *
            </span>
          </label>
          <input
            value={nome}
            onChange={(e) => setNome(e.target.value.toUpperCase())}
            placeholder="Seu nome completo"
            disabled={modo === "refazendo"}
            className={`${inputCls} uppercase disabled:opacity-70`}
          />
        </div>
        <div>
          <label className={labelCls}>CPF *</label>
          <input
            value={cpf}
            onChange={(e) => handleCpfChange(e.target.value)}
            placeholder="000.000.000-00"
            disabled={modo === "refazendo"}
            className={`${inputCls} disabled:opacity-70 ${cpfErro ? "border-iw-error focus:border-iw-error focus:ring-iw-error/30" : ""}`}
          />
          {cpfErro && (
            <p className="text-iw-error text-[13px] font-semibold mt-1.5 flex items-center gap-1">
              <AlertTriangle className="w-3.5 h-3.5 shrink-0" /> {cpfErro}
            </p>
          )}
        </div>
      </div>

      <div className="space-y-5">
        {questoes.map((q) => {
          const emFalta = faltando.has(q.ordem);
          const travada = (modo === "refazendo" && !!travadas[q.ordem]) || finalizando;
          const errada = modo === "refazendo" && travadas[q.ordem] === false;

          return (
            <div
              key={q.ordem}
              ref={(el) => {
                refsQuestao.current[q.ordem] = el;
              }}
              className={`border-b pb-4 ${errada ? "border-iw-error" : "border-iw-border"}`}
            >
              {q.formato === "CERTO_ERRADO" ? (
                <div className="flex items-center justify-between gap-4">
                  <p className="text-[17px] text-black leading-snug">
                    <span className="font-bold">{q.ordem}.</span> {q.enunciado}
                  </p>
                  <div className="flex items-center gap-3 shrink-0">
                    {emFalta && (
                      <span className="text-iw-error text-[16px] font-bold uppercase whitespace-nowrap flex items-center gap-1">
                        <AlertTriangle className="w-4 h-4 shrink-0" /> EM BRANCO
                      </span>
                    )}
                    <PillCertoErrado
                      valorSelecionado={respostas[q.ordem]}
                      travada={travada}
                      onSelecionar={(valor) =>
                        modo === "refazendo"
                          ? handleSelecionarRefazendo(q.ordem, valor)
                          : setRespostas((r) => ({ ...r, [q.ordem]: valor }))
                      }
                    />
                  </div>
                </div>
              ) : (
                <div>
                  <p className="text-[17px] text-black leading-snug mb-2">
                    <span className="font-bold">{q.ordem}.</span> {q.enunciado}
                  </p>
                  <select
                    value={respostas[q.ordem] ?? ""}
                    disabled={travada}
                    onChange={(e) =>
                      modo === "refazendo"
                        ? handleSelecionarRefazendo(q.ordem, e.target.value)
                        : setRespostas((r) => ({ ...r, [q.ordem]: e.target.value }))
                    }
                    className={`${inputCls} disabled:opacity-70`}
                  >
                    <option value="">Selecione a correspondência...</option>
                    {(q.opcoes ?? []).map((op) => (
                      <option key={op} value={op.trim().charAt(0)}>
                        {op}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {emFalta && q.formato === "ASSOCIACAO_COLUNAS" && (
                <p className="text-iw-error text-[16px] font-bold uppercase mt-2 flex items-center gap-1">
                  <AlertTriangle className="w-4 h-4" /> EM BRANCO
                </p>
              )}
            </div>
          );
        })}
      </div>

      {modo === "preenchendo" && (
        <button
          type="button"
          disabled={isPending}
          onClick={handleEnviarInicial}
          className="w-full flex items-center justify-center gap-2 bg-[#CF8403] hover:opacity-90 disabled:opacity-50 text-white px-6 py-3 rounded-xl text-[15px] font-bold transition-colors shadow-sm"
        >
          {isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
          Enviar teste
        </button>
      )}

    </div>
  );
}
