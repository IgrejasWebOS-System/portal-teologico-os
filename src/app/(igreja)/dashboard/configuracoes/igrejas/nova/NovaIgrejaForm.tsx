"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  Plus, Loader2, AlertTriangle,
  Building2, MapPin, User, Phone, Map,
} from "lucide-react";
import { createClient } from "@/utils/supabase/client";
import MatriculaLookup from "../../MatriculaLookup";
import type { MembroEncontrado } from "../../actions";

type SelectItem = { id: string; name: string };

interface Props {
  setores: SelectItem[];
  igrejasMae: SelectItem[];
  /** Quando informado, trava o tipo de congregação e esconde o seletor
   *  (usado pelos atalhos de Sub-congregações e Células). */
  lockedType?: "CHURCH" | "SUB" | "CELL";
  /** Rótulo do botão de submit e destino de "Cancelar"/redirect pós-submit. */
  backHref?: string;
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

const TYPE_TITLE: Record<string, string> = {
  CHURCH: "Igreja",
  SUB: "Sub-congregação",
  CELL: "Célula",
};

export default function NovaIgrejaForm({
  setores,
  igrejasMae,
  lockedType,
  backHref = "/dashboard/configuracoes/igrejas",
  submitLabel,
}: Props) {
  const router = useRouter();
  const [churchType, setChurchType] = useState<string>(lockedType ?? "CHURCH");
  const [pastorName, setPastorName] = useState("");
  const [pastorPhone, setPastorPhone] = useState("");
  const [pastorRole, setPastorRole] = useState("");
  const [error, setError] = useState("");
  const [isPending, startTransition] = useTransition();

  const handleMembroEncontrado = (membro: MembroEncontrado) => {
    setPastorName(membro.full_name);
    setPastorPhone(membro.phone ?? "");
    setPastorRole(membro.cargo ?? "");
  };

  const handleSubmit = (fd: FormData) => {
    startTransition(async () => {
      setError("");
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { setError("Não autenticado."); return; }

      const payload: Record<string, unknown> = {
        // Identificação
        name:              (fd.get("name") as string)?.trim().toUpperCase() || null,
        church_type:       lockedType ?? (fd.get("church_type") as string),
        sector_id:         (fd.get("sector_id") as string)  || null,
        parent_id:         (fd.get("parent_id") as string)  || null,
        // Liderança e contato
        pastor_matricula:  (fd.get("pastor_matricula") as string) || null,
        pastor_name:       pastorName.trim() || null,
        pastor_role:       pastorRole || null,
        pastor_phone:      pastorPhone || null,
        church_phone:      (fd.get("church_phone") as string) || null,
        // Localização
        zip_code:          (fd.get("zip_code") as string) || null,
        address:           (fd.get("address") as string)?.trim() || null,
        address_number:    (fd.get("address_number") as string) || null,
        address_complement:(fd.get("address_complement") as string) || null,
        neighborhood:      (fd.get("neighborhood") as string)?.trim() || null,
        city:              (fd.get("city") as string)?.trim() || null,
        state:             (fd.get("state") as string)?.toUpperCase() || null,
      };

      if (!payload.name) { setError("Nome da congregação é obrigatório."); return; }

      const { error: dbError } = await supabase.from("churches").insert(payload);
      if (dbError) { setError(dbError.message); return; }

      router.push(backHref);
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

      {/* ── IDENTIFICAÇÃO ── */}
      <div className="bg-iw-surface rounded-2xl border border-iw-border shadow-sm p-6 space-y-4">
        <h3 className={sectionTitleCls}>
          <Building2 className="w-4 h-4 text-iw-blue" />
          Identificação
        </h3>

        {/* Tipo (travado nos atalhos de Sub-congregações/Células) */}
        {lockedType ? (
          <input type="hidden" name="church_type" value={lockedType} />
        ) : (
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
        )}

        {/* Nome */}
        <div>
          <label className={labelCls}>
            Nome d{lockedType === "CELL" ? "a Célula" : lockedType === "SUB" ? "a Sub-congregação" : "a Congregação"} *
          </label>
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

          {/* Igreja-mãe (apenas para sub e células) */}
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
      </div>

      {/* ── LIDERANÇA E CONTATO ── */}
      <div className="bg-iw-surface rounded-2xl border border-iw-border shadow-sm p-6 space-y-4">
        <h3 className={sectionTitleCls}>
          <User className="w-4 h-4 text-iw-gold" />
          Liderança e Contato
        </h3>

        <p className="text-xs text-iw-muted -mt-2">
          Digite a matrícula e saia do campo (ou tecle Enter) para buscar o
          responsável no cadastro de membros — nome, cargo e telefone são
          preenchidos automaticamente.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Matrícula (busca real) */}
          <MatriculaLookup
            name="pastor_matricula"
            label="Matrícula"
            onFound={handleMembroEncontrado}
            onClear={() => { setPastorName(""); setPastorPhone(""); setPastorRole(""); }}
          />

          {/* Pastor / Dirigente */}
          <div className="sm:col-span-1 lg:col-span-1">
            <label className={labelCls}>
              <span className="inline-flex items-center gap-1">
                <User className="w-3 h-3" /> Pastor / Dirigente
              </span>
            </label>
            <input
              name="pastor_name"
              type="text"
              value={pastorName}
              onChange={(e) => setPastorName(e.target.value)}
              placeholder="Nome do responsável"
              className={inputCls}
            />
            {pastorRole && (
              <p className="mt-1 text-[11px] text-iw-muted">Cargo: {pastorRole}</p>
            )}
          </div>

          {/* Tel. Dirigente */}
          <div>
            <label className={labelCls}>
              <span className="inline-flex items-center gap-1">
                <Phone className="w-3 h-3" /> Tel. Dirigente
              </span>
            </label>
            <input
              name="pastor_phone"
              type="text"
              value={pastorPhone}
              onChange={(e) => setPastorPhone(e.target.value)}
              placeholder="+55 (00) 00000-0000"
              className={inputCls}
            />
          </div>

          {/* Tel. Igreja */}
          <div>
            <label className={labelCls}>
              <span className="inline-flex items-center gap-1">
                <Phone className="w-3 h-3" /> Tel. Igreja
              </span>
            </label>
            <input
              name="church_phone"
              type="text"
              placeholder="+55 (00) 0000-0000"
              className={inputCls}
            />
          </div>
        </div>
      </div>

      {/* ── LOCALIZAÇÃO ── */}
      <div className="bg-iw-surface rounded-2xl border border-iw-border shadow-sm p-6 space-y-4">
        <h3 className={sectionTitleCls}>
          <MapPin className="w-4 h-4 text-iw-success" />
          Localização
        </h3>

        {/* Linha 1: CEP + Endereço + Número */}
        <div className="grid grid-cols-12 gap-3">
          <div className="col-span-12 sm:col-span-3">
            <label className={labelCls}>
              <span className="inline-flex items-center gap-1">
                <MapPin className="w-3 h-3" /> CEP
              </span>
            </label>
            <input
              name="zip_code"
              type="text"
              placeholder="00000-000"
              maxLength={9}
              className={inputCls}
            />
          </div>

          <div className="col-span-12 sm:col-span-7">
            <label className={labelCls}>Endereço (Logradouro)</label>
            <input
              name="address"
              type="text"
              placeholder="Rua, Avenida, etc."
              className={inputCls}
            />
          </div>

          <div className="col-span-12 sm:col-span-2">
            <label className={labelCls}>Número</label>
            <input
              name="address_number"
              type="text"
              placeholder="Ex: 123"
              className={inputCls}
            />
          </div>
        </div>

        {/* Linha 2: Complemento + Bairro + Cidade + UF */}
        <div className="grid grid-cols-12 gap-3">
          <div className="col-span-12 sm:col-span-3">
            <label className={labelCls}>Complemento</label>
            <input
              name="address_complement"
              type="text"
              placeholder="Bloco, Sala..."
              className={inputCls}
            />
          </div>

          <div className="col-span-12 sm:col-span-3">
            <label className={labelCls}>Bairro</label>
            <input
              name="neighborhood"
              type="text"
              placeholder="Ex: Centro"
              className={inputCls}
            />
          </div>

          <div className="col-span-12 sm:col-span-4">
            <label className={labelCls}>
              <span className="inline-flex items-center gap-1">
                <Map className="w-3 h-3" /> Cidade
              </span>
            </label>
            <input
              name="city"
              type="text"
              placeholder="Ex: Brasília"
              className={inputCls}
            />
          </div>

          <div className="col-span-12 sm:col-span-2">
            <label className={labelCls}>UF</label>
            <input
              name="state"
              type="text"
              placeholder="DF"
              maxLength={2}
              className={`${inputCls} uppercase`}
            />
          </div>
        </div>
      </div>

      {/* ── AÇÕES ── */}
      <div className="flex items-center justify-end gap-3 pt-1">
        <a
          href={backHref}
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
          {submitLabel ?? `Cadastrar ${TYPE_TITLE[lockedType ?? "CHURCH"]}`}
        </button>
      </div>
    </form>
  );
}
