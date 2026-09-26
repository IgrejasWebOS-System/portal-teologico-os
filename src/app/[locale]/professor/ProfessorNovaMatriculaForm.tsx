"use client";

import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { UserPlus, User, MapPin, GraduationCap, Loader2, Send, X, Camera } from "lucide-react";
import { aplicarMaiusculaNoEvento } from "@/utils/uppercaseInput";
import { BuscaOuCriarInput, SeletorBuscaDropdown } from "@/components/forms/BuscaOuCriarInput";
import { validarCPF } from "@/utils/cpf";
import { maskPhone } from "@/utils/maskPhone";
import { createClient } from "@/utils/supabase/client";

// ============================================================
// Nova Matrícula do professor (20/09/2026, corrigindo lacuna real: a
// versão anterior tinha só 4 campos, nunca mandava convite de acesso
// pro aluno e só gerava a parcela da matrícula). Agora espelha
// matricularDiretoAction (secretaria, admin/matriculas/actions.ts):
// ficha completa (mesmos campos obrigatórios da ficha do mutirão),
// convite por e-mail, e plano de parcelas completo (matrícula + todas
// as mensalidades do curso, básico/médio pelo course_pricing) — tudo
// isso já roda em professorCriarMatriculaAction (actions.ts), sem
// nenhuma mudança aqui; esta tela só manda os mesmos campos de sempre.
//
// 22/09/2026, achados em teste (imagens 1-12, Joaquim):
// 1) Não tinha como fechar sem preencher nada — era um <details>, e
//    clicar fora ou apertar Esc não fazia nada. Virou modal de verdade:
//    botão X, clique no fundo escuro e tecla Esc fecham sem enviar nada.
// 2) O <select> de curso vinha de ead_matriculas já existentes — um
//    professor recém-vinculado a uma turma nova (ex.: 2027, ainda sem
//    nenhum aluno) não tinha NENHUMA opção. Trocado para a turma
//    (course_edition) vinda de professor_turmas, calculada no
//    page.tsx (mesma lista já usada no filtro de "Meus Alunos") — e sem
//    nenhuma pré-selecionada, pra forçar escolha explícita mesmo quando
//    só existe 1 turma.
// 3) RG (número) deixou de ser obrigatório — documento de identidade
//    unificado não traz mais esse número.
//
// 25/09/2026, achado em teste (Joaquim, imagens 1/2 vs. 3-7): mesmo com os
// mesmos campos e nomes de componentes (Field/SectionHeader) de
// nova/NovaMatriculaForm.tsx, o RESULTADO VISUAL era bem diferente — aqui
// cada seção só tinha uma linha fina embaixo do título, sem o cartão
// branco com borda dourada e sombra que o padrão admin usa por seção, e
// sem a foto do aluno. Layout reescrito pra ficar visualmente idêntico:
// cada seção agora é um cartão (bg-white rounded-2xl border-iw-gold
// shadow-sm p-6), com a foto ao lado da primeira, igual
// EditarMatriculaForm.tsx/NovaMatriculaForm.tsx.
// ============================================================

const bareCls = "w-full bg-transparent border-none p-0 text-sm text-iw-navy placeholder-iw-muted/70 focus:outline-none focus:ring-0";
const bareSelectCls = `${bareCls} cursor-pointer`;
const boxCls = "border border-iw-navy rounded-xl px-3.5 pt-1.5 pb-2 bg-white focus-within:border-iw-gold focus-within:ring-2 focus-within:ring-iw-gold/40 focus-within:bg-iw-gold/[0.06] transition-colors";
const boxErrCls = "border border-iw-error rounded-xl px-3.5 pt-1.5 pb-2 bg-white focus-within:ring-2 focus-within:ring-iw-error/30 transition-colors";
const boxLabelCls = "block text-[10px] font-extrabold text-iw-muted uppercase tracking-wider mb-0.5";
const cardCls = "bg-white rounded-2xl border border-iw-gold shadow-sm p-6 space-y-3";

function Field({
  label, required, span, error, className, filled, children,
}: {
  label: string; required?: boolean; span?: string; error?: string; className?: string; filled?: boolean; children: React.ReactNode;
}) {
  return (
    <div className={span ?? "col-span-12 md:col-span-3"}>
      <div className={`${error ? boxErrCls : boxCls} ${className ?? ""}`}>
        <div className="flex items-center justify-between gap-1">
          <label className={boxLabelCls}>{label}{required && " *"}</label>
          {filled && <span className="w-1.5 h-1.5 rounded-full bg-iw-gold shrink-0" aria-hidden="true" />}
        </div>
        {children}
      </div>
      {error && <p className="text-[11px] text-iw-error mt-1">{error}</p>}
    </div>
  );
}

