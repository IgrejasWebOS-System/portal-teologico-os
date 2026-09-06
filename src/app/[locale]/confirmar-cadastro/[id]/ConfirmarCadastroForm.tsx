"use client";

import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { Camera, Loader2, AlertTriangle, CheckCircle2, Send, User, MapPin, ImageIcon, X, RotateCcw, PenLine, Eraser, FileText, ChevronLeft, Search, Check } from "lucide-react";
import { confirmarCadastroAction } from "./actions";

interface Aluno {
  id: string;
  nome_completo: string;
  cpf: string | null;
  matricula: string;
  curso_pretendido: string | null;
  telefone: string | null;
  email: string | null;
}

// E-mail placeholder gerado pela Ficha Rápida quando a secretaria não digita
// um e-mail real na hora (ver ficha-rapida/actions.ts) — se o aluno já
// chegou aqui com um e-mail de verdade (digitado na Ficha Rápida ou vindo
// de outro fluxo), não faz sentido perguntar de novo.
function isEmailPlaceholder(email: string | null): boolean {
  return !email || email.endsWith("@cetadp.pendente.br");
}

interface SelectItem {
  id: string;
  name: string;
}

type Municipio = { nome: string; uf: string };

// O destaque forte (borda + fundo dourados) segue o campo que está com o
// foco — ou seja, o PRÓXIMO campo a preencher — via :focus-within, que o
// navegador aplica sozinho assim que o campo recebe foco (nenhum JS
// precisa decidir isso). Campo já preenchido, mas sem foco, fica neutro
// e ganha só um ícone de check ao lado do rótulo (ver Field).
const boxCls =
  "border border-iw-border rounded-xl px-3.5 pt-1.5 pb-2 bg-white focus-within:border-iw-gold focus-within:ring-2 focus-within:ring-iw-gold/40 focus-within:bg-iw-gold/[0.06] transition-colors";
const boxFilledCls =
  "border border-iw-gold/40 rounded-xl px-3.5 pt-1.5 pb-2 bg-white focus-within:border-iw-gold focus-within:ring-2 focus-within:ring-iw-gold/40 focus-within:bg-iw-gold/[0.06] transition-colors";
const boxLabelCls = "block text-[10px] font-extrabold text-iw-muted uppercase tracking-wider mb-0.5";
const bareCls = "w-full bg-transparent border-none p-0 text-sm text-iw-navy placeholder-iw-muted/70 focus:outline-none focus:ring-0";
const bareSelectCls = `${bareCls} cursor-pointer`;

// Depois que a pessoa escolhe uma opção (select nativo ou item da lista em
// tela cheia), pula sozinho pro próximo campo preenchível do formulário —
// evita ter que tocar duas vezes (uma pra escolher, outra pra sair do
// campo) em cada seleção.
// Redimensiona/comprime a foto no navegador antes de enviar — uma foto
// tirada direto da galeria do celular pode vir com 5-10 MB (câmera de
// 12+ MP), o que estoura o limite de tamanho da Server Action e deixa o
// upload lento em dados móveis. A câmera ao vivo (CameraCapture) já sai
// leve, então só o input de arquivo (galeria) passa por aqui.
async function comprimirFoto(file: File, ladoMaximo = 1280, qualidade = 0.82): Promise<File> {
  try {
    const bitmap = await createImageBitmap(file);
    const escala = Math.min(1, ladoMaximo / Math.max(bitmap.width, bitmap.height));
    const w = Math.round(bitmap.width * escala);
    const h = Math.round(bitmap.height * escala);
    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d");
    if (!ctx) return file;
    ctx.drawImage(bitmap, 0, 0, w, h);
    const blob: Blob | null = await new Promise((resolve) => canvas.toBlob(resolve, "image/jpeg", qualidade));
    if (!blob) return file;
    return new File([blob], `foto-${Date.now()}.jpg`, { type: "image/jpeg" });
  } catch {
    // se a compressão falhar por algum motivo, segue com o arquivo original
    // — melhor arriscar um upload grande do que travar o cadastro
    return file;
  }
}

