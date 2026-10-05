"use client";

import { useState, useTransition } from "react";
import { Upload, CheckCircle2, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Card, CardHeader, CardBody } from "@/components/ui/Card";
import { extrairPreviewAction, confirmarImportacaoAction, type PreviewProva } from "./actions";

// ============================================================
// Tela de importação de provas públicas a partir de PDF. Não publica
// nada sozinha -- passo 1 (pré-visualizar) só lê os PDFs e mostra o
// resultado; passo 2 (confirmar) só roda depois de revisão manual de
// cada questão/resposta aqui na tela. Ver actions.ts pro porquê disso.
// ============================================================

// O <input type="file"> nativo perde todo estilo do navegador com o CSS
// reset do projeto (ficava só texto cinza sem parecer clicável — achado
// em teste, Joaquim 03/10/2026). As classes `file:*` do Tailwind estilizam
// só a parte do botão embutido no input (o texto "nenhum arquivo
// escolhido" ao lado continua sendo renderizado pelo navegador).
const FILE_INPUT_CLASSES =
  "block w-full text-sm text-iw-muted " +
  "file:mr-3 file:px-4 file:py-2 file:rounded-[var(--radius-md)] " +
  "file:border file:border-black file:bg-[#CF8403] file:text-white file:font-semibold file:text-sm " +
  "file:cursor-pointer hover:file:opacity-90 file:transition-opacity";

