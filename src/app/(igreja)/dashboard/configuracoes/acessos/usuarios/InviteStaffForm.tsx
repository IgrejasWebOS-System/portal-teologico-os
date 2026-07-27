"use client";

import { useState, useTransition } from "react";
import { UserPlus, CheckCircle2, AlertTriangle, Search, Loader2, Hash, User } from "lucide-react";
import {
  inviteStaffAction,
  buscarMembroPorMatriculaAction,
  buscarMembroPorNomeAction,
  type MembroEncontrado,
} from "../../actions";
import { ancestryChain, type UnitNode } from "../../unitsChain";

type UnitOption = UnitNode;
type ChurchLink = { id: string; unit_id: string | null };

const NIVEL_LABEL: Record<string, string> = {
  "0": "0 — Super-Master (sem unidade)",
  "1": "1 — Master de Campo",
  "2": "2 — Admin de Sede",
  "3": "3 — Admin de Setor",
  "4": "4 — Usuário Local",
};

const inputCls =
  "w-full bg-white border border-iw-border rounded-xl px-3 py-2.5 text-sm text-iw-navy focus:border-iw-blue focus:outline-none focus:ring-2 focus:ring-iw-blue/20";
const labelCls = "block text-[11px] font-bold text-iw-muted uppercase tracking-wider mb-1.5";

