import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft, AlertTriangle, BookMarked } from "lucide-react";
import { createClient } from "@/utils/supabase/server";
import { checkIsStaff } from "@/utils/staff";
import AcessoRestrito from "@/components/admin/AcessoRestrito";
import { addTrimestreAction } from "../actions";

export const metadata = { title: "Novo Trimestre — EBD" };

const boxCls =
  "border border-iw-border rounded-xl px-3.5 pt-1.5 pb-2 bg-white focus-within:border-iw-gold focus-within:ring-1 focus-within:ring-iw-gold/30 transition-colors";
const boxLabelCls = "block text-[10px] font-extrabold text-iw-muted uppercase tracking-wider mb-0.5";
const bareCls = "w-full bg-transparent border-none p-0 text-sm text-iw-navy placeholder-iw-muted/70 focus:outline-none focus:ring-0";

interface PageProps {
  searchParams: Promise<{ error?: string }>;
}

export default async function NovoTrimestrePage({ searchParams }: PageProps) {
  const { error } = await searchParams;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  if (!(await checkIsStaff(supabase, user.id))) {
    return <AcessoRestrito />;
  }

  const anoAtual = new Date().getFullYear();

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <Link
          href="/admin/ebd"
          className="inline-flex items-center gap-1.5 text-xs text-iw-muted hover:text-iw-navy font-medium transition-colors mb-2"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          Voltar para EBD
        </Link>
        <h1 className="text-xl font-black text-iw-navy tracking-tight">Novo Trimestre</h1>
        <p className="text-iw-muted text-xs mt-0.5">Cadastre o trimestre antes de inserir as lições.</p>
      </div>

      {error && (
        <div className="flex items-center gap-3 bg-iw-error/8 border border-iw-error/30 text-iw-error px-4 py-3 rounded-xl text-sm">
          <AlertTriangle className="w-4 h-4 shrink-0" />
          <span className="font-medium">{decodeURIComponent(error)}</span>
        </div>
      )}

      <form action={addTrimestreAction} className="bg-iw-surface rounded-2xl border border-iw-border shadow-sm p-6 space-y-4">
        <div className="flex items-center gap-2.5 pb-3 border-b border-iw-border">
          <div className="w-6 h-6 rounded-lg bg-iw-gold/10 flex items-center justify-center shrink-0">
            <BookMarked className="w-3.5 h-3.5 text-iw-gold" />
          </div>
          <h2 className="text-sm font-bold text-iw-navy uppercase tracking-wider">Dados do trimestre</h2>
        </div>

        <div className="grid grid-cols-12 gap-3">
          <div className={`${boxCls} col-span-6 md:col-span-3`}>
            <label className={boxLabelCls}>Ano *</label>
            <input name="year" type="number" required defaultValue={anoAtual} className={bareCls} />
          </div>
          <div className={`${boxCls} col-span-6 md:col-span-3`}>
            <label className={boxLabelCls}>Trimestre *</label>
            <select name="quarter" required defaultValue="" className={`${bareCls} cursor-pointer`}>
              <option value="" disabled>Selecione</option>
              <option value="1">1° Trimestre</option>
              <option value="2">2° Trimestre</option>
              <option value="3">3° Trimestre</option>
              <option value="4">4° Trimestre</option>
            </select>
          </div>
          <div className={`${boxCls} col-span-6 md:col-span-3`}>
            <label className={boxLabelCls}>Público</label>
            <select name="audience" defaultValue="ADULTOS" className={`${bareCls} cursor-pointer`}>
              <option value="ADULTOS">Adultos</option>
              <option value="JOVENS">Jovens</option>
              <option value="ADOLESCENTES">Adolescentes</option>
              <option value="JUNIORES">Juniores</option>
              <option value="PRIMARIOS">Primários</option>
            </select>
          </div>
          <div className={`${boxCls} col-span-6 md:col-span-3`}>
            <label className={boxLabelCls}>Editora</label>
            <select name="publisher" defaultValue="CPAD" className={`${bareCls} cursor-pointer`}>
              <option value="CPAD">CPAD</option>
              <option value="BETEL">Betel</option>
              <option value="PECC">PECC</option>
            </select>
          </div>
          <div className={`${boxCls} col-span-12 md:col-span-8`}>
            <label className={boxLabelCls}>Tema do trimestre</label>
            <input name="theme" placeholder="Ex: A vida de fé e o caráter cristão" className={bareCls} />
          </div>
          <div className={`${boxCls} col-span-12 md:col-span-4`}>
            <label className={boxLabelCls}>Nº de lições previstas</label>
            <input name="lesson_count" type="number" min={1} defaultValue={13} className={bareCls} />
          </div>
        </div>

        <div className="flex justify-end pt-2">
          <button
            type="submit"
            className="bg-iw-gold hover:opacity-90 text-white font-bold text-sm px-6 py-2.5 rounded-xl transition-opacity"
          >
            Criar trimestre
          </button>
        </div>
      </form>
    </div>
  );
}
