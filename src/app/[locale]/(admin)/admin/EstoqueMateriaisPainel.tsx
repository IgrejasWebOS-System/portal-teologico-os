"use client";

// ============================================================
// Estoque de material didático (29/09/2026, pedido do Joaquim — igual à
// planilha de referência), redesenhado no mesmo dia (migration 122):
// material agora é cadastrado por AULA (lesson_id), não mais por curso
// inteiro, e não há mais desconto automático por matrícula — o estoque só
// muda por entrada manual aqui ou quando um pedido (ver
// PedidosMaterialAdminPainel) é marcado RECEBIDO.
// ============================================================

import { useMemo, useState } from "react";
import { Boxes, Plus, Trash2, PackagePlus } from "lucide-react";
import {
  criarMaterialDidaticoAction,
  darEntradaEstoqueAction,
  apagarMaterialDidaticoAction,
} from "./actions";

type MaterialRow = {
  id: string;
  nome: string;
  tipo: "LIVRO" | "PROVA";
  curso_id: string | null;
  curso_titulo: string | null;
  lesson_id: string | null;
  licao_titulo: string | null;
  estoque_atual: number;
  alunos: number;
  imprimir: number;
};

type LicaoLite = { id: string; title: string; course_id: string };

const inputCls = "bg-white border border-iw-border rounded-lg px-2.5 py-1.5 text-xs text-iw-navy";

function EntradaEstoqueForm({ materialId }: { materialId: string }) {
  const [qtd, setQtd] = useState("");
  return (
    <form
      action={async (formData: FormData) => {
        await darEntradaEstoqueAction(formData);
      }}
      className="flex items-center gap-1.5"
      onSubmit={() => setQtd("")}
    >
      <input type="hidden" name="id" value={materialId} />
      <input
        type="number"
        name="quantidade"
        value={qtd}
        onChange={(e) => setQtd(e.target.value)}
        placeholder="+ qtd"
        className={`${inputCls} w-16`}
      />
      <button type="submit" title="Dar entrada" className="text-iw-success hover:opacity-70">
        <PackagePlus className="w-4 h-4" />
      </button>
    </form>
  );
}

export default function EstoqueMateriaisPainel({
  materiais,
  cursos,
  licoes,
}: {
  materiais: MaterialRow[];
  cursos: { id: string; title: string }[];
  licoes: LicaoLite[];
}) {
  const [mostrarForm, setMostrarForm] = useState(false);
  const [cursoSelecionado, setCursoSelecionado] = useState("");

  const licoesDoCurso = useMemo(
    () => licoes.filter((l) => l.course_id === cursoSelecionado),
    [licoes, cursoSelecionado]
  );

  return (
    <div className="bg-iw-surface border border-iw-border rounded-2xl p-6 space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <Boxes className="w-4 h-4 text-iw-gold" />
          <h2 className="font-bold text-iw-navy text-sm">Estoque de material didático</h2>
        </div>
        <button
          type="button"
          onClick={() => setMostrarForm((v) => !v)}
          className="flex items-center gap-1.5 text-xs font-bold text-iw-blue hover:text-iw-navy"
        >
          <Plus className="w-3.5 h-3.5" /> Novo material
        </button>
      </div>

      {mostrarForm && (
        <form
          action={async (formData: FormData) => {
            await criarMaterialDidaticoAction(formData);
          }}
          className="grid grid-cols-2 md:grid-cols-4 gap-2 bg-iw-bg rounded-xl p-3"
        >
          <input name="nome" placeholder="Nome (ex.: Escatologia)" required className={`${inputCls} col-span-2 md:col-span-1`} />
          <select name="tipo" required defaultValue="" className={inputCls}>
            <option value="" disabled>Tipo...</option>
            <option value="LIVRO">Livro</option>
            <option value="PROVA">Prova</option>
          </select>
          <select
            name="curso_id"
            value={cursoSelecionado}
            onChange={(e) => setCursoSelecionado(e.target.value)}
            className={inputCls}
          >
            <option value="">Curso...</option>
            {cursos.map((c) => (<option key={c.id} value={c.id}>{c.title}</option>))}
          </select>
          <select name="lesson_id" defaultValue="" className={inputCls} disabled={!cursoSelecionado}>
            <option value="">Aula (opcional)</option>
            {licoesDoCurso.map((l) => (<option key={l.id} value={l.id}>{l.title}</option>))}
          </select>
          <div className="flex items-center gap-2">
            <input type="number" name="estoque_atual" placeholder="Estoque inicial" defaultValue="0" className={`${inputCls} flex-1`} />
            <button type="submit" className="bg-iw-navy text-white text-xs font-bold px-3 py-1.5 rounded-lg shrink-0">
              Salvar
            </button>
          </div>
        </form>
      )}

      {materiais.length === 0 ? (
        <p className="text-xs text-iw-muted">Nenhum material cadastrado ainda.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="text-left border-b border-iw-border">
                <th className="py-2 pr-2 font-extrabold text-iw-muted uppercase">Material</th>
                <th className="py-2 pr-2 font-extrabold text-iw-muted uppercase">Tipo</th>
                <th className="py-2 pr-2 font-extrabold text-iw-muted uppercase">Curso / Aula</th>
                <th className="py-2 pr-2 font-extrabold text-iw-muted uppercase text-right">Atual</th>
                <th className="py-2 pr-2 font-extrabold text-iw-muted uppercase text-right">Alunos</th>
                <th className="py-2 pr-2 font-extrabold text-iw-muted uppercase text-right">Imprimir</th>
                <th className="py-2 pr-2"></th>
                <th className="py-2"></th>
              </tr>
            </thead>
            <tbody>
              {materiais.map((m) => (
                <tr key={m.id} className="border-b border-iw-border/60 last:border-b-0">
                  <td className="py-2 pr-2 font-semibold text-iw-navy">{m.nome}</td>
                  <td className="py-2 pr-2 text-iw-muted">{m.tipo === "LIVRO" ? "Livro" : "Prova"}</td>
                  <td className="py-2 pr-2 text-iw-muted truncate max-w-[200px]">
                    {m.curso_titulo ?? "—"}
                    {m.licao_titulo && <span className="text-iw-navy/70"> — {m.licao_titulo}</span>}
                  </td>
                  <td className={`py-2 pr-2 text-right font-bold ${m.estoque_atual < 0 ? "text-iw-error" : "text-iw-navy"}`}>
                    {m.estoque_atual}
                  </td>
                  <td className="py-2 pr-2 text-right text-iw-muted">{m.alunos}</td>
                  <td className={`py-2 pr-2 text-right font-bold ${m.imprimir > 0 ? "text-iw-error" : "text-iw-success"}`}>
                    {m.imprimir}
                  </td>
                  <td className="py-2 pr-2"><EntradaEstoqueForm materialId={m.id} /></td>
                  <td className="py-2">
                    <button
                      type="button"
                      onClick={() => {
                        if (confirm(`Apagar "${m.nome}"?`)) apagarMaterialDidaticoAction(m.id);
                      }}
                      className="text-iw-muted hover:text-iw-error"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
