"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  ArrowLeft, FileSpreadsheet, CheckCircle2, AlertTriangle, XCircle,
  Loader2, UploadCloud,
} from "lucide-react";
import { importarMembrosCsvAction, type ImportarCsvRow } from "../actions";

type Church = { id: string; name: string };
type Role = { id: string; name: string; sigla: string | null };

// Colunas exatas geradas por scripts-prompts/extrair_membros.py
const COLUNAS_ESPERADAS = [
  "setor", "igreja", "cargo_sigla", "cargo_mapeado", "nome_completo",
  "matricula", "estado_civil", "data_nascimento", "idade", "telefone",
  "endereco", "bairro", "cidade", "uf", "cep", "aviso",
] as const;

type LinhaCsv = Record<(typeof COLUNAS_ESPERADAS)[number], string>;

type LinhaResolvida = ImportarCsvRow & { idade: string };

type Resumo = {
  total: number;
  inseridos: number;
  jaExistiam: number;
  semIgreja: number;
  semMatricula: number;
};

// Parser CSV RFC4180 minimo (respeita aspas e virgulas dentro de campos,
// exatamente o formato que csv.DictWriter do Python gera).
function parseCsv(texto: string): string[][] {
  const linhas: string[][] = [];
  let campo = "";
  let linha: string[] = [];
  let entreAspas = false;

  for (let i = 0; i < texto.length; i++) {
    const c = texto[i];
    if (entreAspas) {
      if (c === '"') {
        if (texto[i + 1] === '"') { campo += '"'; i++; }
        else entreAspas = false;
      } else {
        campo += c;
      }
    } else if (c === '"') {
      entreAspas = true;
    } else if (c === ",") {
      linha.push(campo);
      campo = "";
    } else if (c === "\n") {
      linha.push(campo);
      linhas.push(linha);
      linha = [];
      campo = "";
    } else if (c !== "\r") {
      campo += c;
    }
  }
  if (campo.length > 0 || linha.length > 0) {
    linha.push(campo);
    linhas.push(linha);
  }
  return linhas.filter((l) => l.some((v) => v.trim() !== ""));
}

