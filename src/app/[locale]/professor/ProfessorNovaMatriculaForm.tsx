"use client";

import { useEffect, useState, useTransition } from "react";
import { UserPlus, User, MapPin, GraduationCap, Loader2, Send, X } from "lucide-react";
import { aplicarMaiusculaNoEvento } from "@/utils/uppercaseInput";
import { BuscaOuCriarInput } from "@/components/forms/BuscaOuCriarInput";
import { validarCPF } from "@/utils/cpf";

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
// ============================================================

const bareCls = "w-full bg-transparent border-none p-0 text-sm text-iw-navy placeholder-iw-muted/70 focus:outline-none focus:ring-0";
const bareSelectCls = `${bareCls} cursor-pointer`;
const boxCls = "border border-iw-navy rounded-xl px-3.5 pt-1.5 pb-2 bg-white focus-within:border-iw-gold focus-within:ring-2 focus-within:ring-iw-gold/40 focus-within:bg-iw-gold/[0.06] transition-colors";
const boxErrCls = "border border-iw-error rounded-xl px-3.5 pt-1.5 pb-2 bg-white focus-within:ring-2 focus-within:ring-iw-error/30 transition-colors";
const boxLabelCls = "block text-[10px] font-extrabold text-iw-muted uppercase tracking-wider mb-0.5";