function focarProximoCampo(atual: HTMLElement) {
  const form = atual.closest("form");
  if (!form) return;
  // A busca pelo "próximo campo" só pode rodar DEPOIS que a tela cheia de
  // busca (SeletorBuscaTelaCheia) já tiver saído do ar — se rodar antes
  // (ex.: no mesmo instante em que a pessoa toca numa opção), ela ainda
  // encontra os botões da própria tela cheia no meio da lista, aponta pro
  // elemento errado, e quando a tela fecha logo depois o foco se perde e a
  // cadeia de avanço automático para ali. Por isso a busca inteira (não só
  // o .focus()) fica dentro do setTimeout.
  setTimeout(() => {
    const focaveis = Array.from(
      form.querySelectorAll<HTMLElement>("input, select, textarea, button")
    ).filter((el) => {
      if (el.hasAttribute("disabled")) return false;
      if (el.tabIndex === -1) return false;
      if ((el as HTMLInputElement).type === "hidden") return false;
      if (el.offsetParent === null) return false; // escondido (ex.: input de arquivo atrás de um label)
      return true;
    });
    const idx = focaveis.indexOf(atual);
    if (idx > -1 && idx < focaveis.length - 1) {
      focaveis[idx + 1]?.focus();
    }
  }, 30);
}

function Field({
  label, required, span, filled, children,
}: {
  label: string; required?: boolean; span?: string; filled?: boolean; children: React.ReactNode;
}) {
  return (
    <div className={`${filled ? boxFilledCls : boxCls} ${span ?? ""}`}>
      <div className="flex items-center justify-between gap-1">
        <label className={boxLabelCls}>{label}{required && " *"}</label>
        {filled && <Check className="w-3 h-3 text-iw-gold shrink-0" aria-hidden="true" />}
      </div>
      {children}
    </div>
  );
}

function maskDate(raw: string): string {
  let v = raw.replace(/\D/g, "").slice(0, 8);
  if (v.length > 4) v = `${v.slice(0, 2)}/${v.slice(2, 4)}/${v.slice(4)}`;
  else if (v.length > 2) v = `${v.slice(0, 2)}/${v.slice(2)}`;
  return v;
}

function dateBrToIso(br: string): string {
  if (br.length !== 10) return "";
  const [d, m, y] = br.split("/");
  return `${y}-${m}-${d}`;
}

