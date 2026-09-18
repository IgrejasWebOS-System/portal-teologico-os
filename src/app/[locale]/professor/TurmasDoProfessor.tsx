"use client";

import { useMemo, useState } from "react";
import { Plus, Link2, Copy, Check, Power, PowerOff, GraduationCap } from "lucide-react";
import { professorCriarTurmaAction, professorAlternarLinkTurmaAction } from "./actions";

type Curso = { id: string; title: string };
type UnitLite = { id: string; type: string; name: string; parent_id: string | null };
export type TurmaVinculo = {
  id: string;
  turno: string;
  dia_semana: string;
  link_token: string;
  link_ativo: boolean;
  course_edition: { nome: string; classe: string | null; courses: { title: string } | null; units: { name: string } | null } | null;
};

interface Props {
  cursos: Curso[];
  units: UnitLite[];
  turmas: TurmaVinculo[];
  appUrl: string;
}

const selectCls = "bg-white border border-iw-border rounded-xl px-3.5 py-2.5 text-sm cursor-pointer";
const inputCls = "bg-white border border-iw-border rounded-xl px-3.5 py-2.5 text-sm";

const TURNOS = [
  { value: "MANHA", label: "Manhã" },
  { value: "TARDE", label: "Tarde" },
  { value: "NOITE", label: "Noite" },
];
const DIAS = [
  { value: "DOMINGO", label: "Domingo" },
  { value: "SEGUNDA", label: "Segunda" },
  { value: "TERCA", label: "Terça" },
  { value: "QUARTA", label: "Quarta" },
  { value: "QUINTA", label: "Quinta" },
  { value: "SEXTA", label: "Sexta" },
  { value: "SABADO", label: "Sábado" },
];

function CopiarLinkButton({ url }: { url: string }) {
  const [copiado, setCopiado] = useState(false);
  return (
    <button
      type="button"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(url);
          setCopiado(true);
          setTimeout(() => setCopiado(false), 2000);
        } catch {
          // clipboard indisponível (http sem TLS, permissão negada) —
          // o link ainda fica visível pra copiar manualmente.
        }
      }}
      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-iw-blue text-white hover:bg-iw-navy transition-colors shrink-0"
    >
      {copiado ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
      {copiado ? "Copiado!" : "Copiar link"}
    </button>
  );
}

