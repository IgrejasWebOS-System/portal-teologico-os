"use client";

import { useMemo, useState } from "react";
import { Camera, Loader2, Save, Mail, FileText } from "lucide-react";
import { createClient } from "@/utils/supabase/client";
import { maskPhone } from "@/utils/maskPhone";
import { validarCPF } from "@/utils/cpf";
import { ESTADOS_BR } from "@/utils/estadosBrasil";

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

interface FichaCompleta {
  rg: string | null;
  rg_orgao_emissor: string | null;
  rg_uf: string | null;
  data_nascimento: string | null;
  genero: string | null;
  estado_civil: string | null;
  escolaridade: string | null;
  profissao: string | null;
  naturalidade_cidade: string | null;
  naturalidade_estado: string | null;
  nome_conjuge: string | null;
  nome_mae: string | null;
  nome_pai: string | null;
  cep: string | null;
  endereco: string | null;
  endereco_numero: string | null;
  endereco_complemento: string | null;
  bairro: string | null;
  cidade: string | null;
  estado: string | null;
}

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
  // 29/09/2026, pedido do Joaquim: professor edita a ficha completa
  // (mesmos campos da secretaria), não só nome/CPF/cargo/setor/igreja.
  fichaInicial: FichaCompleta;
  generos: SelectItem[];
  estadosCivis: SelectItem[];
  escolaridades: SelectItem[];
  profissoes: SelectItem[];
}

