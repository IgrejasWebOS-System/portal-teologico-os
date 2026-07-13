"use client";

import { useState, useEffect } from "react";
import { useFormStatus } from "react-dom";
import Link from "next/link";
import {
  ArrowLeft,
  Save,
  Loader2,
  Search,
  User,
  MapPin,
  Briefcase,
  Camera,
  Droplets,
  Church,
  Hash,
  Wand2,
  AlertTriangle,
} from "lucide-react";
import { createClient } from "@/utils/supabase/client";
import {
  updateMemberAction,
  getNextRegistrationNumberAction,
} from "@/app/(igreja)/dashboard/membros/actions";

// ── Helpers ───────────────────────────────────────────────────

function isoToBR(iso: string | null | undefined): string {
  if (!iso) return "";
  const p = iso.split("T")[0].split("-");
  return p.length === 3 ? `${p[2]}/${p[1]}/${p[0]}` : "";
}

function calculateTimeBaptized(ddmmyyyy: string): string {
  if (ddmmyyyy.length !== 10) return "---";
  const [d, m, y] = ddmmyyyy.split("/").map(Number);
  const baptism = new Date(y, m - 1, d);
  if (isNaN(baptism.getTime())) return "---";
  const now = new Date();
  let years = now.getFullYear() - baptism.getFullYear();
  let months = now.getMonth() - baptism.getMonth();
  if (months < 0 || (months === 0 && now.getDate() < baptism.getDate())) {
    years--;
    months += 12;
  }
  return `${years} ano${years !== 1 ? "s" : ""} e ${months} mês${months !== 1 ? "es" : ""}`;
}

// ── Máscaras ─────────────────────────────────────────────────

function maskDate(raw: string): string {
  let v = raw.replace(/\D/g, "").slice(0, 8);
  if (v.length > 4) v = `${v.slice(0, 2)}/${v.slice(2, 4)}/${v.slice(4)}`;
  else if (v.length > 2) v = `${v.slice(0, 2)}/${v.slice(2)}`;
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

// ── Submit button ─────────────────────────────────────────────

function SubmitButton({ disabled }: { disabled?: boolean }) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending || disabled}
      className="flex items-center gap-2 bg-iw-blue hover:bg-iw-navy disabled:opacity-50 text-white px-6 py-2.5 rounded-xl text-sm font-semibold transition-colors shadow-sm"
    >
      {pending ? (
        <><Loader2 className="w-4 h-4 animate-spin" />Salvando...</>
      ) : (
        <><Save className="w-4 h-4" />Salvar Alterações</>
      )}
    </button>
  );
}

// ── Styles ────────────────────────────────────────────────────

const inputCls =
  "w-full bg-white border border-iw-border rounded-xl px-3 py-2.5 text-sm text-iw-navy placeholder-iw-muted focus:border-iw-blue focus:outline-none transition-colors";
const inputErrCls =
  "w-full bg-white border border-iw-error rounded-xl px-3 py-2.5 text-sm text-iw-navy placeholder-iw-muted focus:border-iw-error focus:outline-none transition-colors";
const selectCls =
  "w-full bg-white border border-iw-border rounded-xl px-3 py-2.5 text-sm text-iw-navy focus:border-iw-blue focus:outline-none transition-colors cursor-pointer";
const labelCls =
  "block text-xs font-semibold text-iw-muted uppercase tracking-wider mb-1.5";

type SelectItem = { id: string; name: string };

// ── Props ─────────────────────────────────────────────────────

type MemberData = {
  id: string;
  full_name: string;
  email: string | null;
  phone: string | null;
  birth_date: string | null;
  gender: string | null;
  civil_status: string | null;
  profession: string | null;
  photo_url: string | null;
  nationality_city: string | null;
  nationality_state: string | null;
  schooling: string | null;
  origin_church: string | null;
  cpf: string | null;
  rg: string | null;
  rg_issuer: string | null;
  rg_state: string | null;
  role_id: string | null;
  ecclesiastical_status: string | null;
  registration_number: string | null;
  baptism_date: string | null;
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
  financial_status: string;
  status: string;
  ecclesiastical_roles?: { id: string; name: string } | null;
};