function Field({
  label, required, span, error, children,
}: {
  label: string; required?: boolean; span?: string; error?: string; children: React.ReactNode;
}) {
  return (
    <div className={span ?? "col-span-12 md:col-span-3"}>
      <div className={error ? boxErrCls : boxCls}>
        <label className={boxLabelCls}>{label}{required && " *"}</label>
        {children}
      </div>
      {error && <p className="text-[11px] text-iw-error mt-1">{error}</p>}
    </div>
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

interface Props {
  action: (formData: FormData) => Promise<void> | void;
  turmasDoProfessor: TurmaOpcao[];
  profissoes: ProfissaoItem[];
}

export default function ProfessorNovaMatriculaForm({ action, turmasDoProfessor, profissoes }: Props) {
  const [pending, startTransition] = useTransition();
  const [aberto, setAberto] = useState(false);
  const [cpf, setCpf] = useState("");
  const [cpfError, setCpfError] = useState("");
  const [cep, setCep] = useState("");
  const [endereco, setEndereco] = useState("");
  const [enderecoComplemento, setEnderecoComplemento] = useState("");
  const [bairro, setBairro] = useState("");
  const [cidade, setCidade] = useState("");
  const [estado, setEstado] = useState("");
  const [loadingCep, setLoadingCep] = useState(false);
  const [cepError, setCepError] = useState("");

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
        onClick={() => setAberto(true)}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-[#FFFFFF] text-iw-navy border-[1.5px] border-[#CF8403] hover:bg-iw-gold/10 transition-colors shrink-0"
      >
        <UserPlus className="w-3.5 h-3.5" />
        Nova Matrícula
      </button>

      {aberto && (
        <div className="fixed inset-0 z-[60] flex items-start md:items-center justify-center p-3 md:p-6 overflow-y-auto">
          {/* Fundo escuro — clicar fora fecha sem enviar nada. */}
          <div className="fixed inset-0 bg-black/50" onClick={() => setAberto(false)} />

          <div className="relative w-full max-w-4xl bg-iw-surface border border-iw-gold rounded-2xl shadow-xl my-auto">
            <div className="flex items-center justify-between gap-2 px-5 py-3.5 border-b border-iw-border">
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

            <form action={handleSubmit} className="p-5 pt-4 space-y-5 max-h-[80vh] overflow-y-auto">
              <div className="space-y-3">
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
                <p className="text-[11px] text-iw-muted">
                  Só aparecem aqui as turmas já vinculadas a você (seção &ldquo;Minhas Turmas&rdquo;, acima). A
                  matrícula (se houver) e as mensalidades do curso são geradas automaticamente, com base no
                  preço já cadastrado em Financeiro — não precisa informar valor aqui.
                </p>
              </div>

              <div className="space-y-3">
                <SectionHeader icon={User} label="Dados pessoais" />
                <div className="grid grid-cols-12 gap-3">
                  <Field label="Nome completo" required span="col-span-12 md:col-span-6">
                    <input name="nome_completo" required onChange={aplicarMaiusculaNoEvento} className={`${bareCls} uppercase`} />
                  </Field>
                  <Field label="E-mail" required span="col-span-12 md:col-span-3">
                    <input name="email" type="email" required className={bareCls} />
                  </Field>
                  <Field label="Telefone" required span="col-span-12 md:col-span-3">
                    <input name="telefone" required placeholder="(00) 00000-0000" className={bareCls} />
                  </Field>
                </div>

                <div className="grid grid-cols-12 gap-3">
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
                  <Field label="RG" span="col-span-6 md:col-span-2">
                    <input name="rg" className={bareCls} />
                  </Field>
                  <Field label="Órgão" required span="col-span-6 md:col-span-2">
                    <input name="rg_orgao_emissor" required defaultValue="SSP" onChange={aplicarMaiusculaNoEvento} className={`${bareCls} uppercase`} />
                  </Field>
                  <Field label="UF do RG" required span="col-span-6 md:col-span-1">
                    <input name="rg_uf" required maxLength={2} defaultValue="SP" className={`${bareCls} uppercase`} />
                  </Field>
                  <Field label="Data de nascimento" required span="col-span-6 md:col-span-2">
                    <input name="data_nascimento" required type="date" className={bareCls} />
                  </Field>
                  <Field label="Sexo" required span="col-span-6 md:col-span-2">
                    <select name="genero" required defaultValue="" className={bareSelectCls}>
                      <option value="">Selecione...</option>
                      <option value="M">Masculino</option>
                      <option value="F">Feminino</option>
                    </select>
                  </Field>
                </div>

                <div className="grid grid-cols-12 gap-3">
                  <Field label="Estado civil" required span="col-span-6 md:col-span-3">
                    <select name="estado_civil" required defaultValue="" className={bareSelectCls}>
                      <option value="">Selecione...</option>
                      <option value="Solteiro(a)">Solteiro(a)</option>
                      <option value="Casado(a)">Casado(a)</option>
                      <option value="Divorciado(a)">Divorciado(a)</option>
                      <option value="Viúvo(a)">Viúvo(a)</option>
                    </select>
                  </Field>
                  <Field label="Escolaridade" required span="col-span-6 md:col-span-3">
                    <input name="escolaridade" required onChange={aplicarMaiusculaNoEvento} className={`${bareCls} uppercase`} />
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
                  <Field label="Nacionalidade" required span="col-span-6 md:col-span-3">
                    <input name="nacionalidade" required defaultValue="Brasileira" onChange={aplicarMaiusculaNoEvento} className={`${bareCls} uppercase`} />
                  </Field>
                </div>

                <div className="grid grid-cols-12 gap-3">
                  <Field label="Naturalidade — cidade" required span="col-span-8 md:col-span-4">
                    <input name="naturalidade_cidade" required onChange={aplicarMaiusculaNoEvento} className={`${bareCls} uppercase`} />
                  </Field>
                  <Field label="UF" required span="col-span-4 md:col-span-2">
                    <input name="naturalidade_estado" required maxLength={2} className={`${bareCls} uppercase`} />
                  </Field>
                  <Field label="Nome da mãe" required span="col-span-12 md:col-span-3">
                    <input name="nome_mae" required autoComplete="off" onChange={aplicarMaiusculaNoEvento} className={`${bareCls} uppercase`} />
                  </Field>
                  <Field label="Cônjuge (se houver)" span="col-span-6 md:col-span-3">
                    <input name="nome_conjuge" autoComplete="off" onChange={aplicarMaiusculaNoEvento} className={`${bareCls} uppercase`} />
                  </Field>
                  <Field label="Nome do pai" span="col-span-6 md:col-span-3">
                    <input name="nome_pai" autoComplete="off" onChange={aplicarMaiusculaNoEvento} className={`${bareCls} uppercase`} />
                  </Field>
                </div>
              </div>

              <div className="space-y-3">
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
