"use client";

import { useMemo, useState } from "react";
import { Camera, Loader2, Save, Mail } from "lucide-react";
import { createClient } from "@/utils/supabase/client";
import { maskPhone } from "@/utils/maskPhone";
import { validarCPF } from "@/utils/cpf";

// ============================================================
// /professor/configuracoes (27/09/2026, ajustado no mesmo dia a pedido do
// Joaquim: nome, CPF, cargo, igreja e setor deixaram de ser só leitura —
// o professor edita tudo por aqui agora, junto com telefone e foto que já
// eram editáveis). Só o e-mail de login continua fora (é conta, não
// ficha — muda por "Esqueci minha senha"/definir-senha, não por aqui).
// ============================================================

const boxCls =
  "border border-iw-navy rounded-xl px-3.5 pt-1.5 pb-2 bg-white focus-within:border-iw-gold focus-within:ring-2 focus-within:ring-iw-gold/40 focus-within:bg-iw-gold/[0.06] transition-colors";
const boxLabelCls = "block text-[10px] font-extrabold text-black uppercase tracking-wider mb-0.5";
const bareCls = "w-full bg-transparent border-none p-0 text-sm text-black placeholder-black/50 focus:outline-none focus:ring-0";
const bareSelectCls = `${bareCls} cursor-pointer`;

function maskCPF(raw: string): string {
  let v = raw.replace(/\D/g, "").slice(0, 11);
  v = v.replace(/(\d{3})(\d)/, "$1.$2");
  v = v.replace(/(\d{3})(\d)/, "$1.$2");
  v = v.replace(/(\d{3})(\d{1,2})$/, "$1-$2");
  return v;
}

interface SelectItem { id: string; name: string }
interface ChurchItem { id: string; name: string; sector_id: string | null; unit_id: string | null }

interface Props {
  nomeInicial: string;
  email: string | null;
  cpfInicial: string | null;
  cargoInicial: string | null;
  sectorIdInicial: string | null;
  churchIdInicial: string | null;
  telefoneInicial: string | null;
  fotoUrlInicial: string | null;
  setores: SelectItem[];
  churches: ChurchItem[];
  cargos: SelectItem[];
  sedeUnitId: string | null;
  action: (formData: FormData) => Promise<void> | void;
}