export default function EditarMembroForm({ member }: { member: MemberData }) {
  const [roles, setRoles]             = useState<SelectItem[]>([]);
  const [professions, setProfessions] = useState<SelectItem[]>([]);
  const [schoolings, setSchoolings]   = useState<SelectItem[]>([]);
  const [civilStatuses, setCivilStatuses] = useState<SelectItem[]>([]);
  const [genders, setGenders]         = useState<SelectItem[]>([]);
  const [states, setStates]           = useState<{ id: number; sigla: string; nome: string }[]>([]);
  const [cities, setCities]           = useState<{ id: string | number; nome: string }[]>([]);

  const [formData, setFormData] = useState({
    birth_date:           isoToBR(member.birth_date),
    phone:                member.phone ?? "",
    cpf:                  member.cpf ?? "",
    rg:                   member.rg ?? "",
    rg_issuer:            member.rg_issuer ?? "SSP",
    rg_state:             member.rg_state ?? "SP",
    nationality_state:    member.nationality_state ?? "SP",
    nationality_city:     member.nationality_city ?? "",
    ecclesiastical_status: member.ecclesiastical_status ?? "ACTIVE",
    photo_url:            member.photo_url ?? "",
    marriage_date:        isoToBR(member.marriage_date),
    baptism_date:         isoToBR(member.baptism_date),
    origin_church:        member.origin_church ?? "",
    role_id:              member.role_id ?? "",
    registration_number:  member.registration_number ?? "",
    spouse_name:          member.spouse_name ?? "",
    father_name:          member.father_name ?? "",
    mother_name:          member.mother_name ?? "",
    gender:               member.gender ?? "",
    civil_status:         member.civil_status ?? "",
    profession:           member.profession ?? "",
    schooling:            member.schooling ?? "",
  });

  const [timeBaptized, setTimeBaptized] = useState(
    member.baptism_date ? calculateTimeBaptized(isoToBR(member.baptism_date)) : "---"
  );
  const [addressData, setAddressData] = useState({
    zip_code:     member.zip_code ?? "",
    address:      member.address ?? "",
    number:       member.number ?? "",
    neighborhood: member.neighborhood ?? "",
    city:         member.city ?? "",
    state:        member.state ?? "",
  });

  const [loadingCep, setLoadingCep]                 = useState(false);
  const [uploading, setUploading]                   = useState(false);
  const [generatingMatricula, setGeneratingMatricula] = useState(false);
  const [cpfError, setCpfError]                     = useState("");
  const [matriculaError, setMatriculaError]         = useState("");
  const [serverError, setServerError]               = useState("");

  // Fetch dropdowns
  useEffect(() => {
    async function fetchData() {
      const supabase = createClient();
      const [rolesRes, profRes, schoolRes, civilRes, genderRes] = await Promise.all([
        supabase.from("ecclesiastical_roles").select("id, name").order("name"),
        supabase.from("settings_professions").select("id, name").order("name"),
        supabase.from("settings_schooling").select("id, name").order("name"),
        supabase.from("settings_civil_status").select("id, name").order("name"),
        supabase.from("settings_gender").select("id, name").order("name"),
      ]);
      if (rolesRes.data)  setRoles(rolesRes.data as SelectItem[]);
      if (profRes.data)   setProfessions(profRes.data as SelectItem[]);
      if (schoolRes.data) setSchoolings(schoolRes.data as SelectItem[]);
      if (civilRes.data)  setCivilStatuses(civilRes.data as SelectItem[]);
      if (genderRes.data) setGenders(genderRes.data as SelectItem[]);

      try {
        const res = await fetch("https://servicodados.ibge.gov.br/api/v1/localidades/estados?orderBy=nome");
        setStates(await res.json());
      } catch { /* silent */ }

      // Load cities for current state
      if (member.nationality_state) fetchCities(member.nationality_state);
    }
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fetchCities = async (uf: string) => {
    if (!uf) return;
    setCities([]);
    if (uf === "DF") {
      const supabase = createClient();
      const { data } = await supabase
        .from("settings_custom_regions")
        .select("id, name")
        .eq("state_uf", "DF")
        .order("name");
      if (data && data.length > 0) {
        setCities(data.map((d) => ({ id: d.id, nome: d.name })));
      } else {
        setCities([{ id: "fallback", nome: "Brasília" }]);
      }
    } else {
      try {
        const res = await fetch(
          `https://servicodados.ibge.gov.br/api/v1/localidades/estados/${uf}/municipios`
        );
        setCities(await res.json());
      } catch { setCities([]); }
    }
  };

  const checkCpfExists = async (cpfVal: string) => {
    if (!cpfVal || cpfVal.replace(/\D/g, "").length < 11) { setCpfError(""); return; }
    const supabase = createClient();
    const { data } = await supabase
      .from("members").select("id").eq("cpf", cpfVal).neq("id", member.id).single();
    setCpfError(data ? "Este CPF já está cadastrado para outro membro." : "");
  };

  const checkMatriculaExists = async (mat: string) => {
    if (!mat.trim()) { setMatriculaError(""); return; }
    const supabase = createClient();
    const { data } = await supabase
      .from("members").select("id").eq("registration_number", mat).neq("id", member.id).single();
    setMatriculaError(data ? "Esta matrícula já está em uso." : "");
  };

  const handleGenerateMatricula = async () => {
    setGeneratingMatricula(true);
    setMatriculaError("");
    const isActive = formData.ecclesiastical_status === "ACTIVE";
    const result = await getNextRegistrationNumberAction(isActive);
    if (result.success && result.data) {
      setFormData(prev => ({ ...prev, registration_number: result.data! }));
    } else {
      setMatriculaError("Falha ao consultar servidor.");
    }
    setGeneratingMatricula(false);
  };

  const handleBlurCep = async (e: React.FocusEvent<HTMLInputElement>) => {
    const cep = e.target.value.replace(/\D/g, "");
    if (cep.length !== 8) return;
    setLoadingCep(true);
    try {
      const res  = await fetch(`https://viacep.com.br/ws/${cep}/json/`);
      const data = await res.json();
      if (!data.erro) {
        setAddressData(prev => ({
          ...prev,
          zip_code:     cep,
          address:      data.logradouro ?? prev.address,
          neighborhood: data.bairro     ?? prev.neighborhood,
          city:         data.localidade ?? prev.city,
          state:        data.uf         ?? prev.state,
        }));
      }
    } catch { /* silent */ }
    finally { setLoadingCep(false); }
  };

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const supabase = createClient();
      const ext = file.name.split(".").pop();
      const fileName = `member-${Date.now()}.${ext}`;
      const { error } = await supabase.storage.from("avatars").upload(fileName, file);
      if (error) throw error;
      const { data } = supabase.storage.from("avatars").getPublicUrl(fileName);
      setFormData(prev => ({ ...prev, photo_url: data.publicUrl }));
    } catch {
      alert("Erro no upload da foto.");
    } finally { setUploading(false); }
  };

  const SectionHeader = ({ icon: Icon, label }: { icon: React.ElementType; label: string }) => (
    <div className="flex items-center gap-2.5 pb-3 border-b border-iw-border">
      <div className="w-6 h-6 rounded-lg bg-iw-blue/10 flex items-center justify-center shrink-0">
        <Icon className="w-3.5 h-3.5 text-iw-blue" />
      </div>
      <h2 className="text-sm font-bold text-iw-navy uppercase tracking-wider">{label}</h2>
    </div>
  );

  return (
    <div className="max-w-5xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-20">

      {/* ── Cabeçalho ── */}
      <div>
        <Link
          href="/dashboard/membros"
          className="inline-flex items-center gap-1.5 text-xs text-iw-muted hover:text-iw-navy font-medium transition-colors mb-2"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          Voltar para Gestão de Membros
        </Link>
        <div className="flex flex-wrap items-baseline gap-x-3">
          <h1 className="text-2xl font-black text-iw-navy tracking-tight">
            Editar Membro
          </h1>
          <p className="text-iw-muted text-sm">
            {member.full_name} — Matrícula #{member.registration_number ?? "—"}
          </p>
        </div>
      </div>

      {/* ── Erro do servidor ── */}
      {serverError && (
        <div className="flex items-center gap-3 bg-iw-error/8 border border-iw-error/30 text-iw-error px-4 py-3 rounded-xl text-sm">
          <AlertTriangle className="w-4 h-4 shrink-0" />
          <span className="font-medium">{serverError}</span>
        </div>
      )}

      <form
        action={async (fd: FormData) => {
          setServerError("");
          if (cpfError || matriculaError) return;

          // Inject state-managed values
          const fields: [string, string][] = [
            ["id",                   member.id],
            ["photo_url",            formData.photo_url],
            ["baptism_date",         formData.baptism_date],
            ["marriage_date",        formData.marriage_date],
            ["birth_date",           formData.birth_date],
            ["phone",                formData.phone],
            ["cpf",                  formData.cpf],
            ["rg",                   formData.rg],
            ["rg_issuer",            formData.rg_issuer],
            ["rg_state",             formData.rg_state],
            ["nationality_state",    formData.nationality_state],
            ["nationality_city",     formData.nationality_city],
            ["role_id",              formData.role_id],
            ["registration_number",  formData.registration_number],
            ["ecclesiastical_status",formData.ecclesiastical_status],
            ["gender",               formData.gender],
            ["civil_status",         formData.civil_status],
            ["profession",           formData.profession],
            ["schooling",            formData.schooling],
            ["spouse_name",          formData.spouse_name],
            ["father_name",          formData.father_name],
            ["mother_name",          formData.mother_name],
            ["origin_church",        formData.origin_church],
            ["zip_code",             addressData.zip_code],
            ["address",              addressData.address],
            ["number",               addressData.number],
            ["neighborhood",         addressData.neighborhood],
            ["city",                 addressData.city],
            ["state",                addressData.state],
          ];

          for (const [key, val] of fields) {
            if (!fd.get(key)) fd.append(key, val);
          }

          const result = await updateMemberAction(fd);
          if (result && result.success === false) {
            setServerError(result.message);
            window.scrollTo({ top: 0, behavior: "smooth" });
          }
        }}
        className="space-y-8"
      >
        {/* ══ CARD 1 — Vínculo eclesiástico ══ */}
        <div className="bg-iw-surface rounded-2xl border border-iw-border shadow-sm p-6 space-y-5">
          <SectionHeader icon={Church} label="Vínculo Eclesiástico" />

          <div className="grid grid-cols-12 gap-4 items-end">
            {/* Cargo */}
            <div className="col-span-12 md:col-span-4">
              <label className={labelCls}>
                <Briefcase className="inline w-3.5 h-3.5 mr-1 text-iw-blue" />
                Cargo
              </label>
              <select
                className={selectCls}
                value={formData.role_id}
                onChange={e => setFormData(p => ({ ...p, role_id: e.target.value }))}
              >
                <option value="">Sem cargo</option>
                {roles.map(r => (
                  <option key={r.id} value={r.id}>{r.name}</option>
                ))}
              </select>
            </div>

            {/* Matrícula */}
            <div className="col-span-12 md:col-span-3">
              <label className={labelCls}>
                <Hash className="inline w-3.5 h-3.5 mr-1 text-iw-gold" />
                Matrícula
              </label>
              <div className="relative flex items-center">
                <input
                  type="text"
                  placeholder="Auto ou manual..."
                  value={formData.registration_number}
                  onChange={e => {
                    setFormData(p => ({ ...p, registration_number: e.target.value }));
                    if (matriculaError) setMatriculaError("");
                  }}
                  onBlur={() => checkMatriculaExists(formData.registration_number)}
                  className={`${matriculaError ? inputErrCls : inputCls} pr-9 font-mono text-center`}
                />
                <button
                  type="button"
                  onClick={handleGenerateMatricula}
                  disabled={generatingMatricula}
                  title="Gerar próximo número livre"
                  className="absolute right-2.5 text-iw-muted hover:text-iw-gold transition-colors disabled:opacity-40"
                >
                  {generatingMatricula ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Wand2 className="w-3.5 h-3.5" />}
                </button>
              </div>
              {matriculaError && <p className="text-iw-error text-xs mt-1 font-medium">{matriculaError}</p>}
            </div>

            {/* Data de Batismo */}
            <div className="col-span-6 md:col-span-3">
              <label className={labelCls}>
                <Droplets className="inline w-3.5 h-3.5 mr-1 text-iw-sky" />
                Batismo
              </label>
              <input
                type="text"
                placeholder="DD/MM/AAAA"
                value={formData.baptism_date}
                maxLength={10}
                onChange={e => {
                  const v = maskDate(e.target.value);
                  setFormData(p => ({ ...p, baptism_date: v }));
                  if (v.length === 10) setTimeBaptized(calculateTimeBaptized(v));
                  else setTimeBaptized("---");
                }}
                className={`${inputCls} text-center`}
              />
            </div>

            {/* Tempo */}
            <div className="col-span-6 md:col-span-2">
              <label className={labelCls}>Tempo</label>
              <div className="w-full bg-iw-bg border border-iw-border rounded-xl px-3 py-2.5 text-sm text-iw-sky font-semibold truncate">
                {timeBaptized}
              </div>
            </div>
          </div>

          {/* Foto */}
          <div className="flex items-center gap-5">
            <div className="w-24 h-24 rounded-full bg-iw-bg border-2 border-dashed border-iw-border flex items-center justify-center relative overflow-hidden group hover:border-iw-blue transition-colors shrink-0">
              {formData.photo_url ? (
                <img src={formData.photo_url} alt="Foto" className="w-full h-full object-cover" />
              ) : (
                <div className="flex flex-col items-center gap-1 text-iw-muted group-hover:text-iw-blue">
                  {uploading ? <Loader2 className="w-7 h-7 animate-spin" /> : <Camera className="w-7 h-7" />}
                  <span className="text-[10px] font-semibold uppercase">Foto</span>
                </div>
              )}
              <input type="file" accept="image/*" onChange={handlePhotoUpload} className="absolute inset-0 opacity-0 cursor-pointer" />
            </div>
            <p className="text-xs text-iw-muted">Clique para trocar a foto. Formatos aceitos: JPG, PNG, WEBP.</p>
          </div>
        </div>

        {/* ══ CARD 2 — Dados Pessoais ══ */}
        <div className="bg-iw-surface rounded-2xl border border-iw-border shadow-sm p-6 space-y-5">
          <SectionHeader icon={User} label="Dados Pessoais" />

          <div className="grid grid-cols-12 gap-4">
            <div className="col-span-12 md:col-span-5">
              <label className={labelCls}>Nome Completo *</label>
              <input name="full_name" type="text" required defaultValue={member.full_name} placeholder="Nome do membro" className={inputCls} />
            </div>
            <div className="col-span-6 md:col-span-2">
              <label className={labelCls}>Data Nasc.</label>
              <input
                type="text" placeholder="DD/MM/AAAA"
                value={formData.birth_date} maxLength={10}
                onChange={e => setFormData(p => ({ ...p, birth_date: maskDate(e.target.value) }))}
                className={`${inputCls} text-center`}
              />
            </div>
            <div className="col-span-6 md:col-span-1">
              <label className={labelCls}>Sexo</label>
              <select className={selectCls} value={formData.gender} onChange={e => setFormData(p => ({ ...p, gender: e.target.value }))}>
                <option value="">...</option>
                {genders.map(g => <option key={g.id} value={g.name}>{g.name}</option>)}
              </select>
            </div>
            <div className="col-span-12 md:col-span-2">
              <label className={labelCls}>Estado Civil</label>
              <select className={selectCls} value={formData.civil_status} onChange={e => setFormData(p => ({ ...p, civil_status: e.target.value }))}>
                <option value="">Selecione...</option>
                {civilStatuses.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
              </select>
            </div>
            <div className="col-span-12 md:col-span-2">
              <label className={labelCls}>Profissão</label>
              <select className={selectCls} value={formData.profession} onChange={e => setFormData(p => ({ ...p, profession: e.target.value }))}>
                <option value="">Selecione...</option>
                {professions.map(p => <option key={p.id} value={p.name}>{p.name}</option>)}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-12 gap-4">
            <div className="col-span-12 md:col-span-3">
              <label className={labelCls}>E-mail</label>
              <input name="email" type="email" defaultValue={member.email ?? ""} placeholder="email@exemplo.com" className={inputCls} />
            </div>
            <div className="col-span-12 md:col-span-3">
              <label className={labelCls}>Telefone</label>
              <input
                type="text" placeholder="(00) 00000-0000"
                value={formData.phone}
                onChange={e => setFormData(p => ({ ...p, phone: maskPhone(e.target.value) }))}
                className={inputCls}
              />
            </div>
            <div className="col-span-12 md:col-span-3">
              <label className={labelCls}>Naturalidade (UF / Cidade)</label>
              <div className="flex gap-2">
                <select
                  className="w-20 bg-white border border-iw-border rounded-xl px-2 py-2.5 text-sm text-iw-navy focus:border-iw-blue focus:outline-none cursor-pointer"
                  value={formData.nationality_state}
                  onChange={e => {
                    const uf = e.target.value;
                    setFormData(p => ({ ...p, nationality_state: uf, nationality_city: "" }));
                    fetchCities(uf);
                  }}
                >
                  <option value="">UF</option>
                  {states.map(s => <option key={s.id} value={s.sigla}>{s.sigla}</option>)}
                </select>
                <select
                  className="flex-1 bg-white border border-iw-border rounded-xl px-2 py-2.5 text-sm text-iw-navy focus:border-iw-blue focus:outline-none cursor-pointer"
                  value={formData.nationality_city}
                  onChange={e => setFormData(p => ({ ...p, nationality_city: e.target.value }))}
                >
                  <option value="">Cidade</option>
                  {cities.map(c => <option key={c.id} value={c.nome}>{c.nome}</option>)}
                </select>
              </div>
            </div>
            <div className="col-span-12 md:col-span-3">
              <label className={labelCls}>Escolaridade</label>
              <select className={selectCls} value={formData.schooling} onChange={e => setFormData(p => ({ ...p, schooling: e.target.value }))}>
                <option value="">Selecione...</option>
                {schoolings.map(s => <option key={s.id} value={s.name}>{s.name}</option>)}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-12 gap-4">
            <div className="col-span-12 md:col-span-2">
              <label className={labelCls}>CPF</label>
              <input
                type="text" placeholder="000.000.000-00"
                value={formData.cpf} maxLength={14}
                onChange={e => { setFormData(p => ({ ...p, cpf: maskCPF(e.target.value) })); if (cpfError) setCpfError(""); }}
                onBlur={() => checkCpfExists(formData.cpf)}
                className={cpfError ? inputErrCls : inputCls}
              />
              {cpfError && <p className="text-iw-error text-xs mt-1 font-medium">{cpfError}</p>}
            </div>
            <div className="col-span-12 md:col-span-2">
              <label className={labelCls}>RG</label>
              <input
                type="text" placeholder="00.000.000-0"
                value={formData.rg} maxLength={12}
                onChange={e => setFormData(p => ({ ...p, rg: maskRG(e.target.value) }))}
                className={inputCls}
              />
            </div>
            <div className="col-span-6 md:col-span-1">
              <label className={labelCls}>Órgão</label>
              <input type="text" value={formData.rg_issuer} maxLength={6}
                onChange={e => setFormData(p => ({ ...p, rg_issuer: e.target.value.toUpperCase() }))}
                className={inputCls} />
            </div>
            <div className="col-span-6 md:col-span-1">
              <label className={labelCls}>UF RG</label>
              <input type="text" value={formData.rg_state} maxLength={2}
                onChange={e => setFormData(p => ({ ...p, rg_state: e.target.value.toUpperCase() }))}
                className={inputCls} />
            </div>
            <div className="col-span-12 md:col-span-6">
              <label className={labelCls}>Igreja de Origem</label>
              <input type="text" placeholder="Nome da igreja anterior..."
                value={formData.origin_church}
                onChange={e => setFormData(p => ({ ...p, origin_church: e.target.value }))}
                className={inputCls} />
            </div>
          </div>

          <div className="grid grid-cols-12 gap-4">
            <div className="col-span-12 md:col-span-3">
              <label className={labelCls}>Nome da Mãe</label>
              <input type="text" value={formData.mother_name}
                onChange={e => setFormData(p => ({ ...p, mother_name: e.target.value }))} className={inputCls} />
            </div>
            <div className="col-span-12 md:col-span-3">
              <label className={labelCls}>Nome do Pai</label>
              <input type="text" value={formData.father_name}
                onChange={e => setFormData(p => ({ ...p, father_name: e.target.value }))} className={inputCls} />
            </div>
            <div className="col-span-12 md:col-span-4">
              <label className={labelCls}>Cônjuge</label>
              <input type="text" value={formData.spouse_name}
                onChange={e => setFormData(p => ({ ...p, spouse_name: e.target.value }))} className={inputCls} />
            </div>
            <div className="col-span-12 md:col-span-2">
              <label className={labelCls}>Data Casamento</label>
              <input type="text" placeholder="DD/MM/AAAA" value={formData.marriage_date} maxLength={10}
                onChange={e => setFormData(p => ({ ...p, marriage_date: maskDate(e.target.value) }))}
                className={`${inputCls} text-center`} />
            </div>
          </div>
        </div>

        {/* ══ CARD 3 — Endereço ══ */}
        <div className="bg-iw-surface rounded-2xl border border-iw-border shadow-sm p-6 space-y-5">
          <SectionHeader icon={MapPin} label="Endereço Residencial" />

          <div className="grid grid-cols-12 gap-4">
            <div className="col-span-12 md:col-span-2 relative">
              <label className={labelCls}>CEP</label>
              <div className="relative">
                <input
                  type="text" placeholder="00000-000"
                  value={addressData.zip_code} maxLength={9}
                  onChange={e => {
                    let v = e.target.value.replace(/\D/g, "").slice(0, 8);
                    if (v.length > 5) v = `${v.slice(0, 5)}-${v.slice(5)}`;
                    setAddressData(p => ({ ...p, zip_code: v }));
                  }}
                  onBlur={handleBlurCep}
                  className={`${inputCls} pl-9`}
                />
                <Search className={`absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 ${loadingCep ? "text-iw-blue animate-pulse" : "text-iw-muted"}`} />
              </div>
            </div>
            <div className="col-span-12 md:col-span-8">
              <label className={labelCls}>Endereço</label>
              <input type="text" placeholder="Rua, Avenida..." value={addressData.address}
                onChange={e => setAddressData(p => ({ ...p, address: e.target.value }))} className={inputCls} />
            </div>
            <div className="col-span-12 md:col-span-2">
              <label className={labelCls}>Número</label>
              <input type="text" placeholder="Nº" value={addressData.number}
                onChange={e => setAddressData(p => ({ ...p, number: e.target.value }))} className={inputCls} />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className={labelCls}>Bairro</label>
              <input type="text" placeholder="Bairro" value={addressData.neighborhood}
                onChange={e => setAddressData(p => ({ ...p, neighborhood: e.target.value }))} className={inputCls} />
            </div>
            <div>
              <label className={labelCls}>Cidade</label>
              <input type="text" placeholder="Cidade" value={addressData.city}
                onChange={e => setAddressData(p => ({ ...p, city: e.target.value }))} className={inputCls} />
            </div>
            <div>
              <label className={labelCls}>UF</label>
              <input type="text" placeholder="UF" value={addressData.state} maxLength={2}
                onChange={e => setAddressData(p => ({ ...p, state: e.target.value.toUpperCase() }))}
                className={`${inputCls} uppercase`} />
            </div>
          </div>
        </div>

        {/* ══ RODAPÉ — Status + Salvar ══ */}
        <div className="bg-iw-surface rounded-2xl border border-iw-border shadow-sm p-5 flex flex-col sm:flex-row items-center gap-5 justify-between">
          <div className="flex flex-col sm:flex-row gap-4 w-full sm:w-auto">
            <div className="flex-1 min-w-40">
              <label className={labelCls}>Situação</label>
              <select
                className={selectCls}
                value={formData.ecclesiastical_status}
                onChange={e => setFormData(p => ({ ...p, ecclesiastical_status: e.target.value }))}
              >
                <option value="ACTIVE">🟢 Ativo</option>
                <option value="OBSERVATION">🟡 Observação</option>
                <option value="INACTIVE">🔴 Inativo</option>
                <option value="UNFIT">⚪ Inapto</option>
              </select>
            </div>
            <div className="flex-1 min-w-40">
              <label className={labelCls}>Financeiro</label>
              <select name="financial_status" defaultValue={member.financial_status} className={selectCls}>
                <option value="UP_TO_DATE">🟢 Em Dia</option>
                <option value="PENDING">🔴 Pendente</option>
              </select>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Link
              href="/dashboard/membros"
              className="px-4 py-2.5 text-sm font-semibold text-iw-muted hover:text-iw-navy border border-iw-border rounded-xl hover:border-iw-navy/30 transition-colors"
            >
              Cancelar
            </Link>
            <SubmitButton disabled={!!cpfError || !!matriculaError} />
          </div>
        </div>
      </form>
    </div>
  );
}