export default function ImportarProvasForm() {
  const [materia, setMateria] = useState("");
  const [lessonId, setLessonId] = useState("");
  const [provas, setProvas] = useState<PreviewProva[] | null>(null);
  const [amostraTextoGabarito, setAmostraTextoGabarito] = useState<string>("");
  const [erro, setErro] = useState<string | null>(null);
  const [sucesso, setSucesso] = useState<string | null>(null);
  const [isPendingPreview, startPreview] = useTransition();
  const [isPendingConfirmar, startConfirmar] = useTransition();

  function handlePreview(formData: FormData) {
    setErro(null);
    setSucesso(null);
    setProvas(null);
    formData.set("materia", materia);

    startPreview(async () => {
      const resultado = await extrairPreviewAction(formData);
      if (!resultado.success) {
        setErro(resultado.message);
        return;
      }
      setProvas(resultado.provas);
      setAmostraTextoGabarito(resultado.amostraTextoGabarito);
    });
  }

  function atualizarResposta(provaIdx: number, questaoIdx: number, resposta: "C" | "E") {
    setProvas((atual) => {
      if (!atual) return atual;
      const copia = atual.map((p, i) =>
        i === provaIdx ? { ...p, questoes: p.questoes.map((q, j) => (j === questaoIdx ? { ...q, resposta } : q)) } : p
      );
      return copia;
    });
  }

  function atualizarCampo(provaIdx: number, campo: "titulo" | "slugSugerido", valor: string) {
    setProvas((atual) => {
      if (!atual) return atual;
      return atual.map((p, i) => (i === provaIdx ? { ...p, [campo]: valor } : p));
    });
  }

  function removerProva(provaIdx: number) {
    setProvas((atual) => (atual ? atual.filter((_, i) => i !== provaIdx) : atual));
  }

  const provasProntas = provas?.filter((p) => p.numeroTeste != null && p.questoes.length > 0) ?? [];
  const faltaResposta = provasProntas.some((p) => p.questoes.some((q) => q.resposta == null));

  function handleConfirmar() {
    if (!provas) return;
    setErro(null);
    setSucesso(null);

    if (provasProntas.length === 0) {
      setErro("Nenhuma prova pronta para confirmar (corrija os avisos abaixo primeiro).");
      return;
    }
    if (faltaResposta) {
      setErro("Tem questão sem resposta C/E marcada — preencha todas antes de confirmar.");
      return;
    }

    startConfirmar(async () => {
      const resultado = await confirmarImportacaoAction({
        materia,
        lessonId: lessonId.trim() || null,
        provas: provasProntas.map((p) => ({
          numeroTeste: p.numeroTeste as number,
          titulo: p.titulo,
          slug: p.slugSugerido,
          questoes: p.questoes.map((q) => ({ ordem: q.ordem, enunciado: q.enunciado, resposta: q.resposta as "C" | "E" })),
        })),
      });

      if (!resultado.success) {
        setErro(resultado.message);
        return;
      }
      setSucesso(`${resultado.criadas} prova(s) criada(s)/atualizada(s) com sucesso.`);
      setProvas(null);
    });
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <h2 className="text-sm font-bold text-iw-navy">1. Envie os PDFs</h2>
        </CardHeader>
        <CardBody>
          <form action={handlePreview} className="space-y-4">
            <div>
              <label className="text-xs font-semibold text-iw-navy block mb-1">Matéria</label>
              <input
                type="text"
                value={materia}
                onChange={(e) => setMateria(e.target.value)}
                placeholder='Ex.: "Liderança Cristã"'
                className="w-full rounded-[var(--radius-md)] border border-iw-border px-3 py-2 text-sm"
                required
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-iw-navy block mb-1">
                Lesson ID (opcional) — UUID da lição em <code>lessons</code>, se souber
              </label>
              <input
                type="text"
                value={lessonId}
                onChange={(e) => setLessonId(e.target.value)}
                placeholder="deixe em branco se não souber"
                className="w-full rounded-[var(--radius-md)] border border-iw-border px-3 py-2 text-sm font-mono"
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-iw-navy block mb-1">PDFs dos testes (pode selecionar vários de uma vez)</label>
              <input
                type="file"
                name="testes"
                accept="application/pdf"
                multiple
                required
                className={FILE_INPUT_CLASSES}
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-iw-navy block mb-1">
                PDF do gabarito (o que tem a seção &quot;TESTES PARCIAIS&quot;)
              </label>
              <input
                type="file"
                name="gabarito"
                accept="application/pdf"
                required
                className={FILE_INPUT_CLASSES}
              />
            </div>

            <Button type="submit" loading={isPendingPreview} leftIcon={<Upload className="w-4 h-4" />}>
              Pré-visualizar
            </Button>
          </form>
        </CardBody>
      </Card>

      {erro && (
        <Card variant="danger">
          <CardBody className="flex items-start gap-2 text-sm text-iw-error">
            <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
            <span>{erro}</span>
          </CardBody>
        </Card>
      )}

      {sucesso && (
        <Card className="border-iw-success/30 bg-iw-success-bg">
          <CardBody className="flex items-start gap-2 text-sm text-iw-success">
            <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
            <span>{sucesso}</span>
          </CardBody>
        </Card>
      )}

      {provas && provas.length > 0 && (
        <Card>
          <CardHeader>
            <h2 className="text-sm font-bold text-iw-navy">
              2. Confira cada questão — nada é publicado até você clicar em &quot;Confirmar&quot;
            </h2>
          </CardHeader>
          <CardBody className="space-y-6">
            {amostraTextoGabarito && (
              <details className="bg-iw-bg border border-iw-border rounded-[var(--radius-md)] p-3 text-xs">
                <summary className="cursor-pointer font-semibold text-iw-navy">
                  Ver texto bruto extraído do gabarito (diagnóstico)
                </summary>
                <pre className="whitespace-pre-wrap mt-2 text-[11px] text-iw-muted max-h-64 overflow-y-auto">
                  {amostraTextoGabarito}
                </pre>
              </details>
            )}

            {provas.map((prova, pIdx) => (
              <div key={pIdx} className="border border-iw-border rounded-[var(--radius-lg)] p-4 space-y-3">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[11px] font-mono text-iw-muted">{prova.arquivo}</span>
                  <button type="button" onClick={() => removerProva(pIdx)} className="text-[11px] text-iw-error hover:underline">
                    remover este teste da importação
                  </button>
                </div>

                {prova.avisos.length > 0 && (
                  <div className="bg-iw-warning-bg border border-iw-warning/30 rounded-[var(--radius-md)] p-3 text-xs text-iw-navy space-y-1">
                    {prova.avisos.map((a, i) => (
                      <p key={i} className="flex gap-1.5">
                        <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-0.5 text-iw-warning" />
                        {a}
                      </p>
                    ))}
                  </div>
                )}

                <div className="flex flex-wrap gap-3 items-end">
                  <div>
                    <label className="text-[11px] font-semibold text-iw-muted block">Título</label>
                    <input
                      value={prova.titulo}
                      onChange={(e) => atualizarCampo(pIdx, "titulo", e.target.value)}
                      className="rounded-[var(--radius-md)] border border-iw-border px-2 py-1 text-sm"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] font-semibold text-iw-muted block">Slug (URL pública)</label>
                    <input
                      value={prova.slugSugerido}
                      onChange={(e) => atualizarCampo(pIdx, "slugSugerido", e.target.value)}
                      className="rounded-[var(--radius-md)] border border-iw-border px-2 py-1 text-sm font-mono"
                    />
                  </div>
                  <span className="text-xs text-iw-muted">/prova-publica/{prova.slugSugerido || "???"}</span>
                </div>

                {prova.amostraTexto && (
                  <details className="bg-iw-bg border border-iw-border rounded-[var(--radius-md)] p-3 text-xs">
                    <summary className="cursor-pointer font-semibold text-iw-navy">
                      Ver texto bruto extraído deste PDF (diagnóstico)
                    </summary>
                    <pre className="whitespace-pre-wrap mt-2 text-[11px] text-iw-muted max-h-64 overflow-y-auto">
                      {prova.amostraTexto}
                    </pre>
                  </details>
                )}

                {prova.questoes.length > 0 && (
                  <ul className="divide-y divide-iw-border">
                    {prova.questoes.map((q, qIdx) => (
                      <li key={qIdx} className="py-2 flex items-start gap-3">
                        <span className="text-xs font-bold text-iw-muted w-6 shrink-0 pt-0.5">{q.ordem}.</span>
                        <p className="text-sm text-iw-navy flex-1">{q.enunciado}</p>
                        <div className="flex gap-1 shrink-0">
                          {(["C", "E"] as const).map((letra) => (
                            <button
                              type="button"
                              key={letra}
                              onClick={() => atualizarResposta(pIdx, qIdx, letra)}
                              className={
                                "w-8 h-8 rounded-full text-xs font-bold border transition-colors " +
                                (q.resposta === letra
                                  ? letra === "C"
                                    ? "bg-iw-success text-white border-iw-success"
                                    : "bg-iw-error text-white border-iw-error"
                                  : "bg-transparent text-iw-muted border-iw-border hover:border-iw-navy")
                              }
                            >
                              {letra}
                            </button>
                          ))}
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            ))}

            <Button onClick={handleConfirmar} loading={isPendingConfirmar} leftIcon={<CheckCircle2 className="w-4 h-4" />}>
              Confirmar e criar {provasProntas.length} prova(s)
            </Button>
          </CardBody>
        </Card>
      )}
    </div>
  );
}