// Amostragem grande da data por extenso ("12 de mai. de 1967"), atualizando
// conforme a pessoa digita — recria em CSS/JS o visual que o picker nativo
// de <input type="date"> mostrava, já que trocamos o calendário nativo por
// um campo de texto com máscara (pra não abrir mais o calendário, e não vir
// pré-preenchido com a data de hoje).
function dataPorExtenso(br: string): string {
  if (br.length !== 10) return "";
  const [d, m, y] = br.split("/");
  const dia = Number(d), mes = Number(m), ano = Number(y);
  if (!dia || !mes || !ano) return "";
  const data = new Date(ano, mes - 1, dia);
  if (data.getDate() !== dia || data.getMonth() !== mes - 1) return "";
  return data.toLocaleDateString("pt-BR", { day: "numeric", month: "short", year: "numeric" });
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

interface ItemSelecao {
  id: string;
  label: string;
  sublabel?: string;
}

// Seletor em tela cheia com busca — substitui o dropdown pequeno de antes,
// que no celular ficava escondido atrás do teclado. Abre por cima de tudo
// (igual ao picker nativo de <select>), com o campo de busca já em foco no
// topo, então a lista filtrada some pra debaixo do teclado. Se a pessoa
// digitar e não achar nada na lista (ex.: profissão fora do cadastro), dá
// pra usar o texto digitado mesmo assim quando `permitirLivre` está ligado.
function SeletorBuscaTelaCheia({
  titulo, valorInicial, itens, onFechar, onSelecionar, placeholder, permitirLivre,
}: {
  titulo: string;
  valorInicial: string;
  itens: ItemSelecao[];
  onFechar: () => void;
  onSelecionar: (item: ItemSelecao) => void;
  placeholder?: string;
  permitirLivre?: boolean;
}) {
  const [busca, setBusca] = useState(valorInicial);
  const inputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const resultados = useMemo(() => {
    const q = busca.trim().toLowerCase();
    if (!q) return itens.slice(0, 50);
    return itens.filter((i) => i.label.toLowerCase().startsWith(q)).slice(0, 50);
  }, [busca, itens]);

  return (
    <div className="fixed inset-0 z-50 bg-white flex flex-col">
      <div className="flex items-center gap-1 p-2 border-b border-iw-border shrink-0">
        <button
          type="button"
          onClick={onFechar}
          className="p-2 text-iw-muted hover:text-iw-navy shrink-0"
          aria-label="Fechar"
        >
          <ChevronLeft className="w-5 h-5" />
        </button>
        <Search className="w-4 h-4 text-iw-muted shrink-0" />
        <input
          ref={inputRef}
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
          placeholder={placeholder ?? `Buscar ${titulo.toLowerCase()}...`}
          autoComplete="off"
          className="flex-1 text-sm text-iw-navy placeholder-iw-muted/70 focus:outline-none py-2 bg-transparent"
        />
      </div>

      <ul className="flex-1 overflow-auto">
        {resultados.length === 0 && (
          <li className="px-4 py-6 text-center text-sm text-iw-muted">
            Nenhum resultado encontrado{permitirLivre ? " — pode usar o botão abaixo" : ""}.
          </li>
        )}
        {resultados.map((item) => (
          <li key={item.id} className="border-b border-iw-border/60">
            <button
              type="button"
              onClick={() => onSelecionar(item)}
              className="w-full text-left px-4 py-3.5 text-sm text-iw-navy hover:bg-iw-bg active:bg-iw-gold/10"
            >
              {item.label}
              {item.sublabel && <span className="text-iw-muted text-xs"> — {item.sublabel}</span>}
            </button>
          </li>
        ))}
      </ul>

      {permitirLivre && busca.trim().length > 0 && (
        <div className="p-3 border-t border-iw-border shrink-0">
          <button
            type="button"
            onClick={() => onSelecionar({ id: busca.trim(), label: busca.trim() })}
            className="w-full text-center text-xs font-bold text-iw-navy bg-iw-gold/10 hover:bg-iw-gold/20 px-4 py-3 rounded-xl transition-colors"
          >
            Usar &ldquo;{busca.trim()}&rdquo; mesmo assim
          </button>
        </div>
      )}
    </div>
  );
}

// Campo "de escolha" — mostra um botão/campo somente-leitura que abre o
// SeletorBuscaTelaCheia ao tocar, em vez de teclado + dropdown pequeno.
function CampoDeEscolha({
  label, name, itens, placeholder, required, permitirLivre,
}: {
  label: string;
  name: string;
  itens: ItemSelecao[];
  placeholder?: string;
  required?: boolean;
  permitirLivre?: boolean;
}) {
  const [valor, setValor] = useState("");
  const [aberto, setAberto] = useState(false);
  const inputRef = useRef<HTMLInputElement | null>(null);

  return (
    <Field label={label} required={required} filled={valor.length > 0}>
      <input
        ref={inputRef}
        name={name}
        value={valor}
        readOnly
        onClick={() => setAberto(true)}
        placeholder={placeholder}
        className={`${bareCls} cursor-pointer`}
      />
      {aberto && (
        <SeletorBuscaTelaCheia
          titulo={label}
          valorInicial={valor}
          itens={itens}
          permitirLivre={permitirLivre}
          placeholder={placeholder}
          onFechar={() => setAberto(false)}
          onSelecionar={(item) => {
            setValor(item.label);
            setAberto(false);
            if (inputRef.current) focarProximoCampo(inputRef.current);
          }}
        />
      )}
    </Field>
  );
}

// Naturalidade — igual ao CampoDeEscolha, mas ao escolher uma cidade
// também define a UF correspondente (o UF de nascimento vira preenchido
// sozinho, sem a pessoa precisar digitar de novo).
function CampoNaturalidade({
  municipios, onSelecionarCidade,
}: {
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
    <Field label="Naturalidade — cidade" filled={valor.length > 0}>
      <input
        ref={inputRef}
        value={valor}
        readOnly
        onClick={() => setAberto(true)}
        placeholder="Cidade onde nasceu"
        className={`${bareCls} cursor-pointer`}
      />
      {aberto && (
        <SeletorBuscaTelaCheia
          titulo="Naturalidade"
          valorInicial={valor}
          itens={itens}
          permitirLivre
          placeholder="Cidade onde nasceu"
          onFechar={() => setAberto(false)}
          onSelecionar={(item) => {
            const [nome, uf] = item.id.includes("|") ? item.id.split("|") : [item.label, ""];
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

// Captura de foto pela câmera (ao vivo, via getUserMedia) — funciona tanto
// no celular (câmera frontal/traseira) quanto no desktop (webcam padrão).
// Requer contexto seguro (HTTPS ou localhost); em http://<IP-de-rede>:3000
// o navegador bloqueia getUserMedia, então mostramos um aviso e deixamos o
// botão "Escolher arquivo" (input file comum) como alternativa sempre disponível.
function CameraCapture({ onCapturar }: { onCapturar: (file: File) => void }) {
  const [aberta, setAberta] = useState(false);
  const [erro, setErro] = useState("");
  const [facingMode, setFacingMode] = useState<"user" | "environment">("user");
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const pararStream = () => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
  };

  const abrirCamera = async (modo: "user" | "environment" = facingMode) => {
    setErro("");
    if (!navigator.mediaDevices?.getUserMedia) {
      setErro("Este navegador/conexão não permite acessar a câmera diretamente. Use \"Escolher arquivo\" abaixo.");
      return;
    }
    try {
      pararStream();
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: modo },
        audio: false,
      });
      streamRef.current = stream;
      setAberta(true);
      // videoRef só existe depois do próximo render (aberta=true)
      requestAnimationFrame(() => {
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.play().catch(() => {});
        }
      });
    } catch {
      setErro("Não foi possível abrir a câmera (permissão negada ou indisponível). Use \"Escolher arquivo\" abaixo.");
      setAberta(false);
    }
  };

  const fecharCamera = () => {
    pararStream();
    setAberta(false);
  };

  const trocarCamera = () => {
    const novo = facingMode === "user" ? "environment" : "user";
    setFacingMode(novo);
    abrirCamera(novo);
  };

  const capturar = () => {
    const video = videoRef.current;
    if (!video) return;
    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth || 480;
    canvas.height = video.videoHeight || 480;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    canvas.toBlob(
      (blob) => {
        if (!blob) return;
        const file = new File([blob], `foto-${Date.now()}.jpg`, { type: "image/jpeg" });
        onCapturar(file);
        fecharCamera();
      },
      "image/jpeg",
      0.9
    );
  };

  useEffect(() => () => pararStream(), []);

  return (
    <>
      <div className="flex flex-col items-center gap-2 w-full">
        {erro && (
          <p className="text-[11px] text-iw-error text-center px-4">{erro}</p>
        )}
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => abrirCamera()}
            className="inline-flex items-center gap-1.5 text-xs font-bold text-iw-navy bg-iw-gold/10 hover:bg-iw-gold/20 px-3.5 py-2 rounded-lg transition-colors"
          >
            <Camera className="w-3.5 h-3.5" /> Tirar foto
          </button>
        </div>
      </div>

      {aberta && (
        <div className="fixed inset-0 z-50 bg-black/90 flex flex-col items-center justify-center gap-4 px-4">
          <div className="relative w-full max-w-sm aspect-square rounded-2xl overflow-hidden bg-black">
            <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-cover" />
          </div>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={fecharCamera}
              className="inline-flex items-center gap-1.5 text-xs font-bold text-white bg-white/10 hover:bg-white/20 px-4 py-2.5 rounded-xl transition-colors"
            >
              <X className="w-4 h-4" /> Cancelar
            </button>
            <button
              type="button"
              onClick={capturar}
              className="inline-flex items-center gap-1.5 text-sm font-bold text-white bg-[#E88D0C] hover:opacity-90 px-6 py-2.5 rounded-xl transition-opacity border border-black"
            >
              <Camera className="w-4 h-4" /> Capturar
            </button>
            <button
              type="button"
              onClick={trocarCamera}
              title="Trocar câmera"
              className="inline-flex items-center gap-1.5 text-xs font-bold text-white bg-white/10 hover:bg-white/20 px-4 py-2.5 rounded-xl transition-colors"
            >
              <RotateCcw className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </>
  );
}

// Assinatura eletrônica simples: a pessoa desenha na tela (dedo ou mouse) e
// isso vira uma imagem PNG embutida no PDF do formulário, junto com
// timestamp/IP/user-agent como evidência de consentimento (ver actions.ts).
function SignaturePad({ onChange }: { onChange: (dataUrl: string | null) => void }) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const drawingRef = useRef(false);
  const hasDrawnRef = useRef(false);
  const [vazio, setVazio] = useState(true);

  const getPos = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current!;
    const rect = canvas.getBoundingClientRect();
    return {
      x: (e.clientX - rect.left) * (canvas.width / rect.width),
      y: (e.clientY - rect.top) * (canvas.height / rect.height),
    };
  };

  const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;
    canvas.setPointerCapture(e.pointerId);
    drawingRef.current = true;
    const { x, y } = getPos(e);
    ctx.beginPath();
    ctx.moveTo(x, y);
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!drawingRef.current) return;
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!ctx) return;
    const { x, y } = getPos(e);
    ctx.lineWidth = 2.2;
    ctx.lineCap = "round";
    ctx.strokeStyle = "#111827";
    ctx.lineTo(x, y);
    ctx.stroke();
    if (!hasDrawnRef.current) {
      hasDrawnRef.current = true;
      setVazio(false);
    }
  };

  const finalizarTraco = () => {
    drawingRef.current = false;
    const canvas = canvasRef.current;
    if (!canvas) return;
    onChange(hasDrawnRef.current ? canvas.toDataURL("image/png") : null);
  };

  const limpar = () => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (canvas && ctx) ctx.clearRect(0, 0, canvas.width, canvas.height);
    hasDrawnRef.current = false;
    setVazio(true);
    onChange(null);
  };

  return (
    <div className="space-y-1.5">
      <canvas
        ref={canvasRef}
        width={600}
        height={180}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={finalizarTraco}
        onPointerLeave={finalizarTraco}
        className="w-full h-36 bg-white border border-iw-border rounded-xl touch-none cursor-crosshair"
      />
      <div className="flex items-center justify-between">
        <p className="text-[11px] text-iw-muted inline-flex items-center gap-1">
          <PenLine className="w-3 h-3" /> Assine com o dedo ou o mouse
        </p>
        {!vazio && (
          <button
            type="button"
            onClick={limpar}
            className="inline-flex items-center gap-1 text-[11px] font-bold text-iw-muted hover:text-iw-navy"
          >
            <Eraser className="w-3 h-3" /> Limpar
          </button>
        )}
      </div>
    </div>
  );
}