export default function ConfiguracoesPainel({
  nomeInicial, email, cpfInicial, cargoInicial, sectorIdInicial, churchIdInicial,
  telefoneInicial, fotoUrlInicial, setores, churches, cargos, sedeUnitId, action,
  fichaInicial, generos, estadosCivis, escolaridades, profissoes,
}: Props) {
  const [nome, setNome] = useState(nomeInicial);
  const [cpf, setCpf] = useState(cpfInicial ?? "");
  const [cpfError, setCpfError] = useState("");
  const [cargo, setCargo] = useState(cargoInicial ?? "");
  const [telefone, setTelefone] = useState(telefoneInicial ?? "");
  const [fotoUrl, setFotoUrl] = useState(fotoUrlInicial ?? "");
  const [uploadingFoto, setUploadingFoto] = useState(false);

  const [rg, setRg] = useState(fichaInicial.rg ?? "");
  const [rgOrgaoEmissor, setRgOrgaoEmissor] = useState(fichaInicial.rg_orgao_emissor ?? "");
  const [rgUf, setRgUf] = useState(fichaInicial.rg_uf ?? "");
  const [dataNascimento, setDataNascimento] = useState(fichaInicial.data_nascimento ?? "");
  const [genero, setGenero] = useState(fichaInicial.genero ?? "");
  const [estadoCivil, setEstadoCivil] = useState(fichaInicial.estado_civil ?? "");
  const [escolaridade, setEscolaridade] = useState(fichaInicial.escolaridade ?? "");
  const [profissao, setProfissao] = useState(fichaInicial.profissao ?? "");
  const [naturalidadeCidade, setNaturalidadeCidade] = useState(fichaInicial.naturalidade_cidade ?? "");
  const [naturalidadeEstado, setNaturalidadeEstado] = useState(fichaInicial.naturalidade_estado ?? "");
  const [nomeConjuge, setNomeConjuge] = useState(fichaInicial.nome_conjuge ?? "");
  const [nomeMae, setNomeMae] = useState(fichaInicial.nome_mae ?? "");
  const [nomePai, setNomePai] = useState(fichaInicial.nome_pai ?? "");
  const [cep, setCep] = useState(fichaInicial.cep ?? "");
  const [endereco, setEndereco] = useState(fichaInicial.endereco ?? "");
  const [enderecoNumero, setEnderecoNumero] = useState(fichaInicial.endereco_numero ?? "");
  const [enderecoComplemento, setEnderecoComplemento] = useState(fichaInicial.endereco_complemento ?? "");
  const [bairro, setBairro] = useState(fichaInicial.bairro ?? "");
  const [cidade, setCidade] = useState(fichaInicial.cidade ?? "");
  const [estado, setEstado] = useState(fichaInicial.estado ?? "");

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

      <div className="pt-2 border-t border-iw-border space-y-4">
        <div className="flex items-center gap-2">
          <FileText className="w-4 h-4 text-iw-gold" />
          <h2 className="text-sm font-black text-black">Ficha completa</h2>
        </div>

        <div className="grid grid-cols-12 gap-3">
          <div className={`${boxCls} col-span-6 md:col-span-3`}>
            <label className={boxLabelCls}>RG</label>
            <input name="rg" value={rg} onChange={(e) => setRg(e.target.value)} className={bareCls} />
          </div>
          <div className={`${boxCls} col-span-6 md:col-span-3`}>
            <label className={boxLabelCls}>Órgão emissor</label>
            <input
              name="rg_orgao_emissor"
              value={rgOrgaoEmissor}
              onChange={(e) => setRgOrgaoEmissor(e.target.value.toUpperCase())}
              className={`${bareCls} uppercase`}
            />
          </div>
          <div className={`${boxCls} col-span-6 md:col-span-3`}>
            <label className={boxLabelCls}>UF do RG</label>
            <input
              name="rg_uf"
              value={rgUf}
              maxLength={2}
              onChange={(e) => setRgUf(e.target.value.toUpperCase())}
              className={`${bareCls} uppercase`}
            />
          </div>
          <div className={`${boxCls} col-span-6 md:col-span-3`}>
            <label className={boxLabelCls}>Nascimento</label>
            <input
              type="date"
              name="data_nascimento"
              value={dataNascimento}
              onChange={(e) => setDataNascimento(e.target.value)}
              className={bareCls}
            />
          </div>
        </div>

        <div className="grid grid-cols-12 gap-3">
          <div className={`${boxCls} col-span-6 md:col-span-4`}>
            <label className={boxLabelCls}>Gênero</label>
            <select name="genero" value={genero} onChange={(e) => setGenero(e.target.value)} className={bareSelectCls}>
              <option value="">Selecione...</option>
              {generos.map((g) => (<option key={g.id} value={g.name}>{g.name}</option>))}
            </select>
          </div>
          <div className={`${boxCls} col-span-6 md:col-span-4`}>
            <label className={boxLabelCls}>Estado civil</label>
            <select name="estado_civil" value={estadoCivil} onChange={(e) => setEstadoCivil(e.target.value)} className={bareSelectCls}>
              <option value="">Selecione...</option>
              {estadosCivis.map((e) => (<option key={e.id} value={e.name}>{e.name}</option>))}
            </select>
          </div>
          <div className={`${boxCls} col-span-12 md:col-span-4`}>
            <label className={boxLabelCls}>Escolaridade</label>
            <select name="escolaridade" value={escolaridade} onChange={(e) => setEscolaridade(e.target.value)} className={bareSelectCls}>
              <option value="">Selecione...</option>
              {escolaridades.map((e) => (<option key={e.id} value={e.name}>{e.name}</option>))}
            </select>
          </div>
        </div>

        <div className="grid grid-cols-12 gap-3">
          <div className={`${boxCls} col-span-12 md:col-span-4`}>
            <label className={boxLabelCls}>Profissão</label>
            <select name="profissao" value={profissao} onChange={(e) => setProfissao(e.target.value)} className={bareSelectCls}>
              <option value="">Selecione...</option>
              {profissoes.map((p) => (<option key={p.id} value={p.name}>{p.name}</option>))}
            </select>
          </div>
          <div className={`${boxCls} col-span-8 md:col-span-6`}>
            <label className={boxLabelCls}>Naturalidade — cidade</label>
            <input
              name="naturalidade_cidade"
              value={naturalidadeCidade}
              onChange={(e) => setNaturalidadeCidade(e.target.value.toUpperCase())}
              className={`${bareCls} uppercase`}
            />
          </div>
          <div className={`${boxCls} col-span-4 md:col-span-2`}>
            <label className={boxLabelCls}>UF</label>
            <select
              name="naturalidade_estado"
              value={naturalidadeEstado}
              onChange={(e) => setNaturalidadeEstado(e.target.value)}
              className={bareSelectCls}
            >
              <option value="">UF</option>
              {ESTADOS_BR.map((s) => (<option key={s.uf} value={s.uf}>{s.uf}</option>))}
            </select>
          </div>
        </div>

        <div className="grid grid-cols-12 gap-3">
          <div className={`${boxCls} col-span-12 md:col-span-4`}>
            <label className={boxLabelCls}>Cônjuge (se houver)</label>
            <input name="nome_conjuge" value={nomeConjuge} onChange={(e) => setNomeConjuge(e.target.value)} className={bareCls} />
          </div>
          <div className={`${boxCls} col-span-12 md:col-span-4`}>
            <label className={boxLabelCls}>Nome da mãe</label>
            <input name="nome_mae" value={nomeMae} onChange={(e) => setNomeMae(e.target.value)} className={bareCls} />
          </div>
          <div className={`${boxCls} col-span-12 md:col-span-4`}>
            <label className={boxLabelCls}>Nome do pai</label>
            <input name="nome_pai" value={nomePai} onChange={(e) => setNomePai(e.target.value)} className={bareCls} />
          </div>
        </div>

        <div className="grid grid-cols-12 gap-3">
          <div className={`${boxCls} col-span-6 md:col-span-3`}>
            <label className={boxLabelCls}>CEP</label>
            <input name="cep" value={cep} onChange={(e) => setCep(e.target.value)} className={bareCls} />
          </div>
          <div className={`${boxCls} col-span-6 md:col-span-5`}>
            <label className={boxLabelCls}>Endereço</label>
            <input name="endereco" value={endereco} onChange={(e) => setEndereco(e.target.value)} className={bareCls} />
          </div>
          <div className={`${boxCls} col-span-6 md:col-span-2`}>
            <label className={boxLabelCls}>Número</label>
            <input name="endereco_numero" value={enderecoNumero} onChange={(e) => setEnderecoNumero(e.target.value)} className={bareCls} />
          </div>
          <div className={`${boxCls} col-span-6 md:col-span-2`}>
            <label className={boxLabelCls}>Complemento</label>
            <input
              name="endereco_complemento"
              value={enderecoComplemento}
              onChange={(e) => setEnderecoComplemento(e.target.value)}
              className={bareCls}
            />
          </div>
        </div>

        <div className="grid grid-cols-12 gap-3">
          <div className={`${boxCls} col-span-6 md:col-span-4`}>
            <label className={boxLabelCls}>Bairro</label>
            <input name="bairro" value={bairro} onChange={(e) => setBairro(e.target.value)} className={bareCls} />
          </div>
          <div className={`${boxCls} col-span-6 md:col-span-6`}>
            <label className={boxLabelCls}>Cidade</label>
            <input name="cidade" value={cidade} onChange={(e) => setCidade(e.target.value)} className={bareCls} />
          </div>
          <div className={`${boxCls} col-span-12 md:col-span-2`}>
            <label className={boxLabelCls}>UF</label>
            <select name="estado" value={estado} onChange={(e) => setEstado(e.target.value)} className={bareSelectCls}>
              <option value="">UF</option>
              {ESTADOS_BR.map((s) => (<option key={s.uf} value={s.uf}>{s.uf}</option>))}
            </select>
          </div>
        </div>
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