export default function ConfiguracoesPainel({
  nomeInicial, email, cpfInicial, cargoInicial, sectorIdInicial, churchIdInicial,
  telefoneInicial, fotoUrlInicial, setores, churches, cargos, sedeUnitId, action,
}: Props) {
  const [nome, setNome] = useState(nomeInicial);
  const [cpf, setCpf] = useState(cpfInicial ?? "");
  const [cpfError, setCpfError] = useState("");
  const [cargo, setCargo] = useState(cargoInicial ?? "");
  const [telefone, setTelefone] = useState(telefoneInicial ?? "");
  const [fotoUrl, setFotoUrl] = useState(fotoUrlInicial ?? "");
  const [uploadingFoto, setUploadingFoto] = useState(false);

  const sedeChurch = useMemo(
    () => (sedeUnitId ? churches.find((c) => c.unit_id === sedeUnitId) ?? null : null),
    [sedeUnitId, churches]
  );
  const jaEraSede = !!(sedeChurch && churchIdInicial === sedeChurch.id);
  const [naSede, setNaSede] = useState(jaEraSede);
  const [sectorId, setSectorId] = useState(jaEraSede ? "" : sectorIdInicial ?? "");
  const [churchId, setChurchId] = useState(churchIdInicial ?? "");

  const setoresComuns = useMemo(
    () => setores.filter((s) => !s.name.toUpperCase().startsWith("REGIONAL")),
    [setores]
  );
  const setoresRegionais = useMemo(
    () => setores.filter((s) => s.name.toUpperCase().startsWith("REGIONAL")),
    [setores]
  );
  const igrejasDoSetor = useMemo(() => {
    if (naSede) return sedeChurch ? [sedeChurch] : [];
    if (!sectorId) return [];
    return churches.filter((c) => c.sector_id === sectorId);
  }, [naSede, sectorId, churches, sedeChurch]);

  const handleSectorChange = (value: string) => {
    if (sedeChurch && value === sedeChurch.id) {
      setNaSede(true);
      setSectorId("");
      setChurchId(sedeChurch.id);
    } else {
      setNaSede(false);
      setSectorId(value);
      setChurchId("");
    }
  };

  const checkCpf = (valor: string) => {
    const digitos = valor.replace(/\D/g, "");
    if (!digitos || digitos.length < 11) { setCpfError(""); return; }
    setCpfError(validarCPF(valor) ? "" : "CPF inválido — confira os números digitados.");
  };

  const handleFotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingFoto(true);
    try {
      const supabase = createClient();
      const ext = file.name.split(".").pop();
      const fileName = `professor-self-${Date.now()}.${ext}`;
      const { error } = await supabase.storage.from("avatars").upload(fileName, file);
      if (error) throw error;
      const { data } = supabase.storage.from("avatars").getPublicUrl(fileName);
      setFotoUrl(data.publicUrl);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "erro desconhecido";
      alert(`Erro no upload da foto: ${msg}`);
    } finally {
      setUploadingFoto(false);
    }
  };

  function handleSubmit(formData: FormData) {
    if (cpfError) return;
    formData.set("sector_id", naSede ? "" : sectorId);
    return action(formData);
  }

  return (
    <form action={handleSubmit} className="bg-iw-surface border border-iw-border rounded-2xl shadow-sm p-5 max-w-2xl space-y-4">
      <input type="hidden" name="foto_url" value={fotoUrl} />
      <input type="hidden" name="church_id" value={churchId} />

      <div className="flex items-center gap-4 pb-1">
        <div className="w-20 h-20 shrink-0 rounded-full bg-transparent border-[1.5px] border-[#E88D0C]/40 flex items-center justify-center relative overflow-hidden group hover:border-iw-blue transition-colors">
          {fotoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={fotoUrl} alt="Sua foto" className="w-full h-full object-cover" />
          ) : (
            <div className="flex flex-col items-center gap-0.5 text-black group-hover:text-black">
              {uploadingFoto ? <Loader2 className="w-5 h-5 animate-spin" /> : <Camera className="w-5 h-5" />}
            </div>
          )}
          <input type="file" accept="image/*" onChange={handleFotoUpload} className="absolute inset-0 opacity-0 cursor-pointer" />
        </div>
        <p className="text-[11px] text-black">Clique na foto pra trocar.</p>
      </div>

      <div className={boxCls}>
        <label className={boxLabelCls}>Nome completo</label>
        <input
          name="nome_completo"
          value={nome}
          onChange={(e) => setNome(e.target.value.toUpperCase())}
          className={`${bareCls} uppercase font-semibold`}
          required
        />
      </div>

      <div className="grid grid-cols-12 gap-3">
        <div className={`${boxCls} col-span-12 md:col-span-6`}>
          <label className={boxLabelCls}>
            <span className="inline-flex items-center gap-1"><Mail className="w-3 h-3" /> E-mail de login</span>
          </label>
          <p className={`${bareCls} truncate`}>{email || "—"}</p>
        </div>
        <div className={`${boxCls} col-span-12 md:col-span-6`}>
          <label className={boxLabelCls}>CPF</label>
          <input
            name="cpf"
            value={cpf}
            onChange={(e) => setCpf(maskCPF(e.target.value))}
            onBlur={(e) => checkCpf(e.target.value)}
            className={bareCls}
          />
          {cpfError && <p className="text-[11px] text-iw-error mt-0.5">{cpfError}</p>}
        </div>
      </div>

      <div className="grid grid-cols-12 gap-3">
        <div className={`${boxCls} col-span-12 md:col-span-4`}>
          <label className={boxLabelCls}>Cargo</label>
          <select name="cargo" value={cargo} onChange={(e) => setCargo(e.target.value)} className={bareSelectCls}>
            <option value="">Sem cargo</option>
            {cargos.map((c) => (<option key={c.id} value={c.name}>{c.name}</option>))}
          </select>
        </div>
        <div className={`${boxCls} col-span-12 md:col-span-4`}>
          <label className={boxLabelCls}>Setor</label>
          <select
            value={naSede ? (sedeChurch?.id ?? "") : sectorId}
            onChange={(e) => handleSectorChange(e.target.value)}
            className={bareSelectCls}
          >
            <option value="">Selecione...</option>
            {sedeChurch && <option value={sedeChurch.id}>SEDE — {sedeChurch.name}</option>}
            <optgroup label="Setor">
              {setoresComuns.map((s) => (<option key={s.id} value={s.id}>{s.name}</option>))}
            </optgroup>
            <optgroup label="Regional">
              {setoresRegionais.map((s) => (<option key={s.id} value={s.id}>{s.name}</option>))}
            </optgroup>
          </select>
        </div>
        <div className={`${boxCls} col-span-12 md:col-span-4`}>
          <label className={boxLabelCls}>Igreja</label>
          <select
            value={churchId}
            onChange={(e) => setChurchId(e.target.value)}
            disabled={!sectorId && !naSede}
            className={bareSelectCls}
          >
            <option value="">
              {naSede ? "SEDE selecionada acima" : sectorId ? "Selecione..." : "Escolha o setor primeiro"}
            </option>
            {igrejasDoSetor.map((c) => (<option key={c.id} value={c.id}>{c.name}</option>))}
          </select>
        </div>
      </div>

      <div className={boxCls}>
        <label className={boxLabelCls}>Telefone</label>
        <input
          name="telefone"
          value={telefone}
          onChange={(e) => setTelefone(maskPhone(e.target.value))}
          placeholder="(00) 00000-0000"
          className={bareCls}
        />
      </div>

      <button
        type="submit"
        disabled={!!cpfError}
        className="flex items-center gap-2 bg-iw-navy hover:opacity-90 disabled:opacity-50 text-white font-bold text-sm px-5 py-2.5 rounded-xl transition-opacity"
      >
        <Save className="w-4 h-4" /> Salvar
      </button>
    </form>
  );
}
