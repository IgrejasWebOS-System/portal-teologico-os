"use client";

import { useState, useRef, useEffect, useTransition } from "react";
import type { ElementType } from "react";
import {
  History,
  Search,
  X,
  FileText,
  Clock,
  User,
  ChevronDown,
  Loader2,
  Plus,
  AlertCircle,
  CheckCircle2,
  Printer,
  MapPin,
} from "lucide-react";
import {
  getMemberByMatriculaAction,
  addTimelineEntryAction,
  fetchTimelineAction,
} from "./actions";

// ── Types ─────────────────────────────────────────────────────

type MemberProfile = {
  id: string;
  full_name: string;
  registration_number: string | null;
  photo_url: string | null;
  ecclesiastical_status: string | null;
  financial_status: string;
  status: string;
  baptism_date: string | null;
  birth_date: string | null;
  gender: string | null;
  civil_status: string | null;
  profession: string | null;
  email: string | null;
  phone: string | null;
  nationality_city: string | null;
  nationality_state: string | null;
  schooling: string | null;
  origin_church: string | null;
  cpf: string | null;
  rg: string | null;
  rg_issuer: string | null;
  rg_state: string | null;
  spouse_name: string | null;
  father_name: string | null;
  mother_name: string | null;
  marriage_date: string | null;
  zip_code: string | null;
  address: string | null;
  number: string | null;
  neighborhood: string | null;
  city: string | null;
  state: string | null;
  church_name: string;
  role_name: string;
};

type TimelineEntry = {
  id: string;
  member_id: string;
  event_type: string;
  description: string;
  created_by_name: string | null;
  created_at: string;
};

type Step = "idle" | "searching" | "viewing";
type Tab = "ficha" | "historico";

// ── Helpers ───────────────────────────────────────────────────

function fmtDate(iso: string | null | undefined): string {
  if (!iso) return "—";
  const p = iso.split("T")[0].split("-");
  return p.length >= 3 ? `${p[2]}/${p[1]}/${p[0]}` : iso;
}

function fmtDateTime(iso: string): string {
  return new Date(iso).toLocaleString("pt-BR", {
    day: "2-digit", month: "2-digit", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  });
}

function baptismTime(iso: string | null): string {
  if (!iso) return "—";
  const b = new Date(iso);
  const n = new Date();
  let y = n.getFullYear() - b.getFullYear();
  let m = n.getMonth() - b.getMonth();
  if (m < 0 || (m === 0 && n.getDate() < b.getDate())) { y--; m += 12; }
  return `${y} a e ${m} m`;
}

const EV_COLORS: Record<string, string> = {
  "CRIAÇÃO":      "bg-emerald-50 text-emerald-700 border-emerald-200",
  "ATUALIZAÇÃO":  "bg-blue-50 text-blue-700 border-blue-200",
  "ARQUIVAMENTO": "bg-red-50 text-red-700 border-red-200",
  "RESTAURAÇÃO":  "bg-teal-50 text-teal-700 border-teal-200",
  "OCORRÊNCIA":   "bg-amber-50 text-amber-700 border-amber-200",
  "DISCIPLINA":   "bg-red-50 text-red-800 border-red-300",
  "TRANSFERÊNCIA":"bg-purple-50 text-purple-700 border-purple-200",
  "FALECIMENTO":  "bg-gray-100 text-gray-600 border-gray-300",
  "BATISMO":      "bg-sky-50 text-sky-700 border-sky-200",
  "CASAMENTO":    "bg-pink-50 text-pink-700 border-pink-200",
  "OBSERVAÇÃO":   "bg-gray-50 text-gray-500 border-gray-200",
};

function evColor(type: string) {
  return EV_COLORS[type] ?? "bg-gray-50 text-gray-600 border-gray-200";
}

// ── PDF builders ──────────────────────────────────────────────