function maskPhone(raw: string): string {
  let v = raw.replace(/\D/g, "").slice(0, 11);
  if (v.length > 10) v = `(${v.slice(0, 2)}) ${v.slice(2, 7)}-${v.slice(7)}`;
  else if (v.length > 6) v = `(${v.slice(0, 2)}) ${v.slice(2, 6)}-${v.slice(6)}`;
  else if (v.length > 2) v = `(${v.slice(0, 2)}) ${v.slice(2)}`;
  else v = v.length ? `(${v}` : v;
  return v;
}

export default function ConfirmarCadastroForm({
  aluno, escolaridades, profissoes,
}: {
  aluno: Aluno;
  escolaridades: SelectItem[];
  profissoes: SelectItem[];
}) {
  const emailJaConhecido = !isEmailPlaceholder(aluno.email);
  const [telefone, setTelefone] = useState(aluno.telefone ?? "");
  const [cep, setCep] = useState("");
  const [endereco, setEndereco] = useState("");
  const [bairro, setBairro] = useState("");
  const [cidade, setCidade] = useState("");
  const [estado, setEstado] = useState("");
  const [loadingCep, setLoadingCep] = useState(false);
  const [naturalidadeCidade, setNaturalidadeCidade] = useState("");
  const [naturalidadeEstado, setNaturalidadeEstado] = useState("");
  const [genero, setGenero] = useState("");
  const [estadoCivil, setEstadoCivil] = useState("");
  const [escolaridade, setEscolaridade] = useState("");
  const [dataNascimento, setDataNascimento] = useState("");
  const [municipios, setMunicipios] = useState<Municipio[]>([]);
  const [fotoPreview, setFotoPreview] = useState("");
  const [fotoFile, setFotoFile] = useState<File | null>(null);
  const [assinaturaDataUrl, setAssinaturaDataUrl] = useState<string | null>(null);
  const [mostrarAssinatura, setMostrarAssinatura] = useState(false);
  const [erro, setErro] = useState("");
  const [concluido, setConcluido] = useState(false);
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

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

  const handleBlurCep = async () => {
    const cepLimpo = cep.replace(/\D/g, "");
    if (cepLimpo.length !== 8) return;
    setLoadingCep(true);
    try {
      const res = await fetch(`https://viacep.com.br/ws/${cepLimpo}/json/`);
      const data = await res.json();
      if (!data.erro) {
        setEndereco(data.logradouro ?? endereco);
        setBairro(data.bairro ?? bairro);
        setCidade(data.localidade ?? cidade);
        setEstado(data.uf ?? estado);
      }
    } catch {
      // silencioso — os campos continuam editáveis manualmente
    } finally {
      setLoadingCep(false);
    }
  };

  const handleFoto = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const comprimida = await comprimirFoto(file);
    setFotoFile(comprimida);
    setFotoPreview(URL.createObjectURL(comprimida));
  };

  const handleSubmit = (fd: FormData) => {
    fd.set("telefone", telefone);
    fd.set("data_nascimento", dateBrToIso(dataNascimento));
    fd.set("naturalidade_cidade", naturalidadeCidade);
    fd.set("naturalidade_estado", naturalidadeEstado);
    fd.set("cep", cep);
    fd.set("endereco", endereco);
    fd.set("bairro", bairro);
    fd.set("cidade", cidade);
    fd.set("estado", estado);
    // Assinatura é opcional — se a pessoa não desenhou nada, segue sem ela
    // (o PDF sai sem a seção de assinatura, mas o cadastro é salvo normal).
    if (assinaturaDataUrl) fd.set("assinatura", assinaturaDataUrl);
    if (fotoFile) fd.set("foto", fotoFile);
    startTransition(async () => {
      const res = await confirmarCadastroAction(aluno.id, fd);
      if (!res.ok) {
        setErro(res.erro);
        return;
      }
      setErro("");
      setPdfUrl(res.pdfUrl);
      setConcluido(true);
    });
  };

  if (concluido) {
    return (
      <div className="min-h-screen flex items-center justify-center px-6 text-center">
        <div className="max-w-sm space-y-3">
          <CheckCircle2 className="w-12 h-12 text-iw-gold mx-auto" />
          <p className="text-iw-navy font-bold text-lg">Cadastro confirmado!</p>
          <p className="text-sm text-iw-muted">
            Matrícula {aluno.matricula} concluída. Enviamos um e-mail de acesso ao portal — confira sua
            caixa de entrada (e spam) pra criar sua senha.
          </p>
          {pdfUrl && (
            <a
              href={pdfUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 bg-[#E88D0C] hover:opacity-90 text-white font-bold px-5 py-3 rounded-xl text-sm transition-opacity border border-black"
            >
              <FileText className="w-4 h-4" /> Baixar formulário assinado (PDF)
            </a>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-lg mx-auto px-4 py-8 space-y-5">
      <div className="text-center space-y-1">
        <p className="text-xs font-bold uppercase tracking-wider text-iw-gold">CETADP — Confirmação de cadastro</p>
        <h1 className="text-lg font-bold text-iw-navy">{aluno.nome_completo}</h1>
        <p className="text-xs text-iw-muted">
          Matrícula {aluno.matricula}{aluno.curso_pretendido ? ` — ${aluno.curso_pretendido}` : ""}
        </p>
      </div>

      {/* Wrapper sempre montado (mesmo vazio) — importante: se o banner de erro
          aparecesse/sumisse direto como irmão do <form> sem esse container,
          a reconciliação do React (lista sem key) trocaria o tipo do elemento
          nessa posição e remontaria o formulário inteiro, apagando tudo que
          o aluno já tinha preenchido nos campos não controlados. */}
      <div>
        {erro && (
          <div className="flex items-center gap-3 bg-iw-error/8 border border-iw-error/30 text-iw-error px-4 py-3 rounded-xl text-sm">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            <span className="font-medium">{erro}</span>
          </div>
        )}
      </div>

      <form action={handleSubmit} className="space-y-4">
        {/* Foto — captura ao vivo pela câmera (mobile ou webcam), com opção de
            escolher um arquivo já existente como alternativa sempre disponível */}
        <div className="flex flex-col items-center gap-3">
          <div className="w-28 h-28 rounded-full border-[1.5px] border-iw-gold/40 flex items-center justify-center relative overflow-hidden">
            {fotoPreview ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={fotoPreview} alt="Sua foto" className="w-full h-full object-cover" />
            ) : (
              <div className="flex flex-col items-center gap-1 text-iw-muted">
                <Camera className="w-7 h-7" />
                <span className="text-[9px] font-semibold uppercase text-center px-2">Sua foto</span>
              </div>
            )}
          </div>

          <CameraCapture
            onCapturar={(file) => {
              setFotoFile(file);
              setFotoPreview(URL.createObjectURL(file));
            }}
          />

          <label className="inline-flex items-center gap-1.5 text-xs font-bold text-iw-muted hover:text-iw-navy cursor-pointer transition-colors">
            <ImageIcon className="w-3.5 h-3.5" /> Escolher arquivo
            <input type="file" accept="image/*" onChange={handleFoto} className="hidden" />
          </label>

          <p className="text-[11px] text-iw-muted text-center px-4">
            Tire uma foto agora ou escolha uma já existente no celular/computador
          </p>
        </div>

        {/* Dados pessoais */}
        <div className="bg-iw-surface rounded-2xl border border-iw-border shadow-sm p-6 space-y-3">
          <SectionHeader icon={User} label="Dados Pessoais" />

          {emailJaConhecido ? (
            <>
              <input type="hidden" name="email" value={aluno.email ?? ""} />
              <Field label="E-mail" filled>
                <p className={`${bareCls} text-iw-navy`}>{aluno.email}</p>
              </Field>
            </>
          ) : (
            <Field label="E-mail" required>
              <input name="email" type="email" required placeholder="seuemail@exemplo.com" className={bareCls} />
            </Field>
          )}
          <Field label="Telefone">
            <input
              value={telefone}
              onChange={(e) => setTelefone(maskPhone(e.target.value))}
              placeholder="(00) 00000-0000"
              className={bareCls}
            />
          </Field>

          <div className="grid grid-cols-2 gap-3">
            <Field label="Data de nascimento" filled={dataNascimento.length === 10}>
              <input
                value={dataNascimento}
                onChange={(e) => setDataNascimento(maskDate(e.target.value))}
                inputMode="numeric"
                placeholder="DD/MM/AAAA"
                maxLength={10}
                className={bareCls}
              />
              {dataPorExtenso(dataNascimento) && (
                <p className="text-[13px] font-medium text-iw-navy mt-0.5">{dataPorExtenso(dataNascimento)}</p>
              )}
            </Field>
            <Field label="Sexo" filled={genero.length > 0}>
              <select
                name="genero"
                value={genero}
                onChange={(e) => { setGenero(e.target.value); focarProximoCampo(e.currentTarget); }}
                className={bareSelectCls}
              >
                <option value="">Selecione...</option>
                <option value="M">Masculino</option>
                <option value="F">Feminino</option>
              </select>
            </Field>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <Field label="RG">
              <input name="rg" className={bareCls} />
            </Field>
            <Field label="Órgão">
              <input name="rg_orgao_emissor" defaultValue="SSP" className={bareCls} />
            </Field>
            <Field label="UF">
              <input name="rg_uf" maxLength={2} defaultValue="SP" className={`${bareCls} uppercase`} />
            </Field>
          </div>

          <Field label="Estado civil" filled={estadoCivil.length > 0}>
            <select
              name="estado_civil"
              value={estadoCivil}
              onChange={(e) => { setEstadoCivil(e.target.value); focarProximoCampo(e.currentTarget); }}
              className={bareSelectCls}
            >
              <option value="">Selecione...</option>
              <option value="Solteiro(a)">Solteiro(a)</option>
              <option value="Casado(a)">Casado(a)</option>
              <option value="Divorciado(a)">Divorciado(a)</option>
              <option value="Viúvo(a)">Viúvo(a)</option>
            </select>
          </Field>

          <div className="grid grid-cols-2 gap-3">
            <Field label="Escolaridade" filled={escolaridade.length > 0}>
              <select
                name="escolaridade"
                value={escolaridade}
                onChange={(e) => { setEscolaridade(e.target.value); focarProximoCampo(e.currentTarget); }}
                className={bareSelectCls}
              >
                <option value="">Selecione...</option>
                {escolaridades.map((e) => <option key={e.id} value={e.name}>{e.name}</option>)}
              </select>
            </Field>
            <CampoDeEscolha
              label="Profissão"
              name="profissao"
              itens={profissoes.map((p) => ({ id: p.id, label: p.name }))}
              placeholder="Digite pra buscar"
              permitirLivre
            />
          </div>

          <CampoNaturalidade
            municipios={municipios}
            onSelecionarCidade={(nome, uf) => { setNaturalidadeCidade(nome); setNaturalidadeEstado(uf); }}
          />
          <div className="grid grid-cols-2 gap-3">
            <Field label="UF de nascimento">
              <input
                value={naturalidadeEstado}
                maxLength={2}
                onChange={(e) => setNaturalidadeEstado(e.target.value.toUpperCase())}
                className={`${bareCls} uppercase`}
              />
            </Field>
            <Field label="Nacionalidade">
              <input name="nacionalidade" defaultValue="Brasileira" className={bareCls} />
            </Field>
          </div>

          <Field label="Cônjuge (se houver)">
            <input
              name="nome_conjuge"
              autoComplete="off"
              readOnly
              onFocus={(e) => e.currentTarget.removeAttribute("readonly")}
              className={bareCls}
            />
          </Field>

          <Field label="Nome da mãe">
            <input
              name="nome_mae"
              autoComplete="off"
              readOnly
              onFocus={(e) => e.currentTarget.removeAttribute("readonly")}
              className={bareCls}
            />
          </Field>
          <Field label="Nome do pai">
            <input
              name="nome_pai"
              autoComplete="off"
              readOnly
              onFocus={(e) => e.currentTarget.removeAttribute("readonly")}
              className={bareCls}
            />
          </Field>
        </div>

        {/* Endereço */}
        <div className="bg-iw-surface rounded-2xl border border-iw-border shadow-sm p-6 space-y-3">
          <SectionHeader icon={MapPin} label="Endereço" />

          <div className="grid grid-cols-2 gap-3">
            <Field label="CEP">
              <input
                value={cep}
                maxLength={9}
                onChange={(e) => {
                  let v = e.target.value.replace(/\D/g, "").slice(0, 8);
                  if (v.length > 5) v = `${v.slice(0, 5)}-${v.slice(5)}`;
                  setCep(v);
                }}
                onBlur={handleBlurCep}
                placeholder={loadingCep ? "Buscando..." : "00000-000"}
                className={bareCls}
              />
            </Field>
            <Field label="Número">
              <input name="endereco_numero" className={bareCls} />
            </Field>
          </div>
          <Field label="Endereço">
            <input value={endereco} onChange={(e) => setEndereco(e.target.value)} className={bareCls} />
          </Field>
          <Field label="Complemento">
            <input name="endereco_complemento" className={bareCls} />
          </Field>
          <div className="grid grid-cols-3 gap-3">
            <Field label="Bairro">
              <input value={bairro} onChange={(e) => setBairro(e.target.value)} className={bareCls} />
            </Field>
            <Field label="Cidade">
              <input value={cidade} onChange={(e) => setCidade(e.target.value)} className={bareCls} />
            </Field>
            <Field label="UF">
              <input value={estado} maxLength={2} onChange={(e) => setEstado(e.target.value.toUpperCase())} className={`${bareCls} uppercase text-center`} />
            </Field>
          </div>
        </div>

        {/* Assinatura eletrônica — opcional, começa oculta (só um botão) pra
            não obrigar quem só quer testar/preencher rápido a assinar toda
            hora. Vira imagem embutida no PDF do formulário, junto com
            timestamp/IP como evidência de consentimento, só quando usada. */}
        <div className="bg-iw-surface rounded-2xl border border-iw-border shadow-sm p-6 space-y-3">
          <SectionHeader icon={PenLine} label="Assinatura (opcional)" />
          {mostrarAssinatura ? (
            <SignaturePad onChange={setAssinaturaDataUrl} />
          ) : (
            <button
              type="button"
              onClick={() => setMostrarAssinatura(true)}
              className="w-full inline-flex items-center justify-center gap-2 text-xs font-bold text-iw-navy bg-iw-gold/10 hover:bg-iw-gold/20 px-4 py-3 rounded-xl transition-colors"
            >
              <PenLine className="w-3.5 h-3.5" /> Quero assinar agora
            </button>
          )}
          <p className="text-[11px] text-iw-muted">
            Assinar é opcional — não é necessário para concluir o cadastro.
          </p>
        </div>

        <label className="flex items-start gap-3 cursor-pointer pt-2">
          <input
            type="checkbox"
            name="consentimento_lgpd_aceito"
            value="true"
            required
            className="mt-0.5 w-4 h-4 accent-iw-gold shrink-0"
          />
          <span className="text-xs text-iw-navy">
            Declaro que estou ciente das informações acima e autorizo o uso e tratamento dos meus dados
            pessoais para cadastro, de acordo com os artigos 7º e 11 da Lei nº 13.709/2018 (LGPD).
          </span>
        </label>

        <button
          type="submit"
          disabled={isPending}
          className="w-full inline-flex items-center justify-center gap-2 bg-[#E88D0C] hover:opacity-90 disabled:opacity-50 text-white font-bold px-6 py-3.5 rounded-xl text-sm transition-opacity border border-black"
        >
          {isPending ? (
            <><Loader2 className="w-4 h-4 animate-spin" /> Enviando...</>
          ) : (
            <><Send className="w-4 h-4" /> Concluir cadastro</>
          )}
        </button>
      </form>
    </div>
  );
}
