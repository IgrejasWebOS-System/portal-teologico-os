"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { useFormStatus } from "react-dom";
import Link from "next/link";
import {
  ArrowLeft, Send, Loader2, AlertTriangle, User, MapPin, GraduationCap, Wallet, Plus, X, ShieldCheck,
} from "lucide-react";
import { createClient } from "@/utils/supabase/client";
import { validarCPF } from "@/utils/cpf";
import { matricularDiretoAction, addTurmaAction } from "../actions";
import MatriculaLookup from "@/app/(igreja)/dashboard/configuracoes/MatriculaLookup";
import { addProfessorAction, type MembroEncontrado } from "@/app/(igreja)/dashboard/configuracoes/actions";

type CampoMinisterio = { id: string; nome: string; tipo: string };
type Curso = { id: string; title: string; module: string };
type SelectItem = { id: string; name: string };
type Church = { id: string; name: string; sector_id: string | null };
type Turma = { id: string; nome: string; course_id: string };
type Professor = { id: string; nome_completo: string; church_id: string | null };
type Municipio = { nome: string; uf: string };

function maskCPF(raw: string): string {
  let v = raw.replace(/\D/g, "").slice(0, 11);
  v = v.replace(/(\d{3})(\d)/, "$1.$2");
  v = v.replace(/(\d{3})(\d)/, "$1.$2");
  v = v.replace(/(\d{3})(\d{1,2})$/, "$1-$2");
  return v;
}

function maskRG(raw: string): string {
  let v = raw.replace(/\D/g, "").slice(0, 9);
  if (v.length > 7) v = `${v.slice(0, 2)}.${v.slice(2, 5)}.${v.slice(5, 8)}-${v.slice(8)}`;
  else if (v.length > 4) v = `${v.slice(0, 2)}.${v.slice(2, 5)}.${v.slice(5)}`;
  else if (v.length > 2) v = `${v.slice(0, 2)}.${v.slice(2)}`;
  return v;
}

function maskPhone(raw: string): string {
  let v = raw.replace(/\D/g, "").slice(0, 11);
  if (v.length > 10) v = `(${v.slice(0, 2)}) ${v.slice(2, 7)}-${v.slice(7)}`;
  else if (v.length > 6) v = `(${v.slice(0, 2)}) ${v.slice(2, 6)}-${v.slice(6)}`;
  else if (v.length > 2) v = `(${v.slice(0, 2)}) ${v.slice(2)}`;
  else v = v.length ? `(${v}` : v;
  return v;
}

function maskDate(raw: string): string {
  let v = raw.replace(/\D/g, "").slice(0, 8);
  if (v.length > 4) v = `${v.slice(0, 2)}/${v.slice(2, 4)}/${v.slice(4)}`;
  else if (v.length > 2) v = `${v.slice(0, 2)}/${v.slice(2)}`;
  return v;
}

function dateBrToIso(br: string): string {
  if (br.length !== 10) return "";
  const [d, m, y] = br.split("/");
  return `${y}-${m}-${d}`;
}

// ── Campo compacto: rótulo em caixa alta dentro da própria caixa ──
const boxCls =
  "border border-iw-border rounded-xl px-3.5 pt-1.5 pb-2 bg-white focus-within:border-iw-gold focus-within:ring-1 focus-within:ring-iw-gold/30 transition-colors";
const boxLabelCls = "block text-[10px] font-extrabold text-iw-muted uppercase tracking-wider mb-0.5";
const bareCls = "w-full bg-transparent border-none p-0 text-sm text-iw-navy placeholder-iw-muted/70 focus:outline-none focus:ring-0";
const bareSelectCls = `${bareCls} cursor-pointer`;

function Field({
  label, required, span, className, children,
}: {
  label: string; required?: boolean; span?: string; className?: string; children: React.ReactNode;
}) {
  return (
    <div className={`${boxCls} ${span ?? "col-span-12 md:col-span-3"} ${className ?? ""}`}>
      <label className={boxLabelCls}>{label}{required && " *"}</label>
      {children}
    </div>
  );
}