export default function ImportarCsvView({ churches, roles }: { churches: Church[]; roles: Role[] }) {
  const [linhas, setLinhas] = useState<LinhaResolvida[]>([]);
  const [nomeArquivo, setNomeArquivo] = useState("");
  const [erroArquivo, setErroArquivo] = useState("");
  const [importando, setImportando] = useState(false);
  const [resultado, setResultado] = useState<{ resumo: Resumo; detalhes: Record<string, string[]> } | null>(null);

  const churchByName = useMemo(() => {
    const map = new Map<string, string>();
    for (const c of churches) map.set(c.name.trim().toUpperCase(), c.id);
    return map;
  }, [churches]);

  const roleByName = useMemo(() => {
    const map = new Map<string, string>();
    for (const r of roles) map.set(r.name.trim().toUpperCase(), r.id);
    return map;
  }, [roles]);

  const handleFile = async (file: File | undefined) => {
    if (!file) return;
    setErroArquivo("");
    setResultado(null);
    setNomeArquivo(file.name);

    const texto = await file.text();
    const linhasCsv = parseCsv(texto);
    if (linhasCsv.length < 2) {
      setErroArquivo("Arquivo vazio ou sem linhas de dados.");
      setLinhas([]);
      return;
    }

    const cabecalho = linhasCsv[0].map((h) => h.trim());
    const faltando = COLUNAS_ESPERADAS.filter((c) => !cabecalho.includes(c));
    if (faltando.length > 0) {
      setErroArquivo(`Cabeçalho não bate com o formato esperado. Faltando: ${faltando.join(", ")}.`);
      setLinhas([]);
      return;
    }

    const idx = (col: string) => cabecalho.indexOf(col);
    const resolvidas: LinhaResolvida[] = linhasCsv.slice(1).map((valores) => {
      const get = (col: (typeof COLUNAS_ESPERADAS)[number]) => (valores[idx(col)] ?? "").trim();
      const igreja = get("igreja");
      const cargoMapeado = get("cargo_mapeado");
      const cargoSigla = get("cargo_sigla");

      return {
        igreja,
        church_id: churchByName.get(igreja.toUpperCase()) ?? null,
        cargo_sigla: cargoSigla,
        cargo_mapeado: cargoMapeado,
        role_id: cargoMapeado ? roleByName.get(cargoMapeado.toUpperCase()) ?? null : null,
        nome_completo: get("nome_completo"),
        matricula: get("matricula"),
        estado_civil: get("estado_civil"),
        data_nascimento: get("data_nascimento"),
        idade: get("idade"),
        telefone: get("telefone"),
        endereco: get("endereco"),
        bairro: get("bairro"),
        cidade: get("cidade"),
        uf: get("uf"),
        cep: get("cep"),
        aviso: get("aviso"),
      };
    });

    setLinhas(resolvidas);
  };

  const semIgreja = linhas.filter((l) => !l.church_id).length;
  const semMatricula = linhas.filter((l) => l.church_id && !l.matricula.trim()).length;
  const comAviso = linhas.filter((l) => l.aviso).length;
  const prontasParaImportar = linhas.filter((l) => l.church_id && l.matricula.trim()).length;

  const handleImportar = async () => {
    setImportando(true);
    const resposta = await importarMembrosCsvAction(linhas);
    setImportando(false);
    if (resposta.resumo) {
      setResultado({ resumo: resposta.resumo, detalhes: resposta.detalhes ?? {} });
    } else {
      setErroArquivo(resposta.message ?? "Erro desconhecido ao importar.");
    }
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-20">
      <div className="flex items-center justify-between gap-4">
        <h1 className="text-2xl font-black text-iw-navy tracking-tight">Importar Membros via CSV</h1>
        <Link
          href="/dashboard/membros"
          className="inline-flex items-center gap-1.5 text-sm uppercase text-[#CF8403] font-semibold border-[2px] border-[#CF8403] rounded-lg px-2.5 py-1 bg-[#0D0D0D] hover:opacity-80 transition-opacity"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          VOLTAR
        </Link>
      </div>

      <div className="bg-iw-surface rounded-2xl border border-iw-gold shadow-sm p-6 space-y-4">
        <p className="text-sm text-iw-navy">
          Selecione o <code className="bg-iw-bg px-1.5 py-0.5 rounded text-xs">membros_extraidos.csv</code>{" "}
          gerado por <code className="bg-iw-bg px-1.5 py-0.5 rounded text-xs">scripts-prompts/pipeline.ps1</code>.
          Cada linha é conferida contra as igrejas (<code className="bg-iw-bg px-1.5 py-0.5 rounded text-xs">churches</code>)
          e cargos (<code className="bg-iw-bg px-1.5 py-0.5 rounded text-xs">ecclesiastical_roles</code>) já cadastrados
          neste ambiente antes de qualquer gravação. Nada é importado até você conferir a prévia e clicar em &ldquo;Importar&rdquo;.
        </p>

        <label className="flex flex-col items-center justify-center gap-2 border-2 border-dashed border-iw-border rounded-2xl py-10 cursor-pointer hover:border-iw-gold transition-colors bg-iw-bg/40">
          <UploadCloud className="w-8 h-8 text-iw-muted" />
          <span className="text-sm font-semibold text-iw-navy">
            {nomeArquivo || "Clique para selecionar o CSV"}
          </span>
          <span className="text-xs text-iw-muted">Formato: colunas iguais às do setor 001 (setor, igreja, cargo_sigla, ...)</span>
          <input
            type="file"
            accept=".csv,text/csv"
            className="hidden"
            onChange={(e) => handleFile(e.target.files?.[0])}
          />
        </label>

        {erroArquivo && (
          <div className="flex items-center gap-2 bg-iw-error-bg border border-iw-error/30 text-iw-error px-4 py-3 rounded-xl text-sm font-medium">
            <XCircle className="w-4 h-4 shrink-0" />
            {erroArquivo}
          </div>
        )}
      </div>

      {linhas.length > 0 && (
        <>
          <div className="grid grid-cols-4 gap-4">
            <div className="bg-iw-surface rounded-2xl border border-iw-gold p-4 text-center">
              <p className="text-xl font-black text-iw-navy">{linhas.length}</p>
              <p className="text-xs text-iw-muted">Linhas no CSV</p>
            </div>
            <div className="bg-iw-surface rounded-2xl border border-iw-success/30 p-4 text-center">
              <p className="text-xl font-black text-iw-success">{prontasParaImportar}</p>
              <p className="text-xs text-iw-muted">Prontas p/ importar</p>
            </div>
            <div className="bg-iw-surface rounded-2xl border border-iw-error/30 p-4 text-center">
              <p className="text-xl font-black text-iw-error">{semIgreja + semMatricula}</p>
              <p className="text-xs text-iw-muted">Bloqueadas (sem igreja/matrícula)</p>
            </div>
            <div className="bg-iw-surface rounded-2xl border border-iw-warning/30 p-4 text-center">
              <p className="text-xl font-black text-iw-warning">{comAviso}</p>
              <p className="text-xs text-iw-muted">Com aviso do PDF original</p>
            </div>
          </div>

          <div className="bg-iw-surface rounded-2xl border border-iw-gold overflow-hidden shadow-sm">
            <div className="grid grid-cols-[1fr_140px_140px_120px_1fr] gap-3 px-5 py-2.5 bg-iw-bg border-b border-iw-border">
              <span className="text-xs font-bold text-iw-muted uppercase tracking-wider">Nome</span>
              <span className="text-xs font-bold text-iw-muted uppercase tracking-wider">Igreja</span>
              <span className="text-xs font-bold text-iw-muted uppercase tracking-wider">Cargo</span>
              <span className="text-xs font-bold text-iw-muted uppercase tracking-wider">Matrícula</span>
              <span className="text-xs font-bold text-iw-muted uppercase tracking-wider">Aviso</span>
            </div>
            <ul className="divide-y divide-iw-border max-h-[480px] overflow-y-auto">
              {linhas.map((l, idx) => (
                <li key={idx} className="grid grid-cols-[1fr_140px_140px_120px_1fr] items-center gap-3 px-5 py-2 text-xs">
                  <span className="text-iw-navy truncate">{l.nome_completo}</span>
                  <span className={l.church_id ? "text-iw-navy truncate" : "text-iw-error font-semibold truncate"}>
                    {l.igreja || "—"}
                  </span>
                  <span className="text-iw-navy truncate">{l.cargo_mapeado || l.cargo_sigla || "—"}</span>
                  <span className={l.matricula.trim() ? "font-mono text-iw-navy" : "text-iw-error font-semibold"}>
                    {l.matricula || "sem matrícula"}
                  </span>
                  <span className="text-iw-warning truncate" title={l.aviso}>{l.aviso}</span>
                </li>
              ))}
            </ul>
          </div>

          {resultado && (
            <div className="bg-iw-surface rounded-2xl border border-iw-gold shadow-sm p-6 space-y-2">
              <p className="flex items-center gap-2 text-sm font-semibold text-iw-navy">
                <CheckCircle2 className="w-4 h-4 text-iw-success" />
                Importação concluída: {resultado.resumo.inseridos} inserido(s), {resultado.resumo.jaExistiam} já existiam,{" "}
                {resultado.resumo.semIgreja} sem igreja reconhecida, {resultado.resumo.semMatricula} sem matrícula.
              </p>
              {resultado.detalhes.semIgreja?.length > 0 && (
                <details className="text-xs text-iw-error">
                  <summary className="cursor-pointer font-semibold">Ver quem não tem igreja reconhecida ({resultado.detalhes.semIgreja.length})</summary>
                  <ul className="mt-1 list-disc list-inside">
                    {resultado.detalhes.semIgreja.map((s, i) => <li key={i}>{s}</li>)}
                  </ul>
                </details>
              )}
            </div>
          )}

          <div className="flex justify-end">
            <button
              onClick={handleImportar}
              disabled={importando || prontasParaImportar === 0}
              className="flex items-center gap-2 bg-iw-blue hover:bg-iw-navy disabled:opacity-50 text-white px-6 py-2.5 rounded-xl text-sm font-semibold transition-colors shadow-sm"
            >
              {importando ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileSpreadsheet className="w-4 h-4" />}
              Importar {prontasParaImportar} membro(s)
            </button>
          </div>
        </>
      )}

      {linhas.length === 0 && !erroArquivo && (
        <div className="flex items-center gap-2 text-iw-muted text-xs px-1">
          <AlertTriangle className="w-3.5 h-3.5" />
          Nenhum arquivo carregado ainda.
        </div>
      )}
    </div>
  );
}
