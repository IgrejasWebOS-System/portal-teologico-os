"use client";

import { useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Plus, Save, Loader2, AlertTriangle, User, Phone, Briefcase, Map, Church, Building } from "lucide-react";
import MatriculaLookup from "../MatriculaLookup";
import { addProfessorAction, updateProfessorAction, type MembroEncontrado } from "../actions";
import { ancestryChain, SUB_UNIT_TYPES, type UnitNode } from "../unitsChain";

type ChurchLink = { id: string; unit_id: string | null };

type ExistingProfessor = {
  id: string;
  unitId: string | null;
  memberId: string | null;
  matricula: string | null;
  nome: string;
  cargo: string | null;
  telefone: string | null;
};

interface Props {
  units: UnitNode[];
  churches: ChurchLink[];
  existing?: ExistingProfessor;
  submitLabel?: string;
}

const inputCls =
  "w-full bg-white border border-iw-border rounded-xl px-3 py-2.5 text-sm text-iw-navy placeholder-iw-muted focus:border-iw-blue focus:outline-none focus:ring-2 focus:ring-iw-blue/20 transition-colors";
const selectCls =
  "w-full bg-white border border-iw-border rounded-xl px-3 py-2.5 text-sm text-iw-navy focus:border-iw-blue focus:outline-none focus:ring-2 focus:ring-iw-blue/20 cursor-pointer transition-colors";
const labelCls =
  "block text-[11px] font-bold text-iw-muted uppercase tracking-wider mb-1.5";
const sectionTitleCls =
  "flex items-center gap-2 text-xs font-black text-iw-navy uppercase tracking-widest mb-4 pb-2 border-b border-iw-border";

