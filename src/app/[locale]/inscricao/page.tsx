import { getTranslations } from "next-intl/server";
import { createClient } from "@/utils/supabase/server";
import PublicHeader from "@/components/public/PublicHeader";
import PublicFooter from "@/components/public/PublicFooter";
import InscricaoForm from "./InscricaoForm";

interface InscricaoPageProps {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ error?: string }>;
}

export async function generateMetadata() {
  const t = await getTranslations("inscricao");
  return { title: t("metaTitulo") };
}

export default async function InscricaoPage({ params, searchParams }: InscricaoPageProps) {
  const { locale } = await params;
  const { error } = await searchParams;
  const t = await getTranslations("inscricao");

  const supabase = await createClient();
  const { data: campos } = await supabase
    .from("ead_campos_ministerios")
    .select("id, nome, tipo")
    .eq("ativo", true)
    .order("nome");

  return (
    <div className="w-full min-h-screen bg-iw-bg flex flex-col">
      <PublicHeader />

      <main className="flex-1 flex items-center justify-center px-4 py-12">
        <div className="w-full max-w-xl">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-black text-iw-navy tracking-tight">
              {t("titulo")}
            </h1>
            <p className="text-iw-muted text-sm mt-2 max-w-md mx-auto">
              {t("subtitulo")}
            </p>
          </div>

          <div className="bg-iw-surface rounded-2xl border border-iw-border shadow-sm p-6 sm:p-8">
            {error && (
              <div className="mb-4 px-4 py-3 rounded-lg bg-iw-error-bg border border-iw-error text-iw-error text-sm font-medium">
                {decodeURIComponent(error)}
              </div>
            )}
            <InscricaoForm campos={campos ?? []} locale={locale} />
          </div>
        </div>
      </main>

      <PublicFooter />
    </div>
  );
}