const BASE_CSS = `
*{margin:0;padding:0;box-sizing:border-box}
body{font-family:Arial,sans-serif;font-size:10px;color:#111;padding:24px}
.hdr{display:flex;justify-content:space-between;align-items:flex-start;border-bottom:2px solid #1B2E4B;padding-bottom:12px;margin-bottom:16px}
.hdr h1{font-size:16px;font-weight:bold;color:#1B2E4B}
.hdr p{font-size:9px;color:#666;margin-top:3px}
.hdr-r{font-size:9px;color:#999;text-align:right;line-height:1.7}
.mb{display:flex;gap:14px;align-items:flex-start;background:#f7f8fb;border:1px solid #dde3ef;border-radius:8px;padding:12px 14px;margin-bottom:14px}
.ph{width:70px;height:70px;border-radius:50%;object-fit:cover;border:2px solid #1B2E4B;flex-shrink:0}
.pp{width:70px;height:70px;border-radius:50%;background:#dde3f0;border:2px solid #1B2E4B;display:flex;align-items:center;justify-content:center;font-size:20px;font-weight:bold;color:#1B2E4B;flex-shrink:0}
.mn{font-size:14px;font-weight:bold;color:#1B2E4B}
.ms{font-size:9px;color:#666;margin-top:2px}
.bdg{display:flex;gap:6px;margin-top:7px;flex-wrap:wrap}
.b{display:inline-block;padding:2px 8px;border-radius:12px;font-size:8px;font-weight:bold;border:1px solid}
.ba{background:#dcfce7;color:#166534;border-color:#86efac}
.bi{background:#fee2e2;color:#991b1b;border-color:#fca5a5}
.mg{display:grid;grid-template-columns:repeat(5,1fr);gap:8px;margin-bottom:12px}
.mi{background:#f7f8fb;border:1px solid #dde3ef;border-radius:6px;padding:7px 9px}
.ml{font-size:7.5px;text-transform:uppercase;color:#888;font-weight:bold;letter-spacing:.4px;margin-bottom:3px}
.mv{font-size:11px;font-weight:600;color:#1B2E4B;word-break:break-word}
.st{font-size:8px;text-transform:uppercase;font-weight:bold;color:#8899bb;letter-spacing:.6px;border-bottom:1px solid #dde3ef;padding-bottom:3px;margin:12px 0 8px}
.g5{display:grid;grid-template-columns:repeat(5,1fr);gap:8px}
.g4{display:grid;grid-template-columns:repeat(4,1fr);gap:8px}
.g3{display:grid;grid-template-columns:repeat(3,1fr);gap:8px}
.fl{font-size:7.5px;text-transform:uppercase;color:#aab;font-weight:bold;letter-spacing:.4px;margin-bottom:2px}
.fv{font-size:9.5px;color:#222;border-bottom:1px solid #e0e4ee;padding-bottom:3px;min-height:15px}
.ft{margin-top:20px;border-top:1px solid #ddd;padding-top:8px;display:flex;justify-content:space-between;font-size:8px;color:#bbb}
table{width:100%;border-collapse:collapse}
thead th{background:#1B2E4B;color:#fff;padding:7px 10px;font-size:8.5px;text-transform:uppercase;letter-spacing:.4px;font-weight:bold;text-align:left}
tbody tr:nth-child(even){background:#f7f8fb}
tbody td{padding:7px 10px;border-bottom:1px solid #eee;font-size:9.5px;vertical-align:top}
.evb{display:inline-block;padding:2px 7px;border-radius:10px;font-size:8px;font-weight:bold;background:#dbeafe;color:#1e3a5f}
.pb{page-break-after:always;margin:28px 0;border-top:2px dashed #ddd}
@media print{body{padding:16px}}
`;

function f(label: string, val: string | null | undefined) {
  return `<div><div class="fl">${label}</div><div class="fv">${val || "—"}</div></div>`;
}

function photoTag(p: MemberProfile) {
  return p.photo_url
    ? `<img class="ph" src="${p.photo_url}" alt="${p.full_name}" />`
    : `<div class="pp">${p.full_name.charAt(0)}</div>`;
}

function memberBlock(p: MemberProfile) {
  const st = p.ecclesiastical_status === "ACTIVE" ? "ATIVO" : (p.ecclesiastical_status || "—");
  const fin = p.financial_status === "UP_TO_DATE" ? "EM DIA" : "PENDENTE";
  const stCls = p.ecclesiastical_status === "ACTIVE" ? "ba" : "bi";
  const finCls = p.financial_status === "UP_TO_DATE" ? "ba" : "bi";
  return `<div class="mb">${photoTag(p)}<div>
    <div class="mn">${p.full_name}</div>
    <div class="ms">${p.church_name} · ${p.role_name} · Matrícula #${p.registration_number || "—"}</div>
    <div class="bdg">
      <span class="b ${stCls}">STATUS: ${st}</span>
      <span class="b ${finCls}">FINANCEIRO: ${fin}</span>
    </div>
  </div></div>`;
}

