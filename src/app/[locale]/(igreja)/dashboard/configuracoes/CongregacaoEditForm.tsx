"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  Save, Loader2, AlertTriangle,
  Building2, MapPin, User, Phone, Map,
} from "lucide-react";
import { createClient } from "@/utils/supabase/client";
import { aplicarMaiusculaNoEvento } from "@/utils/uppercaseInput";
import MatriculaLookup from "./MatriculaLookup";
import type { MembroEncontrado } from "./actions";

type SelectItem = { id: string; name: string };

export type CongregacaoExistente = {
  id: string;
  unit_id: string | null;
  name: string;
  church_type: string | null;
  sector_id: string | null;
  parent_id: string | null;
  pastor_matricula: string | null;
  pastor_name: string | null;
  pastor_role: string | null;
  pastor_phone: string | null;
  church_phone: string | null;
  zip_code: string | null;
  address: string | null;
  address_number: string | null;
  address_complement: string | null;
  neighborhood: string | null;
  city: string | null;
  state: string | null;
};

interface Props {
  existing: CongregacaoExistente;
  setores: SelectItem[];
  igrejasMae: SelectItem[];
  lockedType?: "CHURCH" | "SUB" | "PONTO" | "CELL";
  backHref?: string;
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
  PONTO: "Ponto de Pregação",
  CELL: "Célula",
};

export default function CongregacaoEditForm({
  existing,
  setores,
  igrejasMae,
  lockedType,
  backHref = "/dashboard/configuracoes/igrejas",
}: Props) {
  const router = useRouter();
  const churchType = lockedType ?? (existing.church_type as string) ?? "CHURCH";
  const [pastorName, setPastorName] = useState(existing.pastor_name ?? "");
  const [pastorPhone, setPastorPhone] = useState(existing.pastor_phone ?? "");
  const [pastorRole, setPastorRole] = useState(existing.pastor_role ?? "");
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
        name:               (fd.get("name") as string)?.trim().toUpperCase() || null,
        sector_id:          (fd.get("sector_id") as string) || null,
        parent_id:          (fd.get("parent_id") as string) || null,
        pastor_matricula:   (fd.get("pastor_matricula") as string) || null,
        pastor_name:        pastorName.trim() || null,
        pastor_role:        pastorRole || null,
        pastor_phone:       pastorPhone || null,
        church_phone:       (fd.get("church_phone") as string) || null,
        zip_code:           (fd.get("zip_code") as string) || null,
        address:            (fd.get("address") as string)?.trim() || null,
        address_number:     (fd.get("address_number") as string) || null,
        address_complement: (fd.get("address_complement") as string) || null,
        neighborhood:       (fd.get("neighborhood") as string)?.trim() || null,
        city:               (fd.get("city") as string)?.trim() || null,
        state:              (fd.get("state") as string)?.toUpperCase() || null,
      };

      if (!payload.name) { setError("Nome da congregação é obrigatório."); return; }

      const { error: dbError } = await supabase
        .from("churches")
        .update(payload)
        .eq("id", existing.id);
      if (dbError) { setError(dbError.message); return; }

      // Mantém o nome da unit (árvore de território) em sincronia, se existir.
      if (existing.unit_id) {
        await supabase.from("units").update({ name: payload.name }).eq("id", existing.unit_id);
      }

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

        <div>
          <label className={labelCls}>
            Nome d{churchType === "CELL" ? "a Célula" : churchType === "SUB" ? "a Sub-congregação" : churchType === "PONTO" ? "o Ponto de Pregação" : "a Congregação"} *
          </label>
          <input
            name="name"
            type="text"
            required
            defaultValue={existing.name}
            onChange={aplicarMaiusculaNoEvento}
            className={`${inputCls} uppercase`}
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className={labelCls}>Setor Responsável</label>
            <select name="sector_id" defaultValue={existing.sector_id ?? ""} className={selectCls}>
              <option value="">Selecione um Setor...</option>
              {setores.map((s) => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
          </div>

          {(churchType === "SUB" || churchType === "PONTO" || churchType === "CELL") && (
            <div>
              <label className={labelCls}>Igreja Mãe</label>
              <select name="parent_id" defaultValue={existing.parent_id ?? ""} className={selectCls}>
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
          <MatriculaLookup
            name="pastor_matricula"
            label="Matrícula"
            defaultValue={existing.pastor_matricula ?? ""}
            onFound={handleMembroEncontrado}
            onClear={() => { setPastorName(""); setPastorPhone(""); setPastorRole(""); }}
          />

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
              onChange={(e) => setPastorName(e.target.value.toUpperCase())}
              placeholder="Nome do responsável"
              className={`${inputCls} uppercase`}
            />
            {pastorRole && (
              <p className="mt-1 text-[11px] text-iw-muted">Cargo: {pastorRole}</p>
            )}
          </div>

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

          <div>
            <label className={labelCls}>
              <span className="inline-flex items-center gap-1">
                <Phone className="w-3 h-3" /> Tel. Igreja
              </span>
            </label>
            <input
              name="church_phone"
              type="text"
              defaultValue={existing.church_phone ?? ""}
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
              defaultValue={existing.zip_code ?? ""}
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
              defaultValue={existing.address ?? ""}
              placeholder="Rua, Avenida, etc."
              onChange={aplicarMaiusculaNoEvento}
              className={`${inputCls} uppercase`}
            />
          </div>

          <div className="col-span-12 sm:col-span-2">
            <label className={labelCls}>Número</label>
            <input
              name="address_number"
              type="text"
              defaultValue={existing.address_number ?? ""}
              placeholder="Ex: 123"
              onChange={aplicarMaiusculaNoEvento}
              className={`${inputCls} uppercase`}
            />
          </div>
        </div>

        <div className="grid grid-cols-12 gap-3">
          <div className="col-span-12 sm:col-span-3">
            <label className={labelCls}>Complemento</label>
            <input
              name="address_complement"
              type="text"
              defaultValue={existing.address_complement ?? ""}
              placeholder="Bloco, Sala..."
              onChange={aplicarMaiusculaNoEvento}
              className={`${inputCls} uppercase`}
            />
          </div>

          <div className="col-span-12 sm:col-span-3">
            <label className={labelCls}>Bairro</label>
            <input
              name="neighborhood"
              type="text"
              defaultValue={existing.neighborhood ?? ""}
              placeholder="Ex: Centro"
              onChange={aplicarMaiusculaNoEvento}
              className={`${inputCls} uppercase`}
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
              defaultValue={existing.city ?? ""}
              placeholder="Ex: Brasília"
              onChange={aplicarMaiusculaNoEvento}
              className={`${inputCls} uppercase`}
            />
          </div>

          <div className="col-span-12 sm:col-span-2">
            <label className={labelCls}>UF</label>
            <input
              name="state"
              type="text"
              defaultValue={existing.state ?? ""}
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
          {isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          Salvar {TYPE_TITLE[churchType]}
        </button>
      </div>
    </form>
  );
}
