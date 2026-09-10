import { notFound } from "next/navigation";
import { Building2 } from "lucide-react";
import { createClient } from "@/utils/supabase/server";
import PageHeader from "@/components/layout/PageHeader";
import CongregacaoEditForm from "../../../CongregacaoEditForm";

export default async function EditarSubCongregacaoPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();

  const [{ data: church }, { data: setoresData }, { data: igrejasData }] = await Promise.all([
    supabase
      .from("churches")
      .select(
        "id, unit_id, name, church_type, sector_id, parent_id, pastor_matricula, pastor_name, pastor_role, pastor_phone, church_phone, zip_code, address, address_number, address_complement, neighborhood, city, state"
      )
      .eq("id", id)
      .single(),
    supabase.from("sectors").select("id, name").order("name"),
    supabase.from("churches").select("id, name").eq("church_type", "CHURCH").order("name"),
  ]);

  if (!church) notFound();

  return (
    <div className="max-w-3xl mx-auto space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <PageHeader
        icon={Building2}
        title={`Editar Sub-congregação — ${church.name}`}
        description="Altere os dados cadastrais desta sub-congregação."
        backHref="/dashboard/configuracoes/sub-congregacoes"
        backLabel="Voltar para Sub-congregações"
      />

      <CongregacaoEditForm
        existing={church}
        setores={setoresData ?? []}
        igrejasMae={igrejasData ?? []}
        lockedType="SUB"
        backHref="/dashboard/configuracoes/sub-congregacoes"
      />
    </div>
  );
}