function docHeader(title: string, sub: string, church: string) {
  const now = new Date().toLocaleDateString("pt-BR", { day: "2-digit", month: "long", year: "numeric" });
  return `<div class="hdr"><div><h1>${title}</h1><p>${sub}</p></div>
  <div class="hdr-r"><div>${church}</div><div>Gerado em: ${now}</div></div></div>`;
}

function fichaBody(p: MemberProfile) {
  const nat = [p.nationality_city, p.nationality_state].filter(Boolean).join(" / ");
  const cidade = [p.city, p.state].filter(Boolean).join(" / ");
  return `
  ${docHeader("Ficha Cadastral de Membro", "Documento Oficial de Cadastro Eclesiástico", p.church_name)}
  ${memberBlock(p)}
  <div class="mg">
    <div class="mi"><div class="ml">Igreja Atual</div><div class="mv" style="font-size:9px">${p.church_name}</div></div>
    <div class="mi"><div class="ml">Cargo</div><div class="mv" style="font-size:9px">${p.role_name}</div></div>
    <div class="mi"><div class="ml">Matrícula</div><div class="mv">${p.registration_number || "—"}</div></div>
    <div class="mi"><div class="ml">Batismo</div><div class="mv" style="font-size:9px">${fmtDate(p.baptism_date)}</div></div>
    <div class="mi"><div class="ml">Tempo</div><div class="mv" style="font-size:9px">${baptismTime(p.baptism_date)}</div></div>
  </div>
  <div class="st">Dados Pessoais</div>
  <div class="g5">${f("Nome Completo",p.full_name)}${f("Data Nasc.",fmtDate(p.birth_date))}${f("Sexo",p.gender)}${f("Estado Civil",p.civil_status)}${f("Profissão",p.profession)}</div>
  <div class="g4" style="margin-top:8px">${f("E-mail",p.email)}${f("Telefone",p.phone)}${f("Naturalidade",nat)}${f("Escolaridade",p.schooling)}</div>
  <div class="st">Identificação</div>
  <div class="g5">${f("CPF",p.cpf)}${f("RG",p.rg)}${f("Órgão",p.rg_issuer)}${f("UF RG",p.rg_state)}${f("Igreja de Origem",p.origin_church)}</div>
  <div class="st">Família</div>
  <div class="g4">${f("Nome da Mãe",p.mother_name)}${f("Nome do Pai",p.father_name)}${f("Cônjuge",p.spouse_name)}${f("Casamento",fmtDate(p.marriage_date))}</div>
  <div class="st">Endereço Residencial</div>
  <div class="g5">${f("CEP",p.zip_code)}${f("Endereço",p.address)}${f("Número",p.number)}${f("Bairro",p.neighborhood)}${f("Cidade / UF",cidade)}</div>
  <div class="ft"><span>Portal Teológico OS · IgrejasWeb</span><span>Matrícula ${p.registration_number || "—"} · ${new Date().toLocaleDateString("pt-BR")}</span></div>`;
}

function historicoBody(p: MemberProfile, tl: TimelineEntry[]) {
  const rows = tl.length
    ? tl.map(e => `<tr>
        <td style="white-space:nowrap">${fmtDateTime(e.created_at)}</td>
        <td><span class="evb">${e.event_type}</span></td>
        <td>${e.description}</td>
        <td>${e.created_by_name || "Sistema"}</td>
      </tr>`).join("")
    : `<tr><td colspan="4" style="text-align:center;color:#aaa;padding:20px">Nenhum registro encontrado.</td></tr>`;
  return `
  ${docHeader("Histórico Eclesiástico — Dossiê", "Registro de Ocorrências e Eventos do Membro", p.church_name)}
  ${memberBlock(p)}
  <table><thead><tr><th>Data / Hora</th><th>Tipo</th><th>Descrição</th><th>Responsável</th></tr></thead>
  <tbody>${rows}</tbody></table>
  <div class="ft"><span>Portal Teológico OS · IgrejasWeb</span><span>Total: ${tl.length} registro(s) · ${new Date().toLocaleDateString("pt-BR")}</span></div>`;
}

