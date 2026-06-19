import Link from "next/link";
import { ArrowLeft, Building, Plus } from "lucide-react";
import { createClient } from "@/utils/supabase/server";

export default async function CamposPage() {
  const supabase = await createClient();

  // Campos = igrejas de tipo CHURCH (nível mais alto da hierarquia)
  const { data } = await supabase
    .from("churches")
    .select("id, name, pastor_name, phone")
    .eq("church_type", "CHURCH")
    .order("name");

  const campos = data ?? [];

  return (
    <div className="max-w-4xl mx-auto space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex items-start justify-between gap-4">
        <div>
          <Link
            href="/dashboard/configuracoes/acessos"
            className="inline-flex items-center gap-1.5 text-xs text-iw-muted hover:text-iw-navy font-medium transition-colors mb-2"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            Voltar para Administração de Acessos
          </Link>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-iw-blue/10 flex items-center justify-center shrink-0">
              <Building className="w-5 h-5 text-iw-blue" />
            </div>
            <div>
              <h1 className="text-xl font-black text-iw-navy tracking-tight">Campos / Ministérios</h1>
              <p className="text-iw-muted text-xs mt-0.5">Gestão de instâncias superiores do sistema</p>
            </div>
          </div>
        </div>
        <Link
          href="/dashboard/configuracoes/igrejas/nova"
          className="flex items-center gap-2 bg-iw-blue hover:bg-iw-navy text-white px-4 py-2.5 rounded-xl text-sm font-semibold transition-colors shadow-sm shrink-0"
        >
          <Plus className="w-4 h-4" />
          Novo Campo
        </Link>
      </div>

      <div className="bg-iw-surface rounded-2xl border border-iw-border overflow-hidden shadow-sm">
        <div className="grid grid-cols-[1fr_1fr_auto] px-5 py-2.5 bg-iw-bg border-b border-iw-border gap-4">
          <span className="text-xs font-bold text-iw-muted uppercase tracking-wider">Nome do Campo</span>
          <span className="text-xs font-bold text-iw-muted uppercase tracking-wider">ID de Registro</span>
          <span className="text-xs font-bold text-iw-muted uppercase tracking-wider">Ações</span>
        </div>

        {campos.length === 0 ? (
          <div className="px-5 py-12 text-center">
            <Building className="w-10 h-10 text-iw-muted/30 mx-auto mb-3" />
            <p className="text-iw-muted text-sm">Nenhum campo cadastrado.</p>
            <p className="text-iw-muted/60 text-xs mt-1">Cadastre igrejas do tipo &ldquo;Igreja / Congregação&rdquo; para que apareçam aqui.</p>
          </div>
        ) : (
          <ul className="divide-y divide-iw-border">
            {campos.map((campo) => (
              <li
                key={campo.id}
                className="grid grid-cols-[1fr_1fr_auto] items-center px-5 py-3.5 hover:bg-iw-bg/50 transition-colors gap-4"
              >
                <span className="text-sm font-semibold text-iw-navy">{campo.name}</span>
                <span className="text-xs text-iw-muted font-mono truncate">{campo.id}</span>
                <button className="text-xs font-semibold text-iw-blue hover:text-iw-navy transition-colors px-3 py-1.5 rounded-lg hover:bg-iw-blue/8">
                  Gerenciar
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
