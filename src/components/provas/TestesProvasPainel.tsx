"use client";

import { useMemo, useState } from "react";
import { Copy, Check, Search, Printer, Eye, EyeOff, MessageCircle, ChevronRight } from "lucide-react";

// ============================================================
// "Testes e Provas" — tela do professor e da secretaria (09/10/2026,
// pedido do Joaquim). Duas partes:
//  A) Links das provas públicas (link + CPF): TODAS as provas ficam
//     liberadas para professor e secretário (independente de turma/curso),
//     agrupadas por matéria — clica na matéria e abrem os testes, cada um
//     com "Copiar link" e "Enviar por WhatsApp" (sem número: abre o
//     WhatsApp pra escolher o grupo da turma).
//  B) Provas dos alunos: busca por nome/CPF/turma; clica na linha do aluno
//     e abrem as provas dele (resultado, visualizar questão por questão,
//     imprimir).
// Os dados chegam prontos do servidor, já limitados ao escopo de quem está
// logado (professor: só seus alunos; secretaria: núcleos do escopo).
// Todo texto em preto (#000000), pedido do Joaquim.
// ============================================================

export interface ProvaItem {
  id: string;
  materia: string;
  titulo: string;
  slug: string;
  numeroTeste: number;
}

export interface QuestaoItem {
  ordem: number;
  formato: string;
  enunciado: string;
  opcoes: string[] | null;
  respostaCorreta: string;
}

export interface AlunoItem {
  id: string;
  nome: string;
  cpf: string;
  matricula: string;
  cursos: string[];
  turmas: { id: string; nome: string }[];
}

export interface ResultadoItem {
  alunoId: string;
  provaId: string;
  acertos: number;
  total: number;
  nota: number;
  aprovado: boolean;
  enviadoEm: string;
  marcadas: Record<number, string>;
}

function soDigitos(s: string) {
  return s.replace(/\D/g, "");
}

function fmtCpf(cpf: string) {
  const d = soDigitos(cpf);
  return d.length === 11 ? `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6, 9)}-${d.slice(9)}` : cpf;
}