function wrap(title: string, body: string) {
  return `<!DOCTYPE html><html lang="pt-BR"><head><meta charset="UTF-8"><title>${title}</title>
  <style>${BASE_CSS}</style></head><body>${body}</body></html>`;
}

function openPrint(html: string) {
  const win = window.open("", "_blank", "width=920,height=720");
  if (!win) { alert("Pop-up bloqueado. Permita pop-ups para este site e tente novamente."); return; }
  win.document.write(html);
  win.document.close();
  setTimeout(() => { win.focus(); win.print(); }, 700);
}

// ── Subcomponents ─────────────────────────────────────────────

function FieldRO({ label, value }: { label: string; value: string | null | undefined }) {
  return (
    <div>
      <p className="text-[9px] font-bold uppercase tracking-wider text-iw-muted mb-1">{label}</p>
      <div className="bg-iw-bg border border-iw-border rounded-lg px-2.5 py-1.5 text-xs text-iw-navy min-h-[28px]">
        {value || "—"}
      </div>
    </div>
  );
}

function MetaCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-iw-bg border border-iw-border rounded-xl px-3 py-2.5 text-center">
      <p className="text-[9px] font-bold uppercase tracking-wider text-iw-muted mb-1">{label}</p>
      <p className="text-xs font-semibold text-iw-navy">{value}</p>
    </div>
  );
}

// ── Main component ────────────────────────────────────────────

