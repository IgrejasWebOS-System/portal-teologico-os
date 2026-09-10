import { notFound } from "next/navigation";
import { MapPin } from "lucide-react";
import { createClient } from "@/utils/supabase/server";
import PageHeader from "@/components/layout/PageHeader";
import CongregacaoEditForm from "../../../CongregacaoEditForm";

export default async function EditarPontoPregacaoPage({ params }: { params: Promise<{ id: string }> }) {
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
        icon={MapPin}
        title={`Editar Ponto de Pregação — ${church.name}`}
        description="Altere os dados cadastrais deste ponto de pregação."
        backHref="/dashboard/configuracoes/pontos-pregacao"
        backLabel="Voltar para Pontos de Pregação"
      />

      <CongregacaoEditForm
        existing={church}
        setores={setoresData ?? []}
        igrejasMae={igrejasData ?? []}
        lockedType="PONTO"
        backHref="/dashboard/configuracoes/pontos-pregacao"
      />
    </div>
  );
}
