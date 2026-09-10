import { notFound } from "next/navigation";
import { Building } from "lucide-react";
import { createClient } from "@/utils/supabase/server";
import CampoForm from "../../CampoForm";
import PageHeader from "@/components/layout/PageHeader";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function EditarCampoPage({ params }: PageProps) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: campo } = await supabase
    .from("units")
    .select("id, name, type, ministerio_id")
    .eq("id", id)
    .eq("type", "CAMPO")
    .single();

  if (!campo) notFound();

  const { data: ministerios } = await supabase.from("ministerios").select("id, name").order("name");

  const { data: sede } = await supabase
    .from("units")
    .select("id, name, legacy_church_id")
    .eq("type", "SEDE")
    .eq("parent_id", campo.id)
    .maybeSingle();

  if (!sede) notFound();

  const orFiltro = sede.legacy_church_id
    ? `unit_id.is.null,id.eq.${sede.legacy_church_id}`
    : "unit_id.is.null";
  const { data: igrejasDisponiveis } = await supabase
    .from("churches")
    .select("id, name, city, state")
    .or(orFiltro)
    .order("name");

  let church: {
    id: string;
    zip_code: string | null;
    address: string | null;
    address_number: string | null;
    address_complement: string | null;
    neighborhood: string | null;
    city: string | null;
    state: string | null;
    church_phone: string | null;
    pastor_name: string | null;
    email: string | null;
  } | null = null;

  if (sede.legacy_church_id) {
    const { data } = await supabase
      .from("churches")
      .select("id, zip_code, address, address_number, address_complement, neighborhood, city, state, church_phone, pastor_name, email")
      .eq("id", sede.legacy_church_id)
      .maybeSingle();
    church = data;
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <PageHeader
        icon={Building}
        title="Editar Campo"
        description={church ? "Atualize os dados do Campo e da Sede." : "Este campo ainda não tem a igreja da Sede detalhada — preencha abaixo."}
        backHref="/dashboard/configuracoes/acessos/campos"
        backLabel="Voltar para Campos"
      />

      <CampoForm
        submitLabel="Salvar alterações"
        ministerios={ministerios ?? []}
        igrejasDisponiveis={igrejasDisponiveis ?? []}
        existing={{
          campoId: campo.id,
          sedeId: sede.id,
          churchId: church?.id ?? null,
          nomeCampo: campo.name,
          ministerioId: campo.ministerio_id,
          nomeSede: sede.name,
          cep: church?.zip_code,
          endereco: church?.address,
          numero: church?.address_number,
          complemento: church?.address_complement,
          bairro: church?.neighborhood,
          cidade: church?.city,
          uf: church?.state,
          telefone: church?.church_phone,
          contato: church?.pastor_name,
          email: church?.email,
        }}
      />
    </div>
  );
}