export default function InviteStaffForm({ units, churches }: { units: UnitOption[]; churches: ChurchLink[] }) {
  const [isPending, startTransition] = useTransition();
  const [result, setResult] = useState<{ success: boolean; message?: string } | null>(null);

  const [matricula, setMatricula] = useState("");
  const [nomeBusca, setNomeBusca] = useState("");
  const [buscando, setBuscando] = useState(false);
  const [resultadosNome, setResultadosNome] = useState<MembroEncontrado[]>([]);
  const [buscaErro, setBuscaErro] = useState("");
  const [membro, setMembro] = useState<MembroEncontrado | null>(null);

  const [email, setEmail] = useState("");
  const [fullName, setFullName] = useState("");

  const selecionarMembro = (m: MembroEncontrado) => {
    setMembro(m);
    setResultadosNome([]);
    setFullName(m.full_name);
    setEmail(m.email ?? "");
  };

  const buscarPorMatricula = async () => {
    if (!matricula.trim()) return;
    setBuscando(true);
    setBuscaErro("");
    const res = await buscarMembroPorMatriculaAction(matricula.trim());
    setBuscando(false);
    if (res.success && res.data) {
      selecionarMembro(res.data);
    } else {
      setBuscaErro(res.message ?? "Não encontrado.");
      setMembro(null);
    }
  };

  const buscarPorNome = async () => {
    if (nomeBusca.trim().length < 3) return;
    setBuscando(true);
    setBuscaErro("");
    const res = await buscarMembroPorNomeAction(nomeBusca.trim());
    setBuscando(false);
    if (res.success && res.data) {
      if (res.data.length === 1) {
        selecionarMembro(res.data[0]);
      } else {
        setResultadosNome(res.data);
        setMembro(null);
      }
    } else {
      setBuscaErro(res.message ?? "Não encontrado.");
      setResultadosNome([]);
      setMembro(null);
    }
  };

  const cadeia = (() => {
    if (!membro?.church_id) return null;
    const church = churches.find((c) => c.id === membro.church_id);
    if (!church?.unit_id) return null;
    const chain = ancestryChain(church.unit_id, units);
    return {
      ministerio: chain.find((u) => u.type === "CAMPO")?.name ?? "—",
      setor: chain.find((u) => u.type === "SETOR")?.name ?? "—",
      igreja: chain[chain.length - 1]?.name ?? "—",
    };
  })();

  const handleSubmit = (formData: FormData) => {
    setResult(null);
    formData.set("email", email);
    formData.set("full_name", fullName);
    startTransition(async () => {
      const res = await inviteStaffAction(formData);
      setResult(res);
      if (res.success) {
        setMembro(null);
        setMatricula("");
        setNomeBusca("");
        setEmail("");
        setFullName("");
      }
    });
  };

  return (
    <div className="bg-iw-surface rounded-2xl border border-iw-gold p-5 shadow-sm">
      <div className="flex items-center gap-2.5 mb-4">
        <div className="w-8 h-8 rounded-lg bg-iw-gold/10 flex items-center justify-center shrink-0">
          <UserPlus className="w-4 h-4 text-iw-gold" />
        </div>
        <div>
          <h2 className="text-sm font-black text-iw-navy">Convidar novo operador</h2>
          <p className="text-[11px] text-iw-muted">
            Busque por matrícula ou nome para preencher automaticamente os dados de quem já
            é membro. Se for alguém de fora do ministério (ex: um palestrante), digite os
            dados manualmente.
          </p>
        </div>
      </div>

      {result && (
        <div
          className={`flex items-start gap-2 text-sm font-bold px-3.5 py-3 rounded-xl border-2 mb-4 ${
            result.success
              ? "bg-iw-blue/10 text-iw-blue border-iw-blue/40"
              : "bg-iw-error-bg text-iw-error border-iw-error/50"
          }`}
        >
          {result.success ? (
            <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
          ) : (
            <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
          )}
          <span>{result.message ?? (result.success ? "Feito." : "Não foi possível concluir.")}</span>
        </div>
      )}

      <div className="bg-iw-bg rounded-xl border border-iw-border p-4 mb-4 space-y-3">
        <div className="grid sm:grid-cols-2 gap-3">
          <div>
            <label className={labelCls}>
              <span className="inline-flex items-center gap-1"><Hash className="w-3 h-3" /> Matrícula</span>
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={matricula}
                onChange={(e) => setMatricula(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); buscarPorMatricula(); } }}
                placeholder="Ex: 12345"
                className={inputCls}
              />
              <button
                type="button"
                onClick={buscarPorMatricula}
                disabled={buscando}
                className="shrink-0 w-10 h-[42px] flex items-center justify-center bg-white hover:bg-iw-border border border-iw-border rounded-xl text-iw-navy transition-colors"
              >
                {buscando ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <div>
            <label className={labelCls}>
              <span className="inline-flex items-center gap-1"><User className="w-3 h-3" /> ou nome</span>
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={nomeBusca}
                onChange={(e) => setNomeBusca(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); buscarPorNome(); } }}
                placeholder="Nome do professor/operador"
                className={inputCls}
              />
              <button
                type="button"
                onClick={buscarPorNome}
                disabled={buscando}
                className="shrink-0 w-10 h-[42px] flex items-center justify-center bg-white hover:bg-iw-border border border-iw-border rounded-xl text-iw-navy transition-colors"
              >
                {buscando ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
              </button>
            </div>
          </div>
        </div>

        {buscaErro && <p className="text-iw-error text-xs font-medium">{buscaErro}</p>}

        {resultadosNome.length > 0 && (
          <div className="space-y-1">
            <p className="text-[11px] font-bold text-iw-muted uppercase tracking-wider">Vários resultados — escolha um:</p>
            {resultadosNome.map((m) => (
              <button
                key={m.id}
                type="button"
                onClick={() => selecionarMembro(m)}
                className="w-full text-left text-sm px-3 py-2 rounded-lg border border-iw-border bg-white hover:border-iw-blue transition-colors"
              >
                {m.full_name} {m.registration_number ? `— Matrícula ${m.registration_number}` : ""}
              </button>
            ))}
          </div>
        )}

        {membro && (
          <div className="bg-white rounded-xl border border-iw-blue/40 px-3.5 py-3 space-y-1.5">
            <p className="text-sm font-bold text-iw-navy">
              {membro.full_name} {membro.registration_number ? `— Matrícula ${membro.registration_number}` : ""}
            </p>
            <table className="w-full text-xs">
              <tbody>
                <tr>
                  <td className="text-iw-muted py-0.5">Ministério</td>
                  <td className="text-right text-iw-navy font-medium">{cadeia?.ministerio ?? "—"}</td>
                </tr>
                <tr>
                  <td className="text-iw-muted py-0.5">Setor</td>
                  <td className="text-right text-iw-navy font-medium">{cadeia?.setor ?? "—"}</td>
                </tr>
                <tr>
                  <td className="text-iw-muted py-0.5">Igreja / Sub-unidade</td>
                  <td className="text-right text-iw-navy font-medium">{cadeia?.igreja ?? "—"}</td>
                </tr>
                <tr>
                  <td className="text-iw-muted py-0.5">Telefone</td>
                  <td className="text-right text-iw-navy font-medium">{membro.phone ?? "—"}</td>
                </tr>
              </tbody>
            </table>
          </div>
        )}
      </div>

      <form action={handleSubmit} className="grid sm:grid-cols-2 gap-3">
        <div>
          <label className={labelCls}>
            E-mail de acesso {!membro?.email && membro && <span className="text-iw-warning">— não encontrado, digite</span>}
          </label>
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className={inputCls}
            placeholder="pessoa@exemplo.com"
          />
        </div>

        <div>
          <label className={labelCls}>Nome completo</label>
          <input
            type="text"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            className={inputCls}
            placeholder="Opcional"
          />
        </div>

        <div>
          <label className={labelCls}>Nível de acesso</label>
          <select
            name="level"
            defaultValue="4"
            className="w-full bg-white border border-iw-border rounded-xl px-3 py-2.5 text-sm text-iw-navy focus:border-iw-blue focus:outline-none cursor-pointer"
          >
            {Object.entries(NIVEL_LABEL).map(([value, label]) => (
              <option key={value} value={value}>{label}</option>
            ))}
          </select>
        </div>

        <div>
          <label className={labelCls}>Unidade (Campo/Sede/Setor/Igreja)</label>
          <select
            name="unit_id"
            defaultValue=""
            className="w-full bg-white border border-iw-border rounded-xl px-3 py-2.5 text-sm text-iw-navy focus:border-iw-blue focus:outline-none cursor-pointer"
          >
            <option value="">— Nenhuma (só p/ nível 0) —</option>
            {units.map((u) => (
              <option key={u.id} value={u.id}>{u.type} · {u.name}</option>
            ))}
          </select>
        </div>

        <div className="sm:col-span-2">
          <label className={labelCls}>Rótulo do papel (opcional)</label>
          <input
            type="text"
            name="role_title"
            className={inputCls}
            placeholder="Ex: secretário, tesoureiro — só informativo, não afeta o acesso"
          />
        </div>

        <div className="sm:col-span-2">
          <button
            type="submit"
            disabled={isPending}
            className="inline-flex items-center gap-2 bg-iw-navy text-white text-xs font-bold px-4 py-2.5 rounded-xl hover:bg-iw-navy/90 transition-colors disabled:opacity-60"
          >
            <UserPlus className="w-3.5 h-3.5" />
            {isPending ? "Enviando..." : "Enviar convite"}
          </button>
        </div>
      </form>
    </div>
  );
}