function fmtData(iso: string) {
  return new Date(iso).toLocaleString("pt-BR", {
    timeZone: "America/Sao_Paulo",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function escapeHtml(s: string) {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

const BOTAO =
  "inline-flex items-center gap-1.5 text-xs font-semibold text-[#FFFFFF] bg-[#000000] border border-[#CF8403] rounded-lg px-3 py-1.5 shadow-sm hover:opacity-80 transition-opacity";

export default function TestesProvasPainel({
  provas,
  alunos,
  resultados,
  questoesPorProva,
}: {
  provas: ProvaItem[];
  alunos: AlunoItem[];
  resultados: ResultadoItem[];
  questoesPorProva: Record<string, QuestaoItem[]>;
}) {
  const [copiado, setCopiado] = useState<string | null>(null);
  const [busca, setBusca] = useState("");
  const [turmaFiltro, setTurmaFiltro] = useState("");
  const [alunoAberto, setAlunoAberto] = useState<string | null>(null);
  const [provaAberta, setProvaAberta] = useState<string | null>(null);

  // ── Parte A: links ─────────────────────────────────────────
  const materias = useMemo(() => {
    const mapa = new Map<string, ProvaItem[]>();
    for (const p of provas) {
      const lista = mapa.get(p.materia) ?? [];
      lista.push(p);
      mapa.set(p.materia, lista);
    }
    return Array.from(mapa.entries())
      .sort((a, b) => a[0].localeCompare(b[0], "pt-BR"))
      .map(([materia, lista]) => ({ materia, lista: lista.sort((a, b) => a.numeroTeste - b.numeroTeste) }));
  }, [provas]);

  function url(slug: string) {
    return `${window.location.origin}/prova-publica/${slug}`;
  }

  function copiar(chave: string, texto: string) {
    navigator.clipboard.writeText(texto);
    setCopiado(chave);
    setTimeout(() => setCopiado(null), 2000);
  }

  function linhaProva(p: ProvaItem) {
    return `${p.titulo}\n${url(p.slug)}`;
  }

  function abrirWhatsapp(texto: string) {
    window.open(`https://wa.me/?text=${encodeURIComponent(texto)}`, "_blank", "noopener,noreferrer");
  }

  // ── Parte B: alunos e resultados ───────────────────────────
  const turmas = useMemo(() => {
    const mapa = new Map<string, string>();
    for (const a of alunos) for (const t of a.turmas) mapa.set(t.id, t.nome);
    return Array.from(mapa.entries()).sort((a, b) => a[1].localeCompare(b[1], "pt-BR"));
  }, [alunos]);

  const alunosFiltrados = useMemo(() => {
    const termo = busca.trim().toLowerCase();
    const dig = soDigitos(busca);
    return alunos.filter((a) => {
      if (turmaFiltro && !a.turmas.some((t) => t.id === turmaFiltro)) return false;
      if (!termo) return true;
      if (a.nome.toLowerCase().includes(termo)) return true;
      return dig.length >= 3 && soDigitos(a.cpf).includes(dig);
    });
  }, [alunos, busca, turmaFiltro]);

  function imprimir(a: AlunoItem, p: ProvaItem, r: ResultadoItem) {
    const questoes = questoesPorProva[p.id] ?? [];
    const corpo = questoes
      .map((q) => {
        const marcada = r.marcadas[q.ordem] ?? "—";
        const ok = marcada === q.respostaCorreta;
        const opcoes = q.opcoes ? `<div class="op">${q.opcoes.map(escapeHtml).join(" &nbsp;|&nbsp; ")}</div>` : "";
        return `<div class="q"><b>${q.ordem}.</b> ${escapeHtml(q.enunciado)}${opcoes}
          <div>Marcada: <b>${escapeHtml(marcada)}</b> &nbsp; Correta: <b>${escapeHtml(q.respostaCorreta)}</b> &nbsp; <b>${ok ? "ACERTOU" : "ERROU"}</b></div></div>`;
      })
      .join("");
    const w = window.open("", "_blank");
    if (!w) return;
    w.document.write(`<!doctype html><html><head><meta charset="utf-8"><title>${escapeHtml(p.titulo)} — ${escapeHtml(a.nome)}</title>
      <style>body{font-family:Arial,sans-serif;font-size:13px;color:#000;margin:24px}h1{font-size:16px;margin:0 0 4px}
      .q{border-bottom:1px solid #ccc;padding:8px 0}.op{color:#000;margin:4px 0}</style></head><body>
      <h1>${escapeHtml(p.titulo)}</h1><div>${escapeHtml(p.materia)}</div>
      <p>Aluno: <b>${escapeHtml(a.nome)}</b> — CPF ${escapeHtml(fmtCpf(a.cpf))}<br>
      Enviada em ${escapeHtml(fmtData(r.enviadoEm))} — ${r.acertos}/${r.total} acertos — nota ${r.nota.toFixed(1)} — ${r.aprovado ? "APROVADO" : "REPROVADO"}</p>
      ${corpo}<script>window.onload=function(){window.print()}<\/script></body></html>`);
    w.document.close();
  }

  return (
    <div className="space-y-10 text-black">
      {/* ── Parte A: links ─────────────────────────────── */}
      <section className="space-y-4">
        <p className="text-base font-semibold uppercase text-black">
          Copie o link e cole no grupo da turma, ou use &ldquo;Enviar por WhatsApp&rdquo; para escolher o grupo.
        </p>

        {materias.length === 0 && <p className="text-sm text-black">Nenhuma prova cadastrada ainda.</p>}

        {materias.map(({ materia, lista }) => {
          const todos = lista.map(linhaProva).join("\n\n");
          const chaveTodos = `todos-${materia}`;
          return (
            <details
              key={materia}
              className="group bg-iw-surface rounded-2xl border border-iw-gold overflow-hidden shadow-sm"
            >
              <summary className="flex items-center gap-3 px-5 py-3.5 cursor-pointer list-none [&::-webkit-details-marker]:hidden bg-iw-bg">
                <ChevronRight className="w-4 h-4 text-black transition-transform group-open:rotate-90" />
                <span className="text-sm font-black text-black uppercase flex-1">{materia}</span>
                <span className="text-xs font-semibold text-black">
                  {lista.length} teste{lista.length === 1 ? "" : "s"}
                </span>
                <button
                  type="button"
                  className={BOTAO}
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    copiar(chaveTodos, `${materia}\n\n${todos}`);
                  }}
                >
                  {copiado === chaveTodos ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                  {copiado === chaveTodos ? "Copiado!" : "Copiar todos"}
                </button>
                <button
                  type="button"
                  className={BOTAO}
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    abrirWhatsapp(`${materia}\n\n${todos}`);
                  }}
                >
                  <MessageCircle className="w-3.5 h-3.5" /> Todos por WhatsApp
                </button>
              </summary>

              <div className="border-t border-iw-border">
                <ul className="divide-y divide-iw-border">
                  {lista.map((p) => (
                    <li key={p.id} className="px-5 py-3 flex items-center justify-between gap-3 flex-wrap">
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-black">{p.titulo}</p>
                        <p className="text-xs text-black break-all">/prova-publica/{p.slug}</p>
                      </div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <button type="button" className={BOTAO} onClick={() => copiar(p.id, url(p.slug))}>
                          {copiado === p.id ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                          {copiado === p.id ? "Link copiado!" : "Copiar link"}
                        </button>
                        <button type="button" className={BOTAO} onClick={() => abrirWhatsapp(linhaProva(p))}>
                          <MessageCircle className="w-3.5 h-3.5" /> Enviar por WhatsApp
                        </button>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            </details>
          );
        })}
      </section>

      {/* ── Parte B: provas dos alunos ─────────────────── */}
      <section className="space-y-4">
        <div className="flex items-center gap-3 flex-wrap">
          <h2 className="text-lg font-black text-black">Provas dos alunos</h2>
          <div className="relative flex-1 min-w-[220px]">
            <Search className="w-4 h-4 text-black absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              placeholder="Buscar por nome ou CPF…"
              className="w-full border border-black/20 rounded-xl pl-9 pr-3 py-2.5 text-sm text-black placeholder:text-black bg-white"
            />
          </div>
          <select
            value={turmaFiltro}
            onChange={(e) => setTurmaFiltro(e.target.value)}
            className="border border-black/20 rounded-xl px-3 py-2.5 text-sm text-black bg-white"
          >
            <option value="">Todas as turmas</option>
            {turmas.map(([id, nome]) => (
              <option key={id} value={id}>
                {nome}
              </option>
            ))}
          </select>
        </div>

        {alunosFiltrados.length === 0 ? (
          <p className="text-sm text-black">Nenhum aluno encontrado.</p>
        ) : (
          <div className="bg-iw-surface rounded-2xl border border-iw-border overflow-hidden shadow-sm">
            {alunosFiltrados.slice(0, 300).map((a) => {
              const aberto = alunoAberto === a.id;
              return (
                <div key={a.id} className="border-b border-iw-border/60 last:border-0">
                  <button
                    type="button"
                    onClick={() => {
                      setAlunoAberto(aberto ? null : a.id);
                      setProvaAberta(null);
                    }}
                    className="w-full grid grid-cols-[24px_1.4fr_1fr_1.4fr] items-center gap-3 px-4 py-3 text-left hover:bg-black/5 transition-colors"
                  >
                    <ChevronRight className={`w-4 h-4 text-black transition-transform ${aberto ? "rotate-90" : ""}`} />
                    <span className="text-sm font-bold text-black">{a.nome}</span>
                    <span className="text-sm text-black">{a.matricula || fmtCpf(a.cpf) || "—"}</span>
                    <span className="text-sm text-black">{a.cursos.join(", ") || "—"}</span>
                  </button>

                  {aberto && (
                    <div className="px-4 pb-4 pt-1 space-y-3 bg-white">
                      <p className="text-xs text-black">CPF {fmtCpf(a.cpf) || "—"}</p>
                      {provas.length === 0 && <p className="text-sm text-black">Nenhuma prova cadastrada.</p>}
                      {provas.map((p) => {
                        const r = resultados.find((x) => x.alunoId === a.id && x.provaId === p.id) ?? null;
                        const questoes = questoesPorProva[p.id] ?? [];
                        const chave = `${a.id}:${p.id}`;
                        return (
                          <div key={p.id} className="border border-black/15 rounded-xl p-3 space-y-2 bg-white">
                            <div className="flex items-center justify-between gap-2 flex-wrap">
                              <div>
                                <p className="text-sm font-bold text-black">{p.titulo}</p>
                                <p className="text-xs text-black">{p.materia}</p>
                              </div>
                              <span
                                className={`text-[11px] font-bold uppercase px-2 py-1 rounded-full text-black ${
                                  r ? (r.aprovado ? "bg-iw-success-bg" : "bg-iw-error-bg") : "bg-black/10"
                                }`}
                              >
                                {r ? (r.aprovado ? "Aprovado" : "Reprovado") : "Não feita"}
                              </span>
                            </div>

                            {r && (
                              <>
                                <p className="text-xs text-black">
                                  {r.acertos}/{r.total} acertos · nota {r.nota.toFixed(1)} · enviada em{" "}
                                  {fmtData(r.enviadoEm)}
                                </p>
                                <div className="flex gap-2 flex-wrap">
                                  <button
                                    type="button"
                                    className={BOTAO}
                                    onClick={() => setProvaAberta(provaAberta === chave ? null : chave)}
                                  >
                                    {provaAberta === chave ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                                    {provaAberta === chave ? "Ocultar" : "Visualizar"}
                                  </button>
                                  <button type="button" className={BOTAO} onClick={() => imprimir(a, p, r)}>
                                    <Printer className="w-3.5 h-3.5" /> Imprimir
                                  </button>
                                </div>

                                {provaAberta === chave && (
                                  <ol className="space-y-2 pt-1">
                                    {questoes.map((q) => {
                                      const marcada = r.marcadas[q.ordem] ?? "—";
                                      const ok = marcada === q.respostaCorreta;
                                      return (
                                        <li
                                          key={q.ordem}
                                          className={`text-xs text-black rounded-lg p-2.5 border ${
                                            ok
                                              ? "border-iw-success/40 bg-iw-success-bg/50"
                                              : "border-iw-error/40 bg-iw-error-bg/50"
                                          }`}
                                        >
                                          <p className="font-semibold">
                                            {q.ordem}. {q.enunciado}
                                          </p>
                                          {q.opcoes && <p className="mt-0.5">{q.opcoes.join("  |  ")}</p>}
                                          <p className="mt-1">
                                            Marcada: <b>{marcada}</b> · Correta: <b>{q.respostaCorreta}</b> ·{" "}
                                            <b>{ok ? "Acertou" : "Errou"}</b>
                                          </p>
                                        </li>
                                      );
                                    })}
                                  </ol>
                                )}
                              </>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