function CidadeField({
  span, query, onQueryChange, onSelect, municipios,
}: {
  span: string;
  query: string;
  onQueryChange: (v: string) => void;
  onSelect: (nome: string, uf: string) => void;
  municipios: Municipio[];
}) {
  const [open, setOpen] = useState(false);

  const resultados = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (q.length < 2) return [];
    return municipios.filter((m) => m.nome.toLowerCase().startsWith(q)).slice(0, 8);
  }, [query, municipios]);

  return (
    <div className={`${boxCls} ${span} relative`}>
      <label className={boxLabelCls}>Naturalidade — cidade</label>
      <input
        value={query}
        onChange={(e) => { onQueryChange(e.target.value); setOpen(true); }}
        onFocus={() => setOpen(true)}
        placeholder="Cidade de nascimento"
        autoComplete="off"
        className={bareCls}
      />
      {open && resultados.length > 0 && (
        <ul className="absolute left-0 right-0 top-full mt-1 bg-white border border-iw-border rounded-xl shadow-md max-h-56 overflow-auto z-20">
          {resultados.map((m, i) => (
            <li key={`${m.nome}-${m.uf}-${i}`}>
              <button
                type="button"
                onMouseDown={() => { onSelect(m.nome, m.uf); setOpen(false); }}
                className="w-full text-left px-3 py-2 text-sm hover:bg-iw-bg text-iw-navy"
              >
                {m.nome} <span className="text-iw-muted text-xs">— {m.uf}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function SectionHeader({ icon: Icon, label }: { icon: React.ElementType; label: string }) {
  return (
    <div className="flex items-center gap-2.5 pb-3 border-b border-iw-border">
      <div className="w-6 h-6 rounded-lg bg-iw-gold/10 flex items-center justify-center shrink-0">
        <Icon className="w-3.5 h-3.5 text-iw-gold" />
      </div>
      <h2 className="text-sm font-bold text-iw-navy uppercase tracking-wider">{label}</h2>
    </div>
  );
}

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="inline-flex items-center gap-2 bg-iw-gold hover:opacity-90 disabled:opacity-50 text-white font-bold px-6 py-3 rounded-xl text-sm transition-opacity"
    >
      {pending ? (
        <>
          <Loader2 className="w-4 h-4 animate-spin" />
          Matriculando...
        </>
      ) : (
        <>
          <Send className="w-4 h-4" />
          Gerar matrícula
        </>
      )}
    </button>
  );
}

export default function NovaMatriculaForm({
  campos,
  cursos,
  churches,
  setores,
  turmasIniciais,
  professoresIniciais,
  errorMsg,
}: {
  campos: CampoMinisterio[];
  cursos: Curso[];
  churches: Church[];
  setores: SelectItem[];
  turmasIniciais: Turma[];
  professoresIniciais: Professor[];
  errorMsg?: string;
}) {
  const [responsavelPagamento, setResponsavelPagamento] = useState("ALUNO");
  const [formaCobranca, setFormaCobranca] = useState("MANUAL");
  const hoje = new Date().toISOString().slice(0, 10);
  const [cpf, setCpf] = useState("");
  const [rg, setRg] = useState("");
  const [telefone, setTelefone] = useState("");
  const [dataNascimento, setDataNascimento] = useState("");
  const [cep, setCep] = useState("");
  const [endereco, setEndereco] = useState("");
  const [bairro, setBairro] = useState("");
  const [cidade, setCidade] = useState("");
  const [estado, setEstado] = useState("");
  const [loadingCep, setLoadingCep] = useState(false);
  const [naturalidadeCidade, setNaturalidadeCidade] = useState("");
  const [naturalidadeEstado, setNaturalidadeEstado] = useState("");
  const [municipios, setMunicipios] = useState<Municipio[]>([]);

  const [generos, setGeneros] = useState<SelectItem[]>([]);
  const [estadosCivis, setEstadosCivis] = useState<SelectItem[]>([]);
  const [escolaridades, setEscolaridades] = useState<SelectItem[]>([]);
  const [profissoes, setProfissoes] = useState<SelectItem[]>([]);

  // Curso e vínculo
  const [courseId, setCourseId] = useState("");
  const [sectorId, setSectorId] = useState("");
  const [churchId, setChurchId] = useState("");
  const [turmas, setTurmas] = useState<Turma[]>(turmasIniciais);
  const [turmaId, setTurmaId] = useState("");
  const [professores, setProfessores] = useState<Professor[]>(professoresIniciais);
  const [professorId, setProfessorId] = useState("");

  const [showNovaTurma, setShowNovaTurma] = useState(false);
  const [novaTurmaNome, setNovaTurmaNome] = useState("");
  const [novaTurmaInicio, setNovaTurmaInicio] = useState("");
  const [novaTurmaFim, setNovaTurmaFim] = useState("");
  const [showNovoProfessor, setShowNovoProfessor] = useState(false);
  const [novoProfNome, setNovoProfNome] = useState("");
  const [novoProfCargo, setNovoProfCargo] = useState("");
  const [novoProfTelefone, setNovoProfTelefone] = useState("");
  const [novoProfMemberId, setNovoProfMemberId] = useState("");
  const [isPendingExtra, startTransitionExtra] = useTransition();
  const [extraError, setExtraError] = useState("");

  useEffect(() => {
    async function fetchDropdowns() {
      const supabase = createClient();
      const [g, e, s, p] = await Promise.all([
        supabase.from("settings_gender").select("id, name").order("name"),
        supabase.from("settings_civil_status").select("id, name").order("name"),
        supabase.from("settings_schooling").select("id, name").order("name"),
        supabase.from("settings_professions").select("id, name").order("name"),
      ]);
      if (g.data) setGeneros(g.data as SelectItem[]);
      if (e.data) setEstadosCivis(e.data as SelectItem[]);
      if (s.data) setEscolaridades(s.data as SelectItem[]);
      if (p.data) setProfissoes(p.data as SelectItem[]);
    }
    fetchDropdowns();
  }, []);

  useEffect(() => {
    async function fetchMunicipios() {
      try {
        const res = await fetch("https://servicodados.ibge.gov.br/api/v1/localidades/municipios");
        const data = await res.json();
        const lista: Municipio[] = (data as unknown[]).map((m) => {
          const item = m as {
            nome: string;
            microrregiao?: { mesorregiao?: { UF?: { sigla?: string } } };
            "regiao-imediata"?: { "regiao-intermediaria"?: { UF?: { sigla?: string } } };
          };
          const uf =
            item.microrregiao?.mesorregiao?.UF?.sigla ??
            item["regiao-imediata"]?.["regiao-intermediaria"]?.UF?.sigla ??
            "";
          return { nome: item.nome, uf };
        });
        setMunicipios(lista);
      } catch {
        // silencioso — o campo continua utilizável como texto livre
      }
    }
    fetchMunicipios();
  }, []);

  const handleBlurCep = async () => {
    const cepLimpo = cep.replace(/\D/g, "");
    if (cepLimpo.length !== 8) return;
    setLoadingCep(true);
    try {
      const res = await fetch(`https://viacep.com.br/ws/${cepLimpo}/json/`);
      const data = await res.json();
      if (!data.erro) {
        setEndereco(data.logradouro ?? endereco);
        setBairro(data.bairro ?? bairro);
        setCidade(data.localidade ?? cidade);
        setEstado(data.uf ?? estado);
      }
    } catch {
      // silencioso
    } finally {
      setLoadingCep(false);
    }
  };

  const cursosEscola = cursos.filter((c) => c.module === "escola");
  const cursosOutros = cursos.filter((c) => c.module !== "escola");

  const igrejasDoSetor = useMemo(
    () => (sectorId ? churches.filter((c) => c.sector_id === sectorId) : churches),
    [sectorId, churches]
  );
  const turmasDoCurso = useMemo(
    () => (courseId ? turmas.filter((t) => t.course_id === courseId) : []),
    [courseId, turmas]
  );

  const handleCriarTurma = () => {
    if (!courseId) { setExtraError("Selecione o curso antes de criar a turma."); return; }
    if (!novaTurmaNome.trim()) { setExtraError("Digite o nome da turma."); return; }
    if (novaTurmaInicio && novaTurmaFim && novaTurmaFim < novaTurmaInicio) {
      setExtraError("O mês/ano de término não pode ser antes do início.");
      return;
    }
    setExtraError("");
    const fd = new FormData();
    fd.set("course_id", courseId);
    fd.set("nome", novaTurmaNome.trim());
    fd.set("data_inicio", novaTurmaInicio);
    fd.set("data_fim", novaTurmaFim);
    startTransitionExtra(async () => {
      const res = await addTurmaAction(fd);
      if (!res.success || !res.data) { setExtraError(res.message ?? "Erro ao criar turma."); return; }
      const nova = { id: res.data.id as string, nome: res.data.nome as string, course_id: courseId };
      setTurmas((prev) => [...prev, nova]);
      setTurmaId(nova.id);
      setShowNovaTurma(false);
      setNovaTurmaNome(""); setNovaTurmaInicio(""); setNovaTurmaFim("");
    });
  };

  const handleCriarProfessor = () => {
    if (!novoProfNome.trim()) { setExtraError("Digite o nome do professor(a)."); return; }
    setExtraError("");
    const fd = new FormData();
    fd.set("nome_completo", novoProfNome.trim());
    fd.set("cargo", novoProfCargo);
    fd.set("telefone", novoProfTelefone);
    fd.set("member_id", novoProfMemberId);
    fd.set("sector_id", sectorId);
    fd.set("church_id", churchId);
    startTransitionExtra(async () => {
      const res = await addProfessorAction(fd);
      if (!res.success || !res.data) { setExtraError(res.message ?? "Erro ao criar professor(a)."); return; }
      const criado = res.data as Professor;
      setProfessores((prev) => [...prev, criado]);
      setProfessorId(criado.id);
      setShowNovoProfessor(false);
      setNovoProfNome(""); setNovoProfCargo(""); setNovoProfTelefone(""); setNovoProfMemberId("");
    });
  };

  return (
    <div className="max-w-[1400px] mx-auto space-y-6 pb-16 px-2">
      <div>
        <Link
          href="/admin/matriculas"
          className="inline-flex items-center gap-1.5 text-xs text-iw-muted hover:text-iw-navy font-medium transition-colors mb-2"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          Voltar para Matrículas
        </Link>
        <h1 className="text-xl font-black text-iw-navy tracking-tight">Nova Matrícula Direta</h1>
        <p className="text-iw-navy text-xs font-bold mt-0.5">
          Cadastro completo do aluno + matrícula gerada na hora, sem passar pela inscrição pública nem pelo pagamento online.
        </p>
      </div>

      {errorMsg && (
        <div className="flex items-center gap-3 bg-iw-error/8 border border-iw-error/30 text-iw-error px-4 py-3 rounded-xl text-sm">
          <AlertTriangle className="w-4 h-4 shrink-0" />
          <span className="font-medium">{errorMsg}</span>
        </div>
      )}
      {extraError && (
        <div className="flex items-center gap-3 bg-iw-error/8 border border-iw-error/30 text-iw-error px-4 py-3 rounded-xl text-sm">
          <AlertTriangle className="w-4 h-4 shrink-0" />
          <span className="font-medium">{extraError}</span>
        </div>
      )}

      <form
        action={(fd: FormData) => {
          if (!validarCPF(cpf)) {
            setExtraError("CPF inválido — confira os dígitos digitados.");
            return;
          }
          setExtraError("");
          fd.set("cpf", cpf);
          fd.set("rg", rg);
          fd.set("telefone", telefone);
          fd.set("data_nascimento", dateBrToIso(dataNascimento));
          fd.set("cep", cep);
          fd.set("endereco", endereco);
          fd.set("bairro", bairro);
          fd.set("cidade", cidade);
          fd.set("estado", estado);
          fd.set("sector_id", sectorId);
          fd.set("church_id_aluno", churchId);
          fd.set("course_edition_id", turmaId);
          fd.set("professor_id", professorId);
          fd.set("naturalidade_cidade", naturalidadeCidade);
          fd.set("naturalidade_estado", naturalidadeEstado);
          return matricularDiretoAction(fd);
        }}
        className="space-y-6"
      >
        {/* Curso e vínculo */}
        <div className="bg-iw-surface rounded-2xl border border-iw-border shadow-sm p-6 space-y-4">
          <SectionHeader icon={GraduationCap} label="Curso e Vínculo" />
          <div className="grid grid-cols-12 gap-3">
            <Field label="Curso" required span="col-span-12 md:col-span-4">
              <select
                name="course_id"
                required
                value={courseId}
                onChange={(e) => { setCourseId(e.target.value); setTurmaId(""); }}
                className={bareSelectCls}
              >
                <option value="" disabled>Selecione o curso</option>
                {cursosEscola.length > 0 && (
                  <optgroup label="Escola Teológica">
                    {cursosEscola.map((c) => (
                      <option key={c.id} value={c.id}>{c.title}</option>
                    ))}
                  </optgroup>
                )}
                {cursosOutros.length > 0 && (
                  <optgroup label="Cursos & Preparatórios">
                    {cursosOutros.map((c) => (
                      <option key={c.id} value={c.id}>{c.title}</option>
                    ))}
                  </optgroup>
                )}
              </select>
            </Field>

            <Field label="Campo / Ministério" span="col-span-12 md:col-span-4">
              <select name="campo_ministerio_id" className={bareSelectCls} defaultValue="">
                <option value="">Selecione (opcional)</option>
                {campos.map((c) => (
                  <option key={c.id} value={c.id}>{c.nome}</option>
                ))}
              </select>
            </Field>

            <Field label="Setor" span="col-span-6 md:col-span-2">
              <select
                value={sectorId}
                onChange={(e) => { setSectorId(e.target.value); setChurchId(""); }}
                className={bareSelectCls}
              >
                <option value="">Selecione...</option>
                {setores.map((s) => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>
            </Field>

            <Field label="Igreja" span="col-span-6 md:col-span-2">
              <select value={churchId} onChange={(e) => setChurchId(e.target.value)} className={bareSelectCls}>
                <option value="">Selecione...</option>
                {igrejasDoSetor.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </Field>
          </div>

          <div className="grid grid-cols-12 gap-3 items-start">
            <div className="col-span-12 md:col-span-6 grid grid-cols-[1fr_auto] gap-2">
              <Field label="Turma" span="">
                <select value={turmaId} onChange={(e) => setTurmaId(e.target.value)} className={bareSelectCls}>
                  <option value="">
                    {courseId ? "Selecione..." : "Selecione o curso primeiro"}
                  </option>
                  {turmasDoCurso.map((t) => (
                    <option key={t.id} value={t.id}>{t.nome}</option>
                  ))}
                </select>
              </Field>
              <button
                type="button"
                onClick={() => setShowNovaTurma((v) => !v)}
                className="shrink-0 h-full px-3 border border-iw-border rounded-xl bg-white hover:bg-iw-bg text-xs font-bold text-iw-navy flex items-center gap-1 transition-colors"
              >
                {showNovaTurma ? <X className="w-3.5 h-3.5" /> : <Plus className="w-3.5 h-3.5" />} Turma
              </button>
            </div>

            <div className="col-span-12 md:col-span-6 grid grid-cols-[1fr_auto] gap-2">
              <Field label="Professor(a)" span="">
                <select value={professorId} onChange={(e) => setProfessorId(e.target.value)} className={bareSelectCls}>
                  <option value="">Selecione...</option>
                  {professores.map((p) => (
                    <option key={p.id} value={p.id}>{p.nome_completo}</option>
                  ))}
                </select>
              </Field>
              <button
                type="button"
                onClick={() => setShowNovoProfessor((v) => !v)}
                className="shrink-0 h-full px-3 border border-iw-border rounded-xl bg-white hover:bg-iw-bg text-xs font-bold text-iw-navy flex items-center gap-1 transition-colors"
              >
                {showNovoProfessor ? <X className="w-3.5 h-3.5" /> : <Plus className="w-3.5 h-3.5" />} Professor(a)
              </button>
            </div>
          </div>

          {showNovaTurma && (
            <div className="bg-iw-bg rounded-xl p-4 grid grid-cols-12 gap-3 items-end">
              <Field label="Nome da turma" span="col-span-12 md:col-span-4">
                <input
                  value={novaTurmaNome}
                  onChange={(e) => setNovaTurmaNome(e.target.value)}
                  placeholder="Ex: Edição 2026"
                  className={bareCls}
                />
              </Field>
              <Field label="Mês/Ano — Início" span="col-span-6 md:col-span-3">
                <input
                  type="month"
                  value={novaTurmaInicio}
                  onChange={(e) => setNovaTurmaInicio(e.target.value)}
                  className={bareCls}
                />
              </Field>
              <Field label="Mês/Ano — Término" span="col-span-6 md:col-span-3">
                <input
                  type="month"
                  value={novaTurmaFim}
                  onChange={(e) => setNovaTurmaFim(e.target.value)}
                  className={bareCls}
                />
              </Field>
              <button
                type="button"
                onClick={handleCriarTurma}
                disabled={isPendingExtra}
                className="col-span-12 md:col-span-2 bg-iw-blue hover:bg-iw-navy disabled:opacity-50 text-white text-xs font-bold px-4 py-2.5 rounded-xl transition-colors"
              >
                Salvar turma
              </button>
            </div>
          )}

          {showNovoProfessor && (
            <div className="bg-iw-bg rounded-xl p-4 grid grid-cols-12 gap-3 items-end">
              <div className="col-span-12 md:col-span-3">
                <MatriculaLookup
                  label="Matrícula"
                  onFound={(m: MembroEncontrado) => {
                    setNovoProfMemberId(m.id);
                    setNovoProfNome(m.full_name);
                    setNovoProfCargo(m.cargo ?? "");
                    setNovoProfTelefone(m.phone ?? "");
                  }}
                  onClear={() => setNovoProfMemberId("")}
                />
              </div>
              <Field label="Nome completo" span="col-span-12 md:col-span-3">
                <input value={novoProfNome} onChange={(e) => setNovoProfNome(e.target.value)} className={bareCls} />
              </Field>
              <Field label="Cargo" span="col-span-6 md:col-span-2">
                <input value={novoProfCargo} onChange={(e) => setNovoProfCargo(e.target.value)} className={bareCls} />
              </Field>
              <Field label="Telefone" span="col-span-6 md:col-span-2">
                <input value={novoProfTelefone} onChange={(e) => setNovoProfTelefone(e.target.value)} className={bareCls} />
              </Field>
              <button
                type="button"
                onClick={handleCriarProfessor}
                disabled={isPendingExtra}
                className="col-span-12 md:col-span-2 bg-iw-blue hover:bg-iw-navy disabled:opacity-50 text-white text-xs font-bold px-4 py-2.5 rounded-xl transition-colors"
              >
                Salvar professor(a)
              </button>
            </div>
          )}
        </div>

        {/* Dados pessoais */}
        <div className="bg-iw-surface rounded-2xl border border-iw-border shadow-sm p-6 space-y-3">
          <SectionHeader icon={User} label="Dados Pessoais" />

          <div className="grid grid-cols-12 gap-3">
            <Field label="Nome completo" required span="col-span-12 md:col-span-6">
              <input name="nome_completo" required placeholder="Nome completo do aluno" className={bareCls} />
            </Field>
            <Field label="CPF" required span="col-span-6 md:col-span-3">
              <input
                required
                value={cpf}
                onChange={(e) => setCpf(maskCPF(e.target.value))}
                placeholder="000.000.000-00"
                className={bareCls}
              />
            </Field>
            <Field label="Data de nascimento" span="col-span-6 md:col-span-3">
              <input
                value={dataNascimento}
                maxLength={10}
                onChange={(e) => setDataNascimento(maskDate(e.target.value))}
                placeholder="DD/MM/AAAA"
                className={`${bareCls} text-center`}
              />
            </Field>
          </div>

          <div className="grid grid-cols-12 gap-3">
            <Field label="E-mail" required span="col-span-12 md:col-span-4">
              <input name="email" type="email" required placeholder="aluno@email.com" className={bareCls} />
            </Field>
            <Field label="Telefone" span="col-span-6 md:col-span-3">
              <input
                value={telefone}
                onChange={(e) => setTelefone(maskPhone(e.target.value))}
                placeholder="(00) 00000-0000"
                className={bareCls}
              />
            </Field>
            <Field label="RG" span="col-span-6 md:col-span-2">
              <input
                value={rg}
                onChange={(e) => setRg(maskRG(e.target.value))}
                placeholder="00.000.000-0"
                className={bareCls}
              />
            </Field>
            <Field label="Órgão" span="col-span-6 md:col-span-1">
              <input name="rg_orgao_emissor" defaultValue="SSP" className={bareCls} />
            </Field>
            <Field label="UF do RG" span="col-span-6 md:col-span-2">
              <input name="rg_uf" maxLength={2} defaultValue="SP" className={`${bareCls} uppercase`} />
            </Field>
          </div>

          <div className="grid grid-cols-12 gap-3">
            <Field label="Sexo" span="col-span-6 md:col-span-3">
              <select name="genero" className={bareSelectCls} defaultValue="">
                <option value="">Selecione...</option>
                {generos.map((g) => <option key={g.id} value={g.name}>{g.name}</option>)}
              </select>
            </Field>
            <Field label="Estado civil" span="col-span-6 md:col-span-3">
              <select name="estado_civil" className={bareSelectCls} defaultValue="">
                <option value="">Selecione...</option>
                {estadosCivis.map((e) => <option key={e.id} value={e.name}>{e.name}</option>)}
              </select>
            </Field>
            <Field label="Escolaridade" span="col-span-6 md:col-span-3">
              <select name="escolaridade" className={bareSelectCls} defaultValue="">
                <option value="">Selecione...</option>
                {escolaridades.map((e) => <option key={e.id} value={e.name}>{e.name}</option>)}
              </select>
            </Field>
            <Field label="Profissão" span="col-span-6 md:col-span-3">
              <select name="profissao" className={bareSelectCls} defaultValue="">
                <option value="">Selecione...</option>
                {profissoes.map((p) => <option key={p.id} value={p.name}>{p.name}</option>)}
              </select>
            </Field>
          </div>

          <div className="grid grid-cols-12 gap-3">
            <CidadeField
              span="col-span-6 md:col-span-2"
              query={naturalidadeCidade}
              onQueryChange={setNaturalidadeCidade}
              onSelect={(nome, uf) => { setNaturalidadeCidade(nome); setNaturalidadeEstado(uf); }}
              municipios={municipios}
            />
            <Field label="UF" span="col-span-3 md:col-span-1">
              <input
                value={naturalidadeEstado}
                maxLength={2}
                onChange={(e) => setNaturalidadeEstado(e.target.value.toUpperCase())}
                className={`${bareCls} uppercase`}
              />
            </Field>
            <Field label="Nacionalidade" span="col-span-3 md:col-span-2">
              <input name="nacionalidade" defaultValue="Brasileira" className={bareCls} />
            </Field>
            <Field label="Cônjuge (se houver)" span="col-span-12 md:col-span-7">
              <input name="nome_conjuge" className={bareCls} />
            </Field>
          </div>

          <div className="grid grid-cols-12 gap-3">
            <Field label="Nome da mãe" span="col-span-12 md:col-span-6">
              <input name="nome_mae" className={bareCls} />
            </Field>
            <Field label="Nome do pai" span="col-span-12 md:col-span-6">
              <input name="nome_pai" className={bareCls} />
            </Field>
          </div>
        </div>

        {/* Endereço */}
        <div className="bg-iw-surface rounded-2xl border border-iw-border shadow-sm p-6 space-y-3">
          <SectionHeader icon={MapPin} label="Endereço" />
          <div className="grid grid-cols-12 gap-3">
            <Field label="CEP" span="col-span-6 md:col-span-2">
              <input
                value={cep}
                maxLength={9}
                onChange={(e) => {
                  let v = e.target.value.replace(/\D/g, "").slice(0, 8);
                  if (v.length > 5) v = `${v.slice(0, 5)}-${v.slice(5)}`;
                  setCep(v);
                }}
                onBlur={handleBlurCep}
                placeholder={loadingCep ? "Buscando..." : "00000-000"}
                className={bareCls}
              />
            </Field>
            <Field label="Endereço" span="col-span-12 md:col-span-7">
              <input value={endereco} onChange={(e) => setEndereco(e.target.value)} className={bareCls} />
            </Field>
            <Field label="Número" span="col-span-6 md:col-span-3">
              <input name="endereco_numero" className={bareCls} />
            </Field>
          </div>
          <div className="grid grid-cols-12 gap-3">
            <Field label="Complemento" span="col-span-12 md:col-span-4">
              <input name="endereco_complemento" className={bareCls} />
            </Field>
            <Field label="Bairro" span="col-span-12 md:col-span-4">
              <input value={bairro} onChange={(e) => setBairro(e.target.value)} className={bareCls} />
            </Field>
            <Field label="Cidade" span="col-span-6 md:col-span-3">
              <input value={cidade} onChange={(e) => setCidade(e.target.value)} className={bareCls} />
            </Field>
            <Field label="UF" span="col-span-6 md:col-span-1">
              <input
                value={estado}
                maxLength={2}
                onChange={(e) => setEstado(e.target.value.toUpperCase())}
                className={`${bareCls} uppercase text-center`}
              />
            </Field>
          </div>
        </div>

        {/* Pagamento */}
        <div className="bg-iw-surface rounded-2xl border border-iw-border shadow-sm p-6 space-y-3">
          <SectionHeader icon={Wallet} label="Pagamento" />
          <p className="text-xs text-iw-muted -mt-1">
            Opcional. Deixe o valor em branco se essa matrícula não tiver cobrança. Preenchendo, o sistema gera as
            parcelas em Financeiro &gt; Contas a Receber (não lança nada no Caixa Diário automaticamente).
          </p>
          <div className="grid grid-cols-12 gap-3">
            <Field label="Valor total" span="col-span-6 md:col-span-3">
              <input name="valor_total" placeholder="Ex: 600,00" className={bareCls} />
            </Field>
            {formaCobranca === "MANUAL" ? (
              <>
                <Field label="Nº de parcelas" span="col-span-6 md:col-span-2">
                  <input name="total_parcelas" type="number" min={1} max={12} defaultValue={1} className={bareCls} />
                </Field>
                <Field label="1º vencimento" span="col-span-6 md:col-span-3">
                  <input name="data_vencimento" type="date" defaultValue={hoje} className={bareCls} />
                </Field>
                <Field label="Forma de pagamento prevista" span="col-span-6 md:col-span-4">
                  <select name="forma_pagamento_prevista" defaultValue="DINHEIRO" className={bareSelectCls}>
                    <option value="DINHEIRO">Dinheiro</option>
                    <option value="PIX">Pix</option>
                    <option value="CARTAO">Cartão</option>
                    <option value="BOLETO">Boleto</option>
                    <option value="TRANSFERENCIA">Transferência</option>
                  </select>
                </Field>
              </>
            ) : (
              <div className="col-span-12 md:col-span-9 flex items-center">
                <p className="text-xs text-iw-muted">
                  Um link de pagamento único (Checkout Pro) será gerado no valor total informado. A cobrança fica
                  pendente em Financeiro &gt; Contas a Receber até o Mercado Pago confirmar o pagamento.
                </p>
              </div>
            )}
          </div>
          <div className="grid grid-cols-12 gap-3">
            <Field label="Forma de cobrança" span="col-span-12 md:col-span-4">
              <select
                name="forma_cobranca"
                value={formaCobranca}
                onChange={(e) => setFormaCobranca(e.target.value)}
                className={bareSelectCls}
              >
                <option value="MANUAL">Parcelamento manual (Contas a Receber)</option>
                <option value="MERCADOPAGO">Link de pagamento (Mercado Pago)</option>
              </select>
            </Field>
            <Field label="Quem paga" span="col-span-12 md:col-span-4">
              <select
                name="responsavel_pagamento"
                value={responsavelPagamento}
                onChange={(e) => setResponsavelPagamento(e.target.value)}
                className={bareSelectCls}
              >
                <option value="ALUNO">O próprio aluno</option>
                <option value="IGREJA">Igreja (financiamento interno)</option>
              </select>
            </Field>
            {responsavelPagamento === "IGREJA" && (
              <Field label="Igreja responsável" span="col-span-12 md:col-span-4">
                <select name="church_id" defaultValue="" className={bareSelectCls}>
                  <option value="" disabled>Selecione a igreja</option>
                  {churches.map((c) => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </Field>
            )}
          </div>
        </div>

        {/* Consentimento LGPD */}
        <div className="bg-iw-surface rounded-2xl border border-iw-border shadow-sm p-6 space-y-3">
          <SectionHeader icon={ShieldCheck} label="Consentimento LGPD" />
          <label className="flex items-start gap-3 cursor-pointer">
            <input
              type="checkbox"
              name="consentimento_lgpd_aceito"
              value="true"
              defaultChecked
              required
              className="mt-0.5 w-4 h-4 accent-iw-gold shrink-0"
            />
            <span className="text-sm text-iw-navy">
              Declaro que estou ciente das informações acima e autorizo o uso, assim como o
              tratamento dos meus dados pessoais para cadastro e/ou atualização cadastral, de
              acordo com os artigos 7º e 11 da Lei nº 13.709/2018.
            </span>
          </label>
        </div>

        <div className="flex justify-end">
          <SubmitButton />
        </div>
      </form>
    </div>
  );
}