export default function TurmasDoProfessor({ cursos, units, turmas, appUrl }: Props) {
  const [setorSel, setSetorSel] = useState("");
  const [igrejaSel, setIgrejaSel] = useState("");

  const setores = useMemo(
    () => units.filter((u) => u.type === "SETOR").sort((a, b) => a.name.localeCompare(b.name, "pt-BR")),
    [units]
  );
  const igrejas = useMemo(
    () =>
      [
        ...(setorSel ? units.filter((u) => u.type === "IGREJA" && u.parent_id === setorSel) : []),
        ...units.filter((u) => u.type === "SEDE"),
      ].sort((a, b) => a.name.localeCompare(b.name, "pt-BR")),
    [units, setorSel]
  );

  return (
    <div className="bg-iw-surface border border-iw-border rounded-2xl shadow-sm p-5 space-y-5">
      <div className="flex items-center gap-2">
        <GraduationCap className="w-4 h-4 text-iw-gold" />
        <h2 className="text-sm font-bold text-iw-navy">Minhas Turmas</h2>
      </div>

      {turmas.length === 0 ? (
        <p className="text-xs text-iw-muted">Você ainda não criou nenhuma turma.</p>
      ) : (
        <div className="space-y-2">
          {turmas.map((t) => {
            const link = `${appUrl}/matricula-turma/${t.link_token}`;
            return (
              <div key={t.id} className="bg-iw-bg border border-iw-border rounded-xl p-3 space-y-2">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-sm font-bold text-iw-navy truncate">
                      {t.course_edition?.courses?.title ?? "Curso"} — {t.course_edition?.nome ?? ""}
                      {t.course_edition?.classe ? ` (Classe ${t.course_edition.classe})` : ""}
                    </p>
                    <p className="text-xs text-iw-muted truncate">
                      {t.course_edition?.units?.name ?? "—"} · {TURNOS.find((x) => x.value === t.turno)?.label ?? t.turno} ·{" "}
                      {DIAS.find((x) => x.value === t.dia_semana)?.label ?? t.dia_semana}
                    </p>
                  </div>
                  <form action={professorAlternarLinkTurmaAction}>
                    <input type="hidden" name="id" value={t.id} />
                    <input type="hidden" name="ativar" value={(!t.link_ativo).toString()} />
                    <button
                      type="submit"
                      title={t.link_ativo ? "Desativar link" : "Reativar link"}
                      className={`flex items-center gap-1 text-[10px] font-bold px-2 py-1 rounded-full shrink-0 ${
                        t.link_ativo ? "bg-iw-success/10 text-iw-success" : "bg-iw-muted/10 text-iw-muted"
                      }`}
                    >
                      {t.link_ativo ? <Power className="w-3 h-3" /> : <PowerOff className="w-3 h-3" />}
                      {t.link_ativo ? "Ativo" : "Desativado"}
                    </button>
                  </form>
                </div>

                <div className="flex items-center gap-2">
                  <div className="flex items-center gap-1.5 flex-1 min-w-0 bg-white border border-iw-border rounded-lg px-2.5 py-1.5">
                    <Link2 className="w-3.5 h-3.5 text-iw-muted shrink-0" />
                    <span className="text-xs text-iw-navy truncate font-mono">{link}</span>
                  </div>
                  <CopiarLinkButton url={link} />
                </div>
              </div>
            );
          })}
        </div>
      )}

      <details className="border-t border-iw-border pt-4">
        <summary className="cursor-pointer list-none flex items-center gap-2 text-sm font-bold text-iw-navy">
          <Plus className="w-4 h-4 text-iw-gold" /> Criar Turma
        </summary>
        <form action={professorCriarTurmaAction} className="grid grid-cols-1 sm:grid-cols-6 gap-3 mt-4">
          <select name="course_id" required defaultValue="" className={`${selectCls} sm:col-span-3`}>
            <option value="" disabled>Curso</option>
            {cursos.map((c) => (<option key={c.id} value={c.id}>{c.title}</option>))}
          </select>

          <select
            value={setorSel}
            onChange={(e) => { setSetorSel(e.target.value); setIgrejaSel(""); }}
            className={`${selectCls} sm:col-span-3`}
          >
            <option value="">Setor / Regional...</option>
            {setores.map((s) => (<option key={s.id} value={s.id}>{s.name}</option>))}
          </select>

          <select
            name="unit_id"
            value={igrejaSel}
            onChange={(e) => setIgrejaSel(e.target.value)}
            disabled={igrejas.length === 0}
            required
            className={`${selectCls} sm:col-span-3`}
          >
            <option value="">{igrejas.length > 0 ? "Igreja..." : "Escolha o setor primeiro"}</option>
            {igrejas.map((i) => (<option key={i.id} value={i.id}>{i.name}</option>))}
          </select>

          <input
            name="nome"
            required
            placeholder='Nome da turma (ex: "2026 Turma 1")'
            className={`${inputCls} sm:col-span-3`}
          />

          <select name="turno" required defaultValue="" className={`${selectCls} sm:col-span-2`}>
            <option value="" disabled>Turno</option>
            {TURNOS.map((t) => (<option key={t.value} value={t.value}>{t.label}</option>))}
          </select>

          <select name="dia_semana" required defaultValue="" className={`${selectCls} sm:col-span-2`}>
            <option value="" disabled>Dia da semana</option>
            {DIAS.map((d) => (<option key={d.value} value={d.value}>{d.label}</option>))}
          </select>

          <input name="classe" placeholder="Classe (opcional)" maxLength={1} className={`${inputCls} sm:col-span-2 uppercase`} />
          <input name="data_inicio" type="date" className={`${inputCls} sm:col-span-3`} />
          <input name="data_fim" type="date" className={`${inputCls} sm:col-span-3`} />

          <button
            type="submit"
            className="sm:col-span-6 bg-iw-gold hover:opacity-90 text-white font-bold text-sm px-5 py-2.5 rounded-xl transition-opacity"
          >
            Criar turma e gerar link
          </button>
        </form>
      </details>
    </div>
  );
}
