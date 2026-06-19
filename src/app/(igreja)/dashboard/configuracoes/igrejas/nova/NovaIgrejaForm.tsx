"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Plus, Loader2, AlertTriangle } from "lucide-react";
import { createClient } from "@/utils/supabase/client";

type SelectItem = { id: string; name: string };

interface Props {
  setores: SelectItem[];
  igrejasMae: SelectItem[];
}

const inputCls =
  "w-full bg-white border border-iw-border rounded-xl px-4 py-2.5 text-sm text-iw-navy placeholder-iw-muted focus:border-iw-blue focus:outline-none focus:ring-2 focus:ring-iw-blue/20 transition-colors";
const selectCls =
  "w-full bg-white border border-iw-border rounded-xl px-4 py-2.5 text-sm text-iw-navy focus:border-iw-blue focus:outline-none cursor-pointer";
const labelCls =
  "block text-xs font-bold text-iw-muted uppercase tracking-wider mb-1.5";

export default function NovaIgrejaForm({ setores, igrejasMae }: Props) {
  const router = useRouter();
  const [churchType, setChurchType] = useState("CHURCH");
  const [error, setError] = useState("");
  const [isPending, startTransition] = useTransition();

  const handleSubmit = (fd: FormData) => {
    startTransition(async () => {
      setError("");
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { setError("Não autenticado."); return; }

      const { data: profile } = await supabase
        .from("user_profiles")
        .select("church_id")
        .eq("id", user.id)
        .single();

      const payload: Record<string, unknown> = {
        name: (fd.get("name") as string)?.trim().toUpperCase(),
        church_type: fd.get("church_type") as string,
        sector_id:   fd.get("sector_id")   as string || null,
        parent_id:   fd.get("parent_id")   as string || null,
        pastor_name: fd.get("pastor_name") as string || null,
        phone:       fd.get("phone")       as string || null,
        church_id:   profile?.church_id ?? null,
      };

      const { error: dbError } = await supabase.from("churches").insert(payload);
      if (dbError) { setError(dbError.message); return; }

      router.push("/dashboard/configuracoes/igrejas");
      router.refresh();
    });
  };

  return (
    <form action={handleSubmit} className="bg-iw-surface rounded-2xl border border-iw-border shadow-sm p-6 space-y-5">
      {error && (
        <div className="flex items-center gap-2 text-iw-error text-sm bg-iw-error-bg border border-iw-error/20 px-4 py-3 rounded-xl">
          <AlertTriangle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Tipo */}
      <div>
        <label className={labelCls}>Tipo de Congregação</label>
        <select
          name="church_type"
          value={churchType}
          onChange={(e) => setChurchType(e.target.value)}
          className={selectCls}
        >
          <option value="CHURCH">Igreja / Congregação</option>
          <option value="SUB">Sub-congregação</option>
          <option value="CELL">Célula</option>
        </select>
      </div>

      {/* Nome */}
      <div>
        <label className={labelCls}>Nome da Congregação *</label>
        <input
          name="name"
          type="text"
          required
          placeholder="Ex: AD Central, Congregação Vale da Bênção..."
          className={inputCls}
        />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Setor */}
        <div>
          <label className={labelCls}>Setor Responsável</label>
          <select name="sector_id" className={selectCls}>
            <option value="">Selecione um Setor...</option>
            {setores.map((s) => (
              <option key={s.id} value={s.id}>{s.name}</option>
            ))}
          </select>
        </div>

        {/* Igreja-mãe (para sub e células) */}
        {(churchType === "SUB" || churchType === "CELL") && (
          <div>
            <label className={labelCls}>Igreja Mãe</label>
            <select name="parent_id" className={selectCls}>
              <option value="">Selecione...</option>
              {igrejasMae.map((i) => (
                <option key={i.id} value={i.id}>{i.name}</option>
              ))}
            </select>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Pastor/Dirigente */}
        <div>
          <label className={labelCls}>Pastor / Dirigente</label>
          <input
            name="pastor_name"
            type="text"
            placeholder="Nome do responsável"
            className={inputCls}
          />
        </div>

        {/* Telefone */}
        <div>
          <label className={labelCls}>Telefone</label>
          <input
            name="phone"
            type="text"
            placeholder="+55 (00) 00000-0000"
            className={inputCls}
          />
        </div>
      </div>

      {/* Ações */}
      <div className="flex items-center justify-end gap-3 pt-2 border-t border-iw-border">
        <a
          href="/dashboard/configuracoes/igrejas"
          className="px-4 py-2.5 text-sm font-semibold text-iw-muted hover:text-iw-navy border border-iw-border rounded-xl hover:border-iw-navy/30 transition-colors"
        >
          Cancelar
        </a>
        <button
          type="submit"
          disabled={isPending}
          className="flex items-center gap-2 bg-iw-blue hover:bg-iw-navy disabled:opacity-50 text-white px-6 py-2.5 rounded-xl text-sm font-semibold transition-colors shadow-sm"
        >
          {isPending ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Plus className="w-4 h-4" />
          )}
          Cadastrar Igreja
        </button>
      </div>
    </form>
  );
}
