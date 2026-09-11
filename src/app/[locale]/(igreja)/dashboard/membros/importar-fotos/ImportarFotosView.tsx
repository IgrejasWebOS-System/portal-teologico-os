"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  ArrowLeft, ImagePlus, CheckCircle2, AlertTriangle, XCircle,
  Loader2, UploadCloud, Search,
} from "lucide-react";
import { createClient } from "@/utils/supabase/client";

type MemberRow = {
  id: string;
  full_name: string;
  registration_number: string | null;
  photo_url: string | null;
  church_id: string | null;
  churches: { name: string } | { name: string }[] | null;
};

type MatchStatus = "pendente" | "enviando" | "ok" | "erro";

type FileMatch = {
  file: File;
  previewUrl: string;
  codigo: string;
  member: MemberRow | null;
  status: MatchStatus;
  erro?: string;
};

function codigoDoArquivo(nomeArquivo: string): string {
  const semExtensao = nomeArquivo.replace(/\.[^.]+$/, "");
  return semExtensao.trim();
}

function normaliza(codigo: string): string {
  // remove zeros à esquerda e espaços, só para comparação — não altera o valor exibido
  return codigo.trim().replace(/^0+(?=\d)/, "");
}

function nomeIgreja(m: MemberRow): string {
  const c = Array.isArray(m.churches) ? m.churches[0] : m.churches;
  return c?.name ?? "—";
}

