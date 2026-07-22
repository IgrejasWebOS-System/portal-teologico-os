"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Plus, Loader2, AlertTriangle, User, Phone, Briefcase, Map, Church } from "lucide-react";
import MatriculaLookup from "../../MatriculaLookup";
import { addProfessorAction, type MembroEncontrado } from "../../actions";

type SelectItem = { id: string; name: string };
type ChurchItem = { id: string; name: string; sector_id: string | null };

interface Props {
  setores: SelectItem[];
  churches: ChurchItem[];
}

const inputCls =
  "w-full bg-white border border-iw-border rounded-xl px-3 py-2.5 text-sm text-iw-navy placeholder-iw-muted focus:border-iw-blue focus:outline-none focus:ring-2 focus:ring-iw-blue/20 transition-colors";
const selectCls =
  "w-full bg-white border border-iw-border rounded-xl px-3 py-2.5 text-sm text-iw-navy focus:border-iw-blue focus:outline-none focus:ring-2 focus:ring-iw-blue/20 cursor-pointer transition-colors";
const labelCls =
  "block text-[11px] font-bold text-iw-muted uppercase tracking-wider mb-1.5";
const sectionTitleCls =
  "flex items-center gap-2 text-xs font-black text-iw-navy uppercase tracking-widest mb-4 pb-2 border-b border-iw-border";

export default function NovoProfessorForm({ setores, churches }: Props) {
  const router = useRouter();
  const [sectorId, setSectorId] = useState("");
  const [churchId, setChurchId] = useState("");
  const [memberId, setMemberId] = useState("");
  const [nome, setNome] = useState("");
  const [cargo, setCargo] = useState("");
  const [telefone, setTelefone] = useState("");
  const [error, setError] = useState("");
  const [isPending, startTransition] = useTransition();

  const igrejasDoSetor = useMemo(
    () => (sectorId ? churches.filter((c) => c.sector_id === sectorId) : churches),
    [sectorId, churches]
  );

  const handleMembroEncontrado = (membro: MembroEncontrado) => {
    setMemberId(membro.id);
    setNome(membro.full_name);
    setCargo(membro.cargo ?? "");
    setTelefone(membro.phone ?? "");
    if (membro.church_id && churches.some((c) => c.id === membro.church_id)) {
      setChurchId(membro.church_id);
    }
  };

  const handleSubmit = (fd: FormData) => {
    if (!nome.trim()) { setError("Busque a matrícula ou digite o nome do professor."); return; }
    setError("");
    fd.set("nome_completo", nome.trim());
    fd.set("cargo", cargo);
    fd.set("telefone", telefone);
    fd.set("member_id", memberId);

    startTransition(async () => {
      const res = await addProfessorAction(fd);
      if (!res.success) { setError(res.message ?? "Erro ao cadastrar."); return; }
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

      <div className="bg-iw-surface rounded-2xl border border-iw-border shadow-sm p-6 space-y-4">
        <h3 className={sectionTitleCls}>
          <Church className="w-4 h-4 text-iw-blue" />
          Setor e Igreja
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className={labelCls}>
              <span className="inline-flex items-center gap-1"><Map className="w-3 h-3" /> Setor</span>
            </label>
            <select
              value={sectorId}
              onChange={(e) => { setSectorId(e.target.value); setChurchId(""); }}
              className={selectCls}
            >
              <option value="">Todos os setores...</option>
              {setores.map((s) => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
          </div>

          <div>
            <label className={labelCls}>Igreja</label>
            <select
              name="church_id"
              value={churchId}
              onChange={(e) => setChurchId(e.target.value)}
              required
              className={selectCls}
            >
              <option value="">Selecione a igreja...</option>
              {igrejasDoSetor.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>
        </div>
        <input type="hidden" name="sector_id" value={sectorId} />
      </div>

      <div className="bg-iw-surface rounded-2xl border border-iw-border shadow-sm p-6 space-y-4">
        <h3 className={sectionTitleCls}>
          <User className="w-4 h-4 text-iw-gold" />
          Professor (membro da igreja)
        </h3>
        <p className="text-xs text-iw-muted -mt-2">
          Digite a matrícula do professor para buscar o cadastro — nome, cargo
          e telefone são preenchidos automaticamente.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <MatriculaLookup
            name="matricula"
            label="Matrícula"
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
        <a
          href="/dashboard/configuracoes/professores"
          className="px-4 py-2.5 text-sm font-semibold text-iw-muted hover:text-iw-navy border border-iw-border rounded-xl hover:border-iw-navy/30 transition-colors"
        >
          Cancelar
        </a>
        <button
          type="submit"
          disabled={isPending}
          className="flex items-center gap-2 bg-iw-blue hover:bg-iw-navy disabled:opacity-50 text-white px-6 py-2.5 rounded-xl text-sm font-semibold transition-colors shadow-sm"
        >
          {isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
          Cadastrar Professor
        </button>
      </div>
    </form>
  );
}