export default function ProfessorForm({ units, churches, existing, submitLabel = "Cadastrar Professor" }: Props) {
  const router = useRouter();

  const cadeiaInicial = useMemo(
    () => ancestryChain(existing?.unitId, units),
    [existing?.unitId, units]
  );

  const [campoId, setCampoId] = useState(cadeiaInicial.find((u) => u.type === "CAMPO")?.id ?? "");
  const [setorId, setSetorId] = useState(cadeiaInicial.find((u) => u.type === "SETOR")?.id ?? "");
  const [igrejaId, setIgrejaId] = useState(cadeiaInicial.find((u) => u.type === "IGREJA")?.id ?? "");
  const [subunidadeId, setSubunidadeId] = useState(
    cadeiaInicial.find((u) => SUB_UNIT_TYPES.includes(u.type))?.id ?? ""
  );

  const [memberId, setMemberId] = useState(existing?.memberId ?? "");
  const [nome, setNome] = useState(existing?.nome ?? "");
  const [cargo, setCargo] = useState(existing?.cargo ?? "");
  const [telefone, setTelefone] = useState(existing?.telefone ?? "");
  const [error, setError] = useState("");
  const [isPending, startTransition] = useTransition();

  const campos = useMemo(() => units.filter((u) => u.type === "CAMPO"), [units]);

  const sedeDoCampo = useMemo(
    () => units.find((u) => u.type === "SEDE" && u.parent_id === campoId),
    [units, campoId]
  );

  const setores = useMemo(
    () => (sedeDoCampo ? units.filter((u) => u.type === "SETOR" && u.parent_id === sedeDoCampo.id) : []),
    [units, sedeDoCampo]
  );

  const igrejas = useMemo(
    () => (setorId ? units.filter((u) => u.type === "IGREJA" && u.parent_id === setorId) : []),
    [units, setorId]
  );

  const subunidades = useMemo(
    () => (igrejaId ? units.filter((u) => SUB_UNIT_TYPES.includes(u.type) && u.parent_id === igrejaId) : []),
    [units, igrejaId]
  );

  const finalUnitId = subunidadeId || igrejaId;

  const handleMembroEncontrado = (membro: MembroEncontrado) => {
    setMemberId(membro.id);
    setNome(membro.full_name);
    setCargo(membro.cargo ?? "");
    setTelefone(membro.phone ?? "");

    const church = churches.find((c) => c.id === membro.church_id);
    if (church?.unit_id) {
      const chain = ancestryChain(church.unit_id, units);
      setCampoId(chain.find((u) => u.type === "CAMPO")?.id ?? "");
      setSetorId(chain.find((u) => u.type === "SETOR")?.id ?? "");
      setIgrejaId(chain.find((u) => u.type === "IGREJA")?.id ?? "");
      setSubunidadeId(chain.find((u) => SUB_UNIT_TYPES.includes(u.type))?.id ?? "");
    }
  };

  const handleSubmit = (fd: FormData) => {
    if (!nome.trim()) { setError("Busque a matrícula/nome ou digite o nome do professor."); return; }
    if (!finalUnitId) { setError("Selecione ao menos Campo, Setor e Igreja."); return; }
    setError("");
    fd.set("nome_completo", nome.trim());
    fd.set("cargo", cargo);
    fd.set("telefone", telefone);
    fd.set("member_id", memberId);
    fd.set("unit_id", finalUnitId);
    fd.set("setor_unit_id", setorId);
    if (existing) fd.set("id", existing.id);

    startTransition(async () => {
      const res = existing ? await updateProfessorAction(fd) : await addProfessorAction(fd);
      if (!res.success) { setError(res.message ?? "Erro ao salvar."); return; }
      router.push("/dashboard/configuracoes/professores");
      router.refresh();
    });
  };

  return (
    <form action={handleSubmit} className="space-y-6">
      {error && (
        <div className="flex items-center gap-2 text-iw-error text-sm bg-iw-error-bg border border-iw-error/20 px-4 py-3 rounded-xl">
          <AlertTriangle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      <div className="bg-iw-surface rounded-2xl border border-iw-gold shadow-sm p-6 space-y-4">
        <h3 className={sectionTitleCls}>
          <Building className="w-4 h-4 text-iw-blue" />
          Campo, Setor e Igreja
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div>
            <label className={labelCls}>
              <span className="inline-flex items-center gap-1"><Building className="w-3 h-3" /> Campo</span>
            </label>
            <select
              value={campoId}
              onChange={(e) => { setCampoId(e.target.value); setSetorId(""); setIgrejaId(""); setSubunidadeId(""); }}
              className={selectCls}
            >
              <option value="">Selecione o campo...</option>
              {campos.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>

          <div>
            <label className={labelCls}>
              <span className="inline-flex items-center gap-1"><Map className="w-3 h-3" /> Setor</span>
            </label>
            <select
              value={setorId}
              onChange={(e) => { setSetorId(e.target.value); setIgrejaId(""); setSubunidadeId(""); }}
              disabled={!campoId}
              className={selectCls}
            >
              <option value="">{campoId ? "Selecione o setor..." : "Escolha o campo primeiro"}</option>
              {setores.map((s) => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
          </div>

          <div>
            <label className={labelCls}>
              <span className="inline-flex items-center gap-1"><Church className="w-3 h-3" /> Igreja</span>
            </label>
            <select
              value={igrejaId}
              onChange={(e) => { setIgrejaId(e.target.value); setSubunidadeId(""); }}
              disabled={!setorId}
              className={selectCls}
            >
              <option value="">{setorId ? "Selecione a igreja..." : "Escolha o setor primeiro"}</option>
              {igrejas.map((i) => (
                <option key={i.id} value={i.id}>{i.name}</option>
              ))}
            </select>
          </div>

          <div>
            <label className={labelCls}>Sub-unidade (opcional)</label>
            <select
              value={subunidadeId}
              onChange={(e) => setSubunidadeId(e.target.value)}
              disabled={!igrejaId || subunidades.length === 0}
              className={selectCls}
            >
              <option value="">
                {subunidades.length === 0 ? "Nenhuma — vinculado à igreja" : "Vinculado à igreja"}
              </option>
              {subunidades.map((s) => (
                <option key={s.id} value={s.id}>{s.name} ({s.type})</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      <div className="bg-iw-surface rounded-2xl border border-iw-gold shadow-sm p-6 space-y-4">
        <h3 className={sectionTitleCls}>
          <User className="w-4 h-4 text-iw-gold" />
          Professor (membro da igreja)
        </h3>
        <p className="text-xs text-iw-muted -mt-2">
          Digite a matrícula ou o nome do professor para buscar o cadastro — nome, cargo,
          telefone e a cadeia Campo/Setor/Igreja acima são preenchidos automaticamente.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <MatriculaLookup
            name="matricula"
            label="Matrícula"
            defaultValue={existing?.matricula ?? ""}
            onFound={handleMembroEncontrado}
            onClear={() => { setMemberId(""); setNome(""); setCargo(""); setTelefone(""); }}
          />

          <div>
            <label className={labelCls}>
              <span className="inline-flex items-center gap-1"><User className="w-3 h-3" /> Nome Completo *</span>
            </label>
            <input
              type="text"
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              placeholder="Nome do professor"
              className={inputCls}
              required
            />
          </div>

          <div>
            <label className={labelCls}>
              <span className="inline-flex items-center gap-1"><Briefcase className="w-3 h-3" /> Cargo</span>
            </label>
            <input
              type="text"
              value={cargo}
              onChange={(e) => setCargo(e.target.value)}
              placeholder="Ex: Professor(a)"
              className={inputCls}
            />
          </div>

          <div>
            <label className={labelCls}>
              <span className="inline-flex items-center gap-1"><Phone className="w-3 h-3" /> Telefone</span>
            </label>
            <input
              type="text"
              value={telefone}
              onChange={(e) => setTelefone(e.target.value)}
              placeholder="+55 (00) 00000-0000"
              className={inputCls}
            />
          </div>
        </div>
      </div>

      <div className="flex items-center justify-end gap-3 pt-1">
        <Link
          href="/dashboard/configuracoes/professores"
          className="px-4 py-2.5 text-sm font-semibold text-iw-muted hover:text-iw-navy border border-iw-border rounded-xl hover:border-iw-navy/30 transition-colors"
        >
          Cancelar
        </Link>
        <button
          type="submit"
          disabled={isPending}
          className="flex items-center gap-2 bg-iw-blue hover:bg-iw-navy disabled:opacity-50 text-white px-6 py-2.5 rounded-xl text-sm font-semibold transition-colors shadow-sm"
        >
          {isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : existing ? <Save className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
          {submitLabel}
        </button>
      </div>
    </form>
  );
}