export default function HistoricoRelatorio() {
  const [step, setStep]                 = useState<Step>("idle");
  const [matricula, setMatricula]       = useState("");
  const [loading, setLoading]           = useState(false);
  const [searchErr, setSearchErr]       = useState("");
  const [profile, setProfile]           = useState<MemberProfile | null>(null);
  const [timeline, setTimeline]         = useState<TimelineEntry[]>([]);
  const [tab, setTab]                   = useState<Tab>("ficha");
  const [showPdf, setShowPdf]           = useState(false);
  const [showAddForm, setShowAddForm]   = useState(false);
  const [evType, setEvType]             = useState("OCORRÊNCIA");
  const [evDesc, setEvDesc]             = useState("");
  const [addErr, setAddErr]             = useState("");
  const [addOk, setAddOk]              = useState(false);
  const [isPending, startTransition]    = useTransition();
  const pdfRef                          = useRef<HTMLDivElement>(null);
  const inputRef                        = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (step === "searching") setTimeout(() => inputRef.current?.focus(), 100);
  }, [step]);

  // Close PDF dropdown on outside click
  useEffect(() => {
    if (!showPdf) return;
    const h = (e: MouseEvent) => { setShowPdf(false); };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, [showPdf]);

  function close() {
    setStep("idle");
    setMatricula("");
    setSearchErr("");
    setProfile(null);
    setTimeline([]);
    setTab("ficha");
    setShowAddForm(false);
    setEvType("OCORRÊNCIA");
    setEvDesc("");
    setAddErr("");
    setAddOk(false);
  }

  async function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    if (!matricula.trim()) return;
    setLoading(true);
    setSearchErr("");
    const result = await getMemberByMatriculaAction(matricula.trim());
    setLoading(false);
    if (!result.success || !result.data) {
      setSearchErr(result.message ?? "Matrícula não encontrada.");
      return;
    }
    setProfile(result.data.profile as MemberProfile);
    setTimeline(result.data.timeline as TimelineEntry[]);
    setStep("viewing");
  }

  async function handleAddEntry(e: React.FormEvent) {
    e.preventDefault();
    if (!profile || !evDesc.trim()) return;
    setAddErr("");
    setAddOk(false);
    const fd = new FormData();
    fd.set("member_id", profile.id);
    fd.set("event_type", evType);
    fd.set("description", evDesc.trim());
    startTransition(async () => {
      const r = await addTimelineEntryAction(fd);
      if (!r.success) {
        setAddErr(r.message ?? "Erro ao salvar.");
        return;
      }
      // Refresh timeline
      const tl = await fetchTimelineAction(profile.id);
      if (tl.success) setTimeline(tl.data as TimelineEntry[]);
      setEvDesc("");
      setEvType("OCORRÊNCIA");
      setShowAddForm(false);
      setAddOk(true);
      setTimeout(() => setAddOk(false), 3000);
    });
  }

  const p = profile;

  return (
    <>
      {/* ── Trigger button ── */}
      <button
        onClick={() => setStep("searching")}
        className="flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl text-xs font-semibold border border-iw-blue/30 bg-iw-blue/8 text-iw-blue hover:bg-iw-blue/15 transition-all"
      >
        <History className="w-3.5 h-3.5" />
        Histórico
      </button>

      {/* ── Search modal ── */}
      {step === "searching" && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={close} />
          <div className="relative z-10 w-full max-w-sm mx-4 bg-iw-surface rounded-2xl border border-iw-border shadow-2xl p-6 animate-in fade-in zoom-in-95 duration-150">
            {/* Header */}
            <div className="flex items-center gap-2.5 mb-5">
              <div className="w-8 h-8 rounded-xl bg-iw-blue/10 flex items-center justify-center">
                <Search className="w-4 h-4 text-iw-blue" />
              </div>
              <div>
                <h2 className="text-sm font-bold text-iw-navy">Buscar Histórico</h2>
                <p className="text-xs text-iw-muted">Pesquise pelo número de matrícula</p>
              </div>
              <button onClick={close} className="ml-auto text-iw-muted hover:text-iw-navy transition-colors">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSearch} className="space-y-4">
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-iw-muted mb-1.5">
                  Matrícula do Membro
                </label>
                <input
                  ref={inputRef}
                  type="text"
                  placeholder="Ex: 1020"
                  value={matricula}
                  onChange={e => { setMatricula(e.target.value); setSearchErr(""); }}
                  className="w-full bg-white border border-iw-border rounded-xl px-3 py-2.5 text-sm text-iw-navy font-mono text-center placeholder-iw-muted focus:border-iw-blue focus:outline-none transition-colors"
                />
                {searchErr && (
                  <p className="flex items-center gap-1.5 mt-1.5 text-xs text-iw-error font-medium">
                    <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                    {searchErr}
                  </p>
                )}
              </div>

              <div className="flex gap-2 pt-1">
                <button
                  type="button"
                  onClick={close}
                  className="flex-1 py-2.5 text-sm font-semibold text-iw-muted border border-iw-border rounded-xl hover:border-iw-navy/30 hover:text-iw-navy transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={loading || !matricula.trim()}
                  className="flex-1 flex items-center justify-center gap-2 py-2.5 text-sm font-semibold bg-iw-blue text-white rounded-xl hover:bg-iw-navy disabled:opacity-50 transition-colors"
                >
                  {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
                  Buscar Dossiê
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Relatório modal ── */}
      {step === "viewing" && p && (
        <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto py-6">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={close} />

          <div className="relative z-10 w-full max-w-5xl mx-4 bg-iw-surface rounded-2xl border border-iw-border shadow-2xl animate-in fade-in zoom-in-95 duration-200 flex flex-col">

            {/* ── Modal header ── */}
            <div className="flex items-center gap-3 px-5 py-3.5 border-b border-iw-border shrink-0">
              <FileText className="w-4 h-4 text-iw-blue shrink-0" />
              <span className="text-sm font-bold text-iw-navy">Relatório Eclesiástico</span>
              <span className="text-xs text-iw-muted hidden sm:inline">— Documento Oficial de Consulta</span>

              {/* Tabs */}
              <div className="flex items-center gap-1 ml-4 bg-iw-bg rounded-xl p-1">
                <button
                  onClick={() => setTab("ficha")}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                    tab === "ficha"
                      ? "bg-iw-surface text-iw-blue shadow-sm border border-iw-border"
                      : "text-iw-muted hover:text-iw-navy"
                  }`}
                >
                  <User className="w-3.5 h-3.5" />
                  Ficha Cadastral
                </button>
                <button
                  onClick={() => setTab("historico")}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                    tab === "historico"
                      ? "bg-iw-surface text-iw-blue shadow-sm border border-iw-border"
                      : "text-iw-muted hover:text-iw-navy"
                  }`}
                >
                  <Clock className="w-3.5 h-3.5" />
                  Histórico
                  <span className="ml-1 px-1.5 py-0.5 bg-iw-blue/10 text-iw-blue rounded-full text-[9px] font-bold">
                    {timeline.length}
                  </span>
                </button>
              </div>

              {/* PDF dropdown */}
              <div className="ml-auto relative" ref={pdfRef}>
                <button
                  onClick={() => setShowPdf(v => !v)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-iw-blue text-white hover:bg-iw-navy transition-colors"
                >
                  <Printer className="w-3.5 h-3.5" />
                  Exportar PDF
                  <ChevronDown className={`w-3 h-3 transition-transform ${showPdf ? "rotate-180" : ""}`} />
                </button>

                {showPdf && (
                  <div className="absolute right-0 top-9 z-60 w-48 bg-iw-surface rounded-xl border border-iw-border shadow-lg py-1 animate-in fade-in zoom-in-95 duration-100">
                    <button
                      onClick={() => { openPrint(wrap(`Ficha — ${p.full_name}`, fichaBody(p))); setShowPdf(false); }}
                      className="w-full flex items-center gap-2.5 px-4 py-2.5 text-xs text-iw-navy hover:bg-iw-bg transition-colors"
                    >
                      <User className="w-3.5 h-3.5 text-iw-blue" />
                      Ficha do Membro
                    </button>
                    <button
                      onClick={() => { openPrint(wrap(`Histórico — ${p.full_name}`, historicoBody(p, timeline))); setShowPdf(false); }}
                      className="w-full flex items-center gap-2.5 px-4 py-2.5 text-xs text-iw-navy hover:bg-iw-bg transition-colors"
                    >
                      <Clock className="w-3.5 h-3.5 text-iw-blue" />
                      Histórico do Membro
                    </button>
                    <div className="border-t border-iw-border my-1" />
                    <button
                      onClick={() => {
                        const combined = `${fichaBody(p)}<div class="pb"></div>${historicoBody(p, timeline)}`;
                        openPrint(wrap(`Relatório Completo — ${p.full_name}`, combined));
                        setShowPdf(false);
                      }}
                      className="w-full flex items-center gap-2.5 px-4 py-2.5 text-xs text-iw-navy hover:bg-iw-bg transition-colors"
                    >
                      <FileText className="w-3.5 h-3.5 text-iw-blue" />
                      Histórico Completo
                    </button>
                  </div>
                )}
              </div>

              {/* Close */}
              <button
                onClick={close}
                className="ml-2 w-7 h-7 flex items-center justify-center rounded-lg text-iw-muted hover:text-iw-navy hover:bg-iw-bg transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* ── Modal body ── */}
            <div className="overflow-y-auto max-h-[80vh] p-5 space-y-5">

              {/* ═══ FICHA TAB ═══ */}
              {tab === "ficha" && (
                <div className="space-y-4">
                  {/* Member hero */}
                  <div className="flex gap-4 items-start bg-iw-bg rounded-2xl border border-iw-border p-4">
                    {/* Photo */}
                    <div className="shrink-0">
                      {p.photo_url ? (
                        <img
                          src={p.photo_url}
                          alt={p.full_name}
                          className="w-20 h-20 rounded-full object-cover border-2 border-iw-blue/30 shadow-sm"
                        />
                      ) : (
                        <div className="w-20 h-20 rounded-full bg-iw-blue/12 border-2 border-iw-blue/20 flex items-center justify-center">
                          <span className="text-iw-blue font-black text-2xl">
                            {p.full_name.charAt(0)}
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <h3 className="text-lg font-black text-iw-navy">{p.full_name}</h3>
                      <p className="text-xs text-iw-muted mt-0.5">Visualização de Cadastro</p>
                      <div className="flex flex-wrap gap-2 mt-2">
                        <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full ${
                          p.financial_status === "UP_TO_DATE"
                            ? "bg-iw-success/10 text-iw-success"
                            : "bg-iw-error/10 text-iw-error"
                        }`}>
                          ● Situação Financeira: {p.financial_status === "UP_TO_DATE" ? "Em Dia" : "Pendente"}
                        </span>
                        <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full ${
                          p.ecclesiastical_status === "ACTIVE"
                            ? "bg-iw-success/10 text-iw-success"
                            : "bg-amber-100 text-amber-700"
                        }`}>
                          ● Status Eclesiástico: {p.ecclesiastical_status === "ACTIVE" ? "ATIVO" : (p.ecclesiastical_status || "—")}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Meta row */}
                  <div className="grid grid-cols-5 gap-3">
                    <MetaCard label="Igreja Atual" value={p.church_name} />
                    <MetaCard label="Cargo" value={p.role_name} />
                    <MetaCard label="Matrícula" value={`#${p.registration_number || "—"}`} />
                    <MetaCard label="Batismo" value={fmtDate(p.baptism_date)} />
                    <MetaCard label="Tempo" value={baptismTime(p.baptism_date)} />
                  </div>

                  {/* Section: Dados Pessoais */}
                  <SectionDivider icon={User} label="Dados Pessoais" />
                  <div className="grid grid-cols-5 gap-3">
                    <div className="col-span-2"><FieldRO label="Nome Completo" value={p.full_name} /></div>
                    <FieldRO label="Data Nasc." value={fmtDate(p.birth_date)} />
                    <FieldRO label="Sexo" value={p.gender} />
                    <FieldRO label="Estado Civil" value={p.civil_status} />
                  </div>
                  <div className="grid grid-cols-4 gap-3">
                    <FieldRO label="E-mail" value={p.email} />
                    <FieldRO label="Telefone" value={p.phone} />
                    <FieldRO label="Naturalidade" value={[p.nationality_city, p.nationality_state].filter(Boolean).join(" / ")} />
                    <FieldRO label="Escolaridade" value={p.schooling} />
                  </div>
                  <div className="grid grid-cols-5 gap-3">
                    <FieldRO label="Profissão" value={p.profession} />
                    <FieldRO label="CPF" value={p.cpf} />
                    <FieldRO label="RG" value={p.rg} />
                    <FieldRO label="Órgão" value={p.rg_issuer} />
                    <FieldRO label="UF RG" value={p.rg_state} />
                  </div>
                  <div className="grid grid-cols-3 gap-3">
                    <FieldRO label="Igreja de Origem" value={p.origin_church} />
                    <FieldRO label="Nome da Mãe" value={p.mother_name} />
                    <FieldRO label="Nome do Pai" value={p.father_name} />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <FieldRO label="Cônjuge" value={p.spouse_name} />
                    <FieldRO label="Data Casamento" value={fmtDate(p.marriage_date)} />
                  </div>

                  {/* Section: Endereço */}
                  <SectionDivider icon={MapPin} label="Endereço Residencial" />
                  <div className="grid grid-cols-5 gap-3">
                    <FieldRO label="CEP" value={p.zip_code} />
                    <div className="col-span-2"><FieldRO label="Endereço Completo" value={p.address} /></div>
                    <FieldRO label="Número" value={p.number} />
                    <FieldRO label="Bairro" value={p.neighborhood} />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <FieldRO label="Cidade" value={p.city} />
                    <FieldRO label="UF" value={p.state} />
                  </div>
                </div>
              )}

              {/* ═══ HISTÓRICO TAB ═══ */}
              {tab === "historico" && (
                <div className="space-y-4">
                  {/* Header row */}
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-sm font-bold text-iw-navy">Registro de Ocorrências</h3>
                      <p className="text-xs text-iw-muted">{timeline.length} entrada(s) no dossiê</p>
                    </div>
                    <button
                      onClick={() => { setShowAddForm(v => !v); setAddErr(""); setAddOk(false); }}
                      className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold bg-iw-blue/8 text-iw-blue border border-iw-blue/25 hover:bg-iw-blue/15 transition-colors"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      Adicionar Ocorrência
                    </button>
                  </div>

                  {/* Add entry form */}
                  {showAddForm && (
                    <form
                      onSubmit={handleAddEntry}
                      className="bg-iw-bg border border-iw-border rounded-xl p-4 space-y-3 animate-in fade-in slide-in-from-top-2 duration-150"
                    >
                      <div className="grid grid-cols-3 gap-3">
                        <div>
                          <label className="block text-[9px] font-bold uppercase tracking-wider text-iw-muted mb-1">
                            Tipo de Evento
                          </label>
                          <select
                            value={evType}
                            onChange={e => setEvType(e.target.value)}
                            className="w-full bg-white border border-iw-border rounded-xl px-2.5 py-2 text-xs text-iw-navy focus:border-iw-blue focus:outline-none"
                          >
                            {["OCORRÊNCIA","OBSERVAÇÃO","DISCIPLINA","TRANSFERÊNCIA","BATISMO","CASAMENTO","FALECIMENTO","ATUALIZAÇÃO"].map(t => (
                              <option key={t} value={t}>{t}</option>
                            ))}
                          </select>
                        </div>
                        <div className="col-span-2">
                          <label className="block text-[9px] font-bold uppercase tracking-wider text-iw-muted mb-1">
                            Descrição *
                          </label>
                          <input
                            type="text"
                            value={evDesc}
                            onChange={e => setEvDesc(e.target.value)}
                            placeholder="Descreva a ocorrência..."
                            required
                            className="w-full bg-white border border-iw-border rounded-xl px-2.5 py-2 text-xs text-iw-navy placeholder-iw-muted focus:border-iw-blue focus:outline-none"
                          />
                        </div>
                      </div>

                      {addErr && (
                        <p className="flex items-center gap-1.5 text-xs text-iw-error font-medium">
                          <AlertCircle className="w-3.5 h-3.5 shrink-0" />{addErr}
                        </p>
                      )}

                      <div className="flex gap-2 justify-end">
                        <button
                          type="button"
                          onClick={() => setShowAddForm(false)}
                          className="px-3 py-1.5 text-xs font-semibold text-iw-muted border border-iw-border rounded-lg hover:text-iw-navy transition-colors"
                        >
                          Cancelar
                        </button>
                        <button
                          type="submit"
                          disabled={isPending || !evDesc.trim()}
                          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-iw-blue text-white rounded-lg hover:bg-iw-navy disabled:opacity-50 transition-colors"
                        >
                          {isPending ? <Loader2 className="w-3 h-3 animate-spin" /> : <Plus className="w-3 h-3" />}
                          Salvar
                        </button>
                      </div>
                    </form>
                  )}

                  {/* Success toast */}
                  {addOk && (
                    <div className="flex items-center gap-2 bg-iw-success/8 border border-iw-success/20 rounded-xl px-3 py-2 text-xs text-iw-success font-medium animate-in fade-in duration-200">
                      <CheckCircle2 className="w-4 h-4 shrink-0" />
                      Ocorrência registrada com sucesso.
                    </div>
                  )}

                  {/* Timeline */}
                  {timeline.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-12 text-iw-muted gap-2">
                      <Clock className="w-8 h-8 opacity-30" />
                      <p className="text-sm">Nenhum registro ainda.</p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {timeline.map(entry => (
                        <div key={entry.id} className="flex gap-3 items-start">
                          <div className="w-px bg-iw-border self-stretch ml-3 mt-4 shrink-0" />
                          <div className="w-2 h-2 rounded-full bg-iw-blue/40 border border-iw-blue mt-3.5 shrink-0 -ml-4.5" />
                          <div className="flex-1 bg-iw-bg border border-iw-border rounded-xl px-4 py-3 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap mb-1.5">
                              <span className="text-[10px] font-semibold text-iw-muted">
                                {fmtDateTime(entry.created_at)}
                              </span>
                              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${evColor(entry.event_type)}`}>
                                {entry.event_type}
                              </span>
                              {entry.created_by_name && (
                                <span className="text-[10px] text-iw-muted ml-auto">
                                  por {entry.created_by_name}
                                </span>
                              )}
                            </div>
                            <p className="text-xs text-iw-navy">{entry.description}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}

// ── Section divider helper ────────────────────────────────────

function SectionDivider({ icon: Icon, label }: { icon: ElementType; label: string }) {
  return (
    <div className="flex items-center gap-2 pt-1">
      <div className="w-5 h-5 rounded-md bg-iw-blue/10 flex items-center justify-center shrink-0">
        <Icon className="w-3 h-3 text-iw-blue" />
      </div>
      <span className="text-[10px] font-bold uppercase tracking-wider text-iw-muted">{label}</span>
      <div className="flex-1 h-px bg-iw-border" />
    </div>
  );
}