// Naturalidade — busca por nome de cidade (IBGE) com autopreenchimento da
// UF, igual a nova/NovaMatriculaForm.tsx (padrão admin).
type Municipio = { nome: string; uf: string };

function focarProximoCampo(atual: HTMLElement) {
  const form = atual.closest("form");
  if (!form) return;
  setTimeout(() => {
    const focaveis = Array.from(
      form.querySelectorAll<HTMLElement>("input, select, textarea, button")
    ).filter((el) => {
      if (el.hasAttribute("disabled")) return false;
      if (el.tabIndex === -1) return false;
      if ((el as HTMLInputElement).type === "hidden") return false;
      if (el.offsetParent === null) return false;
      return true;
    });
    const idx = focaveis.indexOf(atual);
    if (idx > -1 && idx < focaveis.length - 1) {
      focaveis[idx + 1]?.focus();
    }
  }, 30);
}

function CampoNaturalidade({
  span, municipios, onSelecionarCidade,
}: {
  span?: string;
  municipios: Municipio[];
  onSelecionarCidade: (nome: string, uf: string) => void;
}) {
  const [valor, setValor] = useState("");
  const [aberto, setAberto] = useState(false);
  const inputRef = useRef<HTMLInputElement | null>(null);

  const itens = useMemo(
    () => municipios.map((m, i) => ({ id: `${m.nome}|${m.uf}|${i}`, label: m.nome, sublabel: m.uf })),
    [municipios]
  );

  return (
    <Field label="Naturalidade — cidade" span={span} className="relative" filled={valor.length > 0}>
      <input
        ref={inputRef}
        name="naturalidade_cidade"
        value={valor}
        readOnly
        onClick={() => setAberto(true)}
        placeholder="Cidade de nascimento"
        className={`${bareCls} cursor-pointer uppercase`}
      />
      {aberto && (
        <SeletorBuscaDropdown
          titulo="Naturalidade"
          valorInicial={valor}
          itens={itens}
          permitirLivre
          placeholder="Cidade de nascimento"
          onFechar={() => setAberto(false)}
          onSelecionar={(item) => {
            const [nomeBruto, uf] = item.id.includes("|") ? item.id.split("|") : [item.label, ""];
            const nome = nomeBruto.toUpperCase();
            setValor(nome);
            onSelecionarCidade(nome, uf);
            setAberto(false);
            if (inputRef.current) focarProximoCampo(inputRef.current);
          }}
        />
      )}
    </Field>
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

interface ProfissaoItem { id: string; name: string }
interface TurmaOpcao { id: string; label: string }
interface SelectItem { id: string; name: string }
interface ChurchItem { id: string; name: string; sector_id: string | null; unit_id: string | null }

interface Props {
  action: (formData: FormData) => Promise<void> | void;
  turmasDoProfessor: TurmaOpcao[];
  profissoes: ProfissaoItem[];
  // 25/09/2026, achado em teste (Joaquim): a página só re-renderiza com um
  // `novoAlunoId` novo na URL logo depois de um matricularCriarAction bem
  // sucedido (ver professor/page.tsx) — usado só pra saber quando fechar e
  // limpar o modal (ver useEffect abaixo), nunca pra decidir se a
  // matrícula deu certo de outra forma.
  justMatriculadoId?: string;
}

export default function ProfessorNovaMatriculaForm({ action, turmasDoProfessor, profissoes, justMatriculadoId }: Props) {
  const [pending, startTransition] = useTransition();
  const [aberto, setAberto] = useState(false);
  // 25/09/2026, achado em teste (Joaquim, "ainda não fechou o formulário,
  // voltou com sujeira de informações"): o Next.js App Router só troca os
  // searchParams ao redirecionar pro sucesso — como a rota continua sendo
  // /professor, os componentes client (inclusive este modal) NÃO
  // desmontam, e os campos (controlados e não-controlados) ficam com o
  // valor antigo. `formKey` força um remount completo do <form> toda vez
  // que o modal abre ou que uma matrícula acaba de ser criada — único jeito
  // confiável de zerar também os campos não-controlados (defaultValue).
  const [formKey, setFormKey] = useState(0);
  const [cpf, setCpf] = useState("");
  const [telefone, setTelefone] = useState("");
  const [cpfError, setCpfError] = useState("");
  const [cep, setCep] = useState("");
  const [endereco, setEndereco] = useState("");
  const [enderecoComplemento, setEnderecoComplemento] = useState("");
  const [bairro, setBairro] = useState("");
  const [cidade, setCidade] = useState("");
  const [estado, setEstado] = useState("");
  const [loadingCep, setLoadingCep] = useState(false);
  const [cepError, setCepError] = useState("");
  const [fotoUrl, setFotoUrl] = useState("");
  const [uploadingFoto, setUploadingFoto] = useState(false);
  const [naturalidadeEstado, setNaturalidadeEstado] = useState("");
  const [municipios, setMunicipios] = useState<Municipio[]>([]);
  const [escolaridades, setEscolaridades] = useState<SelectItem[]>([]);
  const [setores, setSetores] = useState<SelectItem[]>([]);
  const [churches, setChurches] = useState<ChurchItem[]>([]);
  const [sectorId, setSectorId] = useState("");
  const [churchId, setChurchId] = useState("");
  // 25/09/2026, achado em teste (Joaquim, imagem 1): faltava a Sede na
  // lista — mesmo padrão de nova/NovaMatriculaForm.tsx: a Sede não é Setor
  // nem Regional (fica acima na hierarquia, church.sector_id dela é nulo),
  // então ela é injetada à mão na lista de Igreja, não na de Setor.
  const [sedeUnitId, setSedeUnitId] = useState<string | null>(null);

  // Reordena SETOR antes de REGIONAL — mesma correção aplicada nos
  // formulários admin (`sectors` vem alfabético do banco, R < S).
  const setoresOrdenados = useMemo(() => {
    const naoRegional = setores.filter((s) => !s.name.toUpperCase().startsWith("REGIONAL"));
    const regional = setores.filter((s) => s.name.toUpperCase().startsWith("REGIONAL"));
    return [...naoRegional, ...regional];
  }, [setores]);
  const sedeChurch = useMemo(
    () => (sedeUnitId ? churches.find((c) => c.unit_id === sedeUnitId) ?? null : null),
    [sedeUnitId, churches]
  );
  const igrejasDoSetor = useMemo(() => {
    const base = sectorId ? churches.filter((c) => c.sector_id === sectorId) : churches;
    if (!sedeChurch || base.some((c) => c.id === sedeChurch.id)) return base;
    return [sedeChurch, ...base];
  }, [sectorId, churches, sedeChurch]);

  function resetarFormulario() {
    setCpf(""); setCpfError("");
    setTelefone("");
    setCep(""); setEndereco(""); setEnderecoComplemento(""); setBairro(""); setCidade(""); setEstado(""); setCepError("");
    setFotoUrl("");
    setNaturalidadeEstado("");
    setSectorId(""); setChurchId("");
    setFormKey((k) => k + 1);
  }

  // Abrir o modal (de novo ou pela 1ª vez) sempre começa com ficha zerada —
  // cobre tanto reabrir depois de "Cancelar" quanto depois de matricular.
  const abrirModal = () => {
    resetarFormulario();
    setAberto(true);
  };

  // Fecha e limpa sozinho assim que a página recebe o `novoAlunoId` da
  // matrícula recém-criada (ver comentário no tipo Props acima). Ajuste de
  // estado a partir de mudança de prop feito durante a renderização (não
  // dentro de um efeito) — padrão "Adjusting state when a prop changes" da
  // documentação do React. Usa useState (não useRef) pra guardar o valor
  // anterior, porque o React Compiler deste projeto proíbe leitura/escrita
  // de ref durante o render (react-hooks/refs) — só useState é permitido
  // aqui. Evita tanto o cascading render do setState-dentro-de-effect
  // quanto o acesso a ref durante render.
  const [justMatriculadoIdAnterior, setJustMatriculadoIdAnterior] = useState(justMatriculadoId);
  if (justMatriculadoIdAnterior !== justMatriculadoId) {
    setJustMatriculadoIdAnterior(justMatriculadoId);
    if (justMatriculadoId) {
      setAberto(false);
      resetarFormulario();
    }
  }

  useEffect(() => {
    async function fetchDropdowns() {
      const supabase = createClient();
      const [esc, set, chu, sede] = await Promise.all([
        supabase.from("settings_schooling").select("id, name").order("name"),
        supabase.from("sectors").select("id, name").order("name"),
        supabase.from("churches").select("id, name, sector_id, unit_id").order("name"),
        supabase.from("units").select("id").eq("type", "SEDE").maybeSingle(),
      ]);
      if (esc.data) setEscolaridades(esc.data as SelectItem[]);
      if (set.data) setSetores(set.data as SelectItem[]);
      if (chu.data) setChurches(chu.data as ChurchItem[]);
      if (sede.data) setSedeUnitId(sede.data.id);
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

  const handleFotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingFoto(true);
    try {
      const supabase = createClient();
      const ext = file.name.split(".").pop();
      const fileName = `aluno-${Date.now()}.${ext}`;
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

  // Fecha com a tecla Esc, e trava o scroll da página atrás do modal.
  useEffect(() => {
    if (!aberto) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setAberto(false);
    };
    document.addEventListener("keydown", onKeyDown);
    const overflowOriginal = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = overflowOriginal;
    };
  }, [aberto]);

  const checkCpf = (valor: string) => {
    const digitos = valor.replace(/\D/g, "");
    if (!digitos || digitos.length < 11) { setCpfError(""); return; }
    setCpfError(validarCPF(valor) ? "" : "CPF inválido — confira os números digitados.");
  };

  const handleBlurCep = async () => {
    const cepLimpo = cep.replace(/\D/g, "");
    if (!cepLimpo) { setCepError(""); return; }
    if (cepLimpo.length !== 8) { setCepError("CEP incompleto — precisa ter 8 números."); return; }
    setCepError("");
    setLoadingCep(true);
    try {
      const res = await fetch(`https://viacep.com.br/ws/${cepLimpo}/json/`);
      const data = await res.json();
      if (data.erro) {
        setCepError("CEP não encontrado — confira os números ou preencha o endereço na mão.");
      } else {
        if (data.logradouro) setEndereco(data.logradouro.toUpperCase());
        if (data.bairro) setBairro(data.bairro.toUpperCase());
        if (data.localidade) setCidade(data.localidade.toUpperCase());
        if (data.uf) setEstado(data.uf.toUpperCase());
        setEnderecoComplemento(data.complemento?.toUpperCase() || "");
      }
    } catch {
      setCepError("Não foi possível consultar o CEP agora — preencha o endereço na mão.");
    } finally {
      setLoadingCep(false);
    }
  };

  function handleSubmit(formData: FormData) {
    if (cpfError) return;
    startTransition(() => {
      action(formData);
    });
  }

  return (
    <>
      <button
        type="button"
        onClick={abrirModal}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-[#FFFFFF] text-iw-navy border-[1.5px] border-[#CF8403] hover:bg-iw-gold/10 transition-colors shrink-0"
      >
        <UserPlus className="w-3.5 h-3.5" />
        Nova Matrícula
      </button>

      {aberto && (
        <div className="fixed inset-0 z-[60] flex items-start md:items-center justify-center p-3 md:p-6 overflow-y-auto">
          {/* Fundo escuro — clicar fora fecha sem enviar nada. */}
          <div className="fixed inset-0 bg-black/50" onClick={() => setAberto(false)} />

          <div className="relative w-full max-w-6xl bg-iw-bg border border-iw-gold rounded-2xl shadow-xl my-auto">
            <div className="flex items-center justify-between gap-2 px-5 py-3.5 border-b border-iw-border bg-iw-surface rounded-t-2xl">
              <div className="flex items-center gap-2">
                <span className="w-6 h-6 rounded-lg bg-iw-gold/10 flex items-center justify-center shrink-0">
                  <UserPlus className="w-3.5 h-3.5 text-iw-gold" />
                </span>
                <h2 className="text-sm font-bold text-iw-navy">Nova Matrícula</h2>
              </div>
              <button
                type="button"
                onClick={() => setAberto(false)}
                title="Fechar sem matricular"
                className="w-7 h-7 rounded-lg flex items-center justify-center text-iw-muted hover:text-iw-navy hover:bg-iw-bg transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form key={formKey} action={handleSubmit} className="p-5 pt-4 space-y-5 max-h-[80vh] overflow-y-auto">
              {/* Foto do aluno + Turma — mesmo layout de
                  NovaMatriculaForm.tsx/EditarMatriculaForm.tsx: foto à
                  esquerda, primeiro cartão à direita. */}
              <div className="grid grid-cols-12 gap-4 items-stretch">
                <div className="col-span-12 md:col-span-3 flex flex-col items-start justify-start gap-2">
                  <div className="w-full aspect-square rounded-full bg-transparent border-[1.5px] border-[#E88D0C]/40 flex items-center justify-center relative overflow-hidden group hover:border-iw-blue transition-colors">
                    {fotoUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={fotoUrl} alt="Foto do aluno" className="w-full h-full object-cover" />
                    ) : (
                      <div className="flex flex-col items-center gap-1 text-iw-muted group-hover:text-iw-navy">
                        {uploadingFoto ? <Loader2 className="w-7 h-7 animate-spin" /> : <Camera className="w-7 h-7" />}
                        <span className="text-[10px] font-semibold uppercase text-center px-2">Foto do aluno</span>
                      </div>
                    )}
                    <input type="file" accept="image/*" onChange={handleFotoUpload} className="absolute inset-0 opacity-0 cursor-pointer" />
                  </div>
                  <p className="text-[11px] text-iw-muted">Aparece na ficha e no PDF de matrícula.</p>
                  <input type="hidden" name="foto_url" value={fotoUrl} />
                </div>

                <div className={`col-span-12 md:col-span-9 ${cardCls}`}>
                  <SectionHeader icon={GraduationCap} label="Turma" />
                  <div className="grid grid-cols-12 gap-3">
                    <Field label="Curso e turma" required span="col-span-12">
                      <select name="course_edition_id" required defaultValue="" className={bareSelectCls}>
                        <option value="" disabled>
                          Selecione a turma...
                        </option>
                        {turmasDoProfessor.map((t) => (
                          <option key={t.id} value={t.id}>
                            {t.label}
                          </option>
                        ))}
                      </select>
                    </Field>
                  </div>
                  {/* 25/09/2026, achado em teste (Joaquim): Setor/Igreja/Data
                      da matrícula vieram pra dentro do mesmo cartão "Turma"
                      (antes eram um cartão "Igreja e matrícula" separado) —
                      pedido explícito pra juntar tudo aqui. */}
                  <div className="grid grid-cols-12 gap-3">
                    <Field label="Setor" required span="col-span-6 md:col-span-3">
                      <select
                        name="sector_id"
                        required
                        value={sectorId}
                        onChange={(e) => { setSectorId(e.target.value); setChurchId(""); }}
                        className={bareSelectCls}
                      >
                        <option value="">Selecione...</option>
                        {setoresOrdenados.map((s) => (
                          <option key={s.id} value={s.id}>{s.name}</option>
                        ))}
                      </select>
                    </Field>
                    <Field label="Igreja" required span="col-span-6 md:col-span-3">
                      <select
                        name="church_id"
                        required
                        value={churchId}
                        onChange={(e) => setChurchId(e.target.value)}
                        className={bareSelectCls}
                      >
                        <option value="">Selecione...</option>
                        {igrejasDoSetor.map((c) => (
                          <option key={c.id} value={c.id}>{c.name}</option>
                        ))}
                      </select>
                    </Field>
                    <Field label="Data matrícula" span="col-span-12 md:col-span-6">
                      <input
                        name="data_matricula_informada"
                        type="date"
                        max={new Date().toISOString().slice(0, 10)}
                        className={bareCls}
                      />
                    </Field>
                  </div>
                  <p className="text-[11px] text-iw-muted">
                    Só aparecem aqui as turmas já vinculadas a você (seção &ldquo;Minhas Turmas&rdquo;, acima). A
                    matrícula (se houver) e as mensalidades do curso são geradas automaticamente, com base no
                    preço já cadastrado em Financeiro — não precisa informar valor aqui. Data matrícula em
                    branco assume a data de hoje (aluno novo); preenchida com uma data anterior define o 1º
                    vencimento e as parcelas seguintes (aluno que já cursa há mais tempo).
                  </p>
                </div>
              </div>

              {/* 25/09/2026, achado em teste (Joaquim): campos batiam, mas a
                  ORDEM não era a mesma de EditarMatriculaForm.tsx (padrão
                  admin) — reorganizado linha a linha pra ficar idêntico:
                  Nome/CPF/Nascimento → E-mail/Telefone/RG/Órgão/UF RG →
                  Sexo/Est.civil/Escolaridade/Profissão →
                  Naturalidade/UF/Nacionalidade/Cônjuge → Mãe/Pai. */}
              <div className={cardCls}>
                <SectionHeader icon={User} label="Dados pessoais" />
                <div className="grid grid-cols-12 gap-3">
                  <Field label="Nome completo" required span="col-span-12 md:col-span-6">
                    <input name="nome_completo" required onChange={aplicarMaiusculaNoEvento} className={`${bareCls} uppercase`} />
                  </Field>
                  <Field label="CPF" required span="col-span-6 md:col-span-3" error={cpfError}>
                    <input
                      name="cpf"
                      required
                      value={cpf}
                      onChange={(e) => setCpf(e.target.value)}
                      onBlur={(e) => checkCpf(e.target.value)}
                      className={bareCls}
                    />
                  </Field>
                  <Field label="Data de nascimento" required span="col-span-6 md:col-span-3">
                    <input name="data_nascimento" required type="date" className={bareCls} />
                  </Field>
                </div>

                <div className="grid grid-cols-12 gap-3">
                  <Field label="E-mail" required span="col-span-12 md:col-span-4">
                    <input name="email" type="email" required className={bareCls} />
                  </Field>
                  <Field label="Telefone" required span="col-span-12 md:col-span-3">
                    <input
                      name="telefone"
                      required
                      placeholder="(00) 00000-0000 ou +55 11 90000-0000"
                      value={telefone}
                      onChange={(e) => setTelefone(maskPhone(e.target.value))}
                      className={bareCls}
                    />
                  </Field>
                  <Field label="RG" span="col-span-6 md:col-span-2">
                    <input name="rg" className={bareCls} />
                  </Field>
                  <Field label="Órgão" required span="col-span-6 md:col-span-1">
                    <input name="rg_orgao_emissor" required defaultValue="SSP" onChange={aplicarMaiusculaNoEvento} className={`${bareCls} uppercase`} />
                  </Field>
                  <Field label="UF do RG" required span="col-span-6 md:col-span-2">
                    <input name="rg_uf" required maxLength={2} defaultValue="SP" className={`${bareCls} uppercase`} />
                  </Field>
                </div>

                <div className="grid grid-cols-12 gap-3">
                  <Field label="Sexo" required span="col-span-6 md:col-span-3">
                    <select name="genero" required defaultValue="" className={bareSelectCls}>
                      <option value="">Selecione...</option>
                      <option value="M">Masculino</option>
                      <option value="F">Feminino</option>
                    </select>
                  </Field>
                  <Field label="Estado civil" required span="col-span-6 md:col-span-3">
                    <select name="estado_civil" required defaultValue="" className={bareSelectCls}>
                      <option value="">Selecione...</option>
                      <option value="Solteiro(a)">Solteiro(a)</option>
                      <option value="Casado(a)">Casado(a)</option>
                      <option value="Divorciado(a)">Divorciado(a)</option>
                      <option value="Viúvo(a)">Viúvo(a)</option>
                    </select>
                  </Field>
                  {/* 25/09/2026, achado em teste (Joaquim): estava como texto
                      livre, sem busca — digitava errado ("SUOPERIOR") sem
                      nenhuma lista pra escolher. Agora busca em
                      settings_schooling, igual à ficha admin. */}
                  <Field label="Escolaridade" required span="col-span-6 md:col-span-3">
                    <BuscaOuCriarInput
                      name="escolaridade"
                      required
                      itens={escolaridades.map((e) => ({ id: e.id, label: e.name }))}
                      placeholder="Digite pra buscar"
                      permitirLivre
                      className={`${bareCls} cursor-pointer uppercase`}
                    />
                  </Field>
                  <Field label="Profissão" span="col-span-6 md:col-span-3">
                    <BuscaOuCriarInput
                      name="profissao"
                      itens={profissoes.map((p) => ({ id: p.id, label: p.name }))}
                      placeholder="Digite pra buscar"
                      permitirLivre
                      className={`${bareCls} cursor-pointer uppercase`}
                    />
                  </Field>
                </div>

                <div className="grid grid-cols-12 gap-3">
                  {/* 25/09/2026, achado em teste: mesma correção — busca por
                      cidade (IBGE) com UF preenchida sozinha, igual à ficha
                      admin, em vez de texto livre. */}
                  <CampoNaturalidade
                    span="col-span-6 md:col-span-2"
                    municipios={municipios}
                    onSelecionarCidade={(_nome, uf) => setNaturalidadeEstado(uf)}
                  />
                  <Field label="UF" required span="col-span-3 md:col-span-1">
                    <input
                      name="naturalidade_estado"
                      required
                      maxLength={2}
                      value={naturalidadeEstado}
                      onChange={(e) => setNaturalidadeEstado(e.target.value.toUpperCase())}
                      className={`${bareCls} uppercase`}
                    />
                  </Field>
                  <Field label="Nacionalidade" required span="col-span-3 md:col-span-2">
                    <input name="nacionalidade" required defaultValue="Brasileira" onChange={aplicarMaiusculaNoEvento} className={`${bareCls} uppercase`} />
                  </Field>
                  <Field label="Cônjuge (se houver)" span="col-span-12 md:col-span-7">
                    <input name="nome_conjuge" autoComplete="off" onChange={aplicarMaiusculaNoEvento} className={`${bareCls} uppercase`} />
                  </Field>
                </div>

                <div className="grid grid-cols-12 gap-3">
                  <Field label="Nome da mãe" required span="col-span-12 md:col-span-6">
                    <input name="nome_mae" required autoComplete="off" onChange={aplicarMaiusculaNoEvento} className={`${bareCls} uppercase`} />
                  </Field>
                  <Field label="Nome do pai" span="col-span-12 md:col-span-6">
                    <input name="nome_pai" autoComplete="off" onChange={aplicarMaiusculaNoEvento} className={`${bareCls} uppercase`} />
                  </Field>
                </div>
              </div>

              <div className={cardCls}>
                <SectionHeader icon={MapPin} label="Endereço" />
                <div className="grid grid-cols-12 gap-3">
                  <Field label={loadingCep ? "CEP (buscando...)" : "CEP"} required span="col-span-6 md:col-span-2" error={cepError}>
                    <input
                      name="cep"
                      required
                      value={cep}
                      onChange={(e) => setCep(e.target.value)}
                      onBlur={handleBlurCep}
                      className={bareCls}
                    />
                  </Field>
                  <Field label="Endereço" required span="col-span-12 md:col-span-7">
                    <input
                      name="endereco"
                      required
                      value={endereco}
                      onChange={(e) => setEndereco(e.target.value.toUpperCase())}
                      className={`${bareCls} uppercase`}
                    />
                  </Field>
                  <Field label="Número" required span="col-span-6 md:col-span-3">
                    <input name="endereco_numero" required onChange={aplicarMaiusculaNoEvento} className={`${bareCls} uppercase`} />
                  </Field>
                </div>
                <div className="grid grid-cols-12 gap-3">
                  <Field label="Complemento" span="col-span-12 md:col-span-4">
                    <input
                      name="endereco_complemento"
                      value={enderecoComplemento}
                      onChange={(e) => setEnderecoComplemento(e.target.value.toUpperCase())}
                      className={`${bareCls} uppercase`}
                    />
                  </Field>
                  <Field label="Bairro" required span="col-span-12 md:col-span-4">
                    <input
                      name="bairro"
                      required
                      value={bairro}
                      onChange={(e) => setBairro(e.target.value.toUpperCase())}
                      className={`${bareCls} uppercase`}
                    />
                  </Field>
                  <Field label="Cidade" required span="col-span-6 md:col-span-3">
                    <input
                      name="cidade"
                      required
                      value={cidade}
                      onChange={(e) => setCidade(e.target.value.toUpperCase())}
                      className={`${bareCls} uppercase`}
                    />
                  </Field>
                  <Field label="UF" required span="col-span-6 md:col-span-1">
                    <input
                      name="estado"
                      required
                      maxLength={2}
                      value={estado}
                      onChange={(e) => setEstado(e.target.value.toUpperCase())}
                      className={`${bareCls} uppercase`}
                    />
                  </Field>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setAberto(false)}
                  className="px-5 py-3 rounded-xl text-sm font-bold text-iw-navy border border-iw-border hover:bg-iw-bg transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={pending || !!cpfError}
                  className="flex-1 inline-flex items-center justify-center gap-2 bg-[#E88D0C] hover:opacity-90 disabled:opacity-50 text-white font-bold text-sm py-3 rounded-xl transition-opacity border border-black"
                >
                  {pending ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" /> Matriculando...
                    </>
                  ) : (
                    <>
                      <Send className="w-4 h-4" /> Matricular
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