export default function ImportarFotosView({ members }: { members: MemberRow[] }) {
  const [matches, setMatches] = useState<FileMatch[]>([]);
  const [importando, setImportando] = useState(false);
  const [resumo, setResumo] = useState<{ ok: number; erro: number } | null>(null);

  const porCodigoNormalizado = useMemo(() => {
    const map = new Map<string, MemberRow>();
    for (const m of members) {
      if (!m.registration_number) continue;
      map.set(normaliza(m.registration_number), m);
    }
    return map;
  }, [members]);

  const handleFiles = (fileList: FileList | null) => {
    if (!fileList) return;
    const novas: FileMatch[] = Array.from(fileList)
      .filter((f) => f.type.startsWith("image/"))
      .map((file) => {
        const codigo = codigoDoArquivo(file.name);
        const member = porCodigoNormalizado.get(normaliza(codigo)) ?? null;
        return {
          file,
          previewUrl: URL.createObjectURL(file),
          codigo,
          member,
          status: "pendente" as MatchStatus,
        };
      });

    // Ordem alfabética pelo nome do membro (o arquivo-origem das fotos já
    // vem alfabético — mantém a mesma ordem aqui pra facilitar conferir
    // lado a lado). Não encontrados ficam agrupados no final, por código.
    novas.sort((a, b) => {
      if (!!a.member !== !!b.member) return a.member ? -1 : 1;
      const chaveA = a.member?.full_name ?? a.codigo;
      const chaveB = b.member?.full_name ?? b.codigo;
      return chaveA.localeCompare(chaveB, "pt-BR");
    });
    setMatches(novas);
    setResumo(null);
  };

  const encontrados = matches.filter((m) => m.member);
  const naoEncontrados = matches.filter((m) => !m.member);

  const handleImportar = async () => {
    setImportando(true);
    const supabase = createClient();
    let ok = 0;
    let erro = 0;

    const atual = [...matches];
    for (let i = 0; i < atual.length; i++) {
      const item = atual[i];
      if (!item.member) continue;

      setMatches((prev) =>
        prev.map((m, idx) => (idx === i ? { ...m, status: "enviando" } : m))
      );

      try {
        const ext = item.file.name.split(".").pop() ?? "jpg";
        const path = `member-${item.member.id}-${Date.now()}.${ext}`;
        const { error: uploadError } = await supabase.storage
          .from("avatars")
          .upload(path, item.file, { upsert: true });
        if (uploadError) throw uploadError;

        const { data } = supabase.storage.from("avatars").getPublicUrl(path);
        const { error: updateError } = await supabase
          .from("members")
          .update({ photo_url: data.publicUrl })
          .eq("id", item.member.id);
        if (updateError) throw updateError;

        ok++;
        setMatches((prev) =>
          prev.map((m, idx) => (idx === i ? { ...m, status: "ok" } : m))
        );
      } catch (e) {
        erro++;
        const msg = e instanceof Error ? e.message : "Falha no upload.";
        setMatches((prev) =>
          prev.map((m, idx) => (idx === i ? { ...m, status: "erro", erro: msg } : m))
        );
      }
    }

    setResumo({ ok, erro });
    setImportando(false);
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-20">
      <div className="flex items-center justify-between gap-4">
        <h1 className="text-2xl font-black text-iw-navy tracking-tight">Importar Fotos em Massa</h1>
        <Link
          href="/dashboard/membros"
          className="flex items-center gap-1.5 px-4 py-2.5 text-sm font-semibold text-iw-muted hover:text-iw-navy border border-iw-border rounded-xl hover:border-iw-navy/30 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Voltar
        </Link>
      </div>

      <div className="bg-iw-surface rounded-2xl border border-iw-border shadow-sm p-6 space-y-4">
        <p className="text-sm text-iw-navy">
          Selecione as fotos no seu computador. O nome de cada arquivo (sem a
          extensão) precisa ser exatamente o <strong>número de matrícula</strong>{" "}
          do membro — por exemplo <code className="bg-iw-bg px-1.5 py-0.5 rounded text-xs">31906.jpg</code>{" "}
          para a matrícula 31906. O sistema casa automaticamente com o
          cadastro de membros; nada é enviado até você conferir e clicar em
          &ldquo;Importar&rdquo;.
        </p>

        <label className="flex flex-col items-center justify-center gap-2 border-2 border-dashed border-iw-border rounded-2xl py-10 cursor-pointer hover:border-iw-blue transition-colors bg-iw-bg/40">
          <UploadCloud className="w-8 h-8 text-iw-muted" />
          <span className="text-sm font-semibold text-iw-navy">Clique para selecionar as fotos</span>
          <span className="text-xs text-iw-muted">Pode selecionar várias de uma vez (Ctrl+A na janela de arquivos)</span>
          <input
            type="file"
            accept="image/*"
            multiple
            className="hidden"
            onChange={(e) => handleFiles(e.target.files)}
          />
        </label>
      </div>

      {matches.length > 0 && (
        <>
          <div className="grid grid-cols-3 gap-4">
            <div className="bg-iw-surface rounded-2xl border border-iw-border p-4 text-center">
              <p className="text-xl font-black text-iw-navy">{matches.length}</p>
              <p className="text-xs text-iw-muted">Arquivos selecionados</p>
            </div>
            <div className="bg-iw-surface rounded-2xl border border-iw-success/30 p-4 text-center">
              <p className="text-xl font-black text-iw-success">{encontrados.length}</p>
              <p className="text-xs text-iw-muted">Casados com um membro</p>
            </div>
            <div className="bg-iw-surface rounded-2xl border border-iw-error/30 p-4 text-center">
              <p className="text-xl font-black text-iw-error">{naoEncontrados.length}</p>
              <p className="text-xs text-iw-muted">Sem matrícula correspondente</p>
            </div>
          </div>

          <div className="bg-iw-surface rounded-2xl border border-iw-border overflow-hidden shadow-sm">
            <div className="grid grid-cols-[48px_1fr_1fr_1fr_100px] gap-4 px-5 py-2.5 bg-iw-bg border-b border-iw-border">
              <span />
              <span className="text-xs font-bold text-iw-muted uppercase tracking-wider">Arquivo</span>
              <span className="text-xs font-bold text-iw-muted uppercase tracking-wider">Matrícula lida</span>
              <span className="text-xs font-bold text-iw-muted uppercase tracking-wider">Membro / Igreja</span>
              <span className="text-xs font-bold text-iw-muted uppercase tracking-wider">Status</span>
            </div>
            <ul className="divide-y divide-iw-border max-h-[480px] overflow-y-auto">
              {matches.map((m, idx) => (
                <li key={idx} className="grid grid-cols-[48px_1fr_1fr_1fr_100px] items-center gap-4 px-5 py-2.5">
                  <img src={m.previewUrl} alt="" className="w-9 h-9 rounded-full object-cover border border-iw-border" />
                  <span className="text-xs text-iw-navy truncate">{m.file.name}</span>
                  <span className="text-xs font-mono text-iw-navy">{m.codigo}</span>
                  {m.member ? (
                    <span className="text-xs text-iw-navy truncate">
                      {m.member.full_name}
                      <span className="text-iw-muted"> — {nomeIgreja(m.member)}</span>
                    </span>
                  ) : (
                    <span className="text-xs text-iw-error flex items-center gap-1">
                      <AlertTriangle className="w-3 h-3" /> Não encontrado
                    </span>
                  )}
                  <span className="text-xs">
                    {m.status === "pendente" && <span className="text-iw-muted">Aguardando</span>}
                    {m.status === "enviando" && <Loader2 className="w-4 h-4 animate-spin text-iw-blue" />}
                    {m.status === "ok" && <CheckCircle2 className="w-4 h-4 text-iw-success" />}
                    {m.status === "erro" && (
                      <span className="text-iw-error flex items-center gap-1" title={m.erro}>
                        <XCircle className="w-3.5 h-3.5" /> Erro
                      </span>
                    )}
                  </span>
                </li>
              ))}
            </ul>
          </div>

          {resumo && (
            <div className="flex items-center gap-2 bg-iw-success/8 border border-iw-success/30 text-iw-success px-4 py-3 rounded-xl text-sm font-medium">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              Importação concluída: {resumo.ok} foto(s) atualizada(s){resumo.erro > 0 ? `, ${resumo.erro} com erro` : ""}.
            </div>
          )}

          <div className="flex justify-end">
            <button
              onClick={handleImportar}
              disabled={importando || encontrados.length === 0}
              className="flex items-center gap-2 bg-iw-blue hover:bg-iw-navy disabled:opacity-50 text-white px-6 py-2.5 rounded-xl text-sm font-semibold transition-colors shadow-sm"
            >
              {importando ? <Loader2 className="w-4 h-4 animate-spin" /> : <ImagePlus className="w-4 h-4" />}
              Importar {encontrados.length} foto(s)
            </button>
          </div>
        </>
      )}

      {matches.length === 0 && (
        <div className="flex items-center gap-2 text-iw-muted text-xs px-1">
          <Search className="w-3.5 h-3.5" />
          Nenhum arquivo selecionado ainda.
        </div>
      )}
    </div>
  );
}
