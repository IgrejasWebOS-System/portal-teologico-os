import Link from "next/link";
import { Building, Plus, Pencil, Phone, Mail, AlertCircle } from "lucide-react";
import { createClient } from "@/utils/supabase/server";
import { deleteCampoFormAction } from "./actions";
import PageHeader from "@/components/layout/PageHeader";

type Unit = { id: string; name: string; parent_id: string | null; legacy_church_id: string | null };
type ChurchInfo = {
  id: string;
  church_phone: string | null;
  email: string | null;
  pastor_name: string | null;
  city: string | null;
  state: string | null;
};

export default async function CamposPage() {
  const supabase = await createClient();

  const [{ data: { user: currentUser } }, campoRes, sedeRes] = await Promise.all([
    supabase.auth.getUser(),
    supabase.from("units").select("id, name, parent_id, legacy_church_id").eq("type", "CAMPO").order("name"),
    supabase.from("units").select("id, name, parent_id, legacy_church_id").eq("type", "SEDE"),
  ]);

  let souGlobalAdmin = false;
  if (currentUser) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("system_role")
      .eq("id", currentUser.id)
      .single();
    souGlobalAdmin = profile?.system_role === "GLOBAL_ADMIN";
  }

  const campos = (campoRes.data ?? []) as Unit[];
  const sedes = (sedeRes.data ?? []) as Unit[];

  const churchIds = sedes.map((s) => s.legacy_church_id).filter((id): id is string => !!id);
  let churches: ChurchInfo[] = [];
  if (churchIds.length > 0) {
    const { data } = await supabase
      .from("churches")
      .select("id, church_phone, email, pastor_name, city, state")
      .in("id", churchIds);
    churches = data ?? [];
  }

  const linhas = campos.map((campo) => {
    const sede = sedes.find((s) => s.parent_id === campo.id) ?? null;
    const igreja = sede?.legacy_church_id
      ? churches.find((c) => c.id === sede.legacy_church_id) ?? null
      : null;
    return { campo, sede, igreja };
  });

  return (
    <div className="max-w-4xl mx-auto space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <PageHeader
        icon={Building}
        title="Campos / Ministérios"
        description="Campo → Sede → Setor → Igreja, isolados entre si"
        backHref="/dashboard/configuracoes/acessos"
        backLabel="Voltar para Administração de Acessos"
        actions={
          souGlobalAdmin ? (
            <Link
              href="/dashboard/configuracoes/acessos/campos/nova"
              className="flex items-center gap-2 bg-iw-blue hover:bg-iw-navy text-white px-4 py-2.5 rounded-xl text-sm font-semibold transition-colors shadow-sm shrink-0"
            >
              <Plus className="w-4 h-4" />
              Novo Campo
            </Link>
          ) : undefined
        }
      />

      <div className="bg-iw-surface rounded-2xl border border-iw-border overflow-hidden shadow-sm">
        {linhas.length === 0 ? (
          <div className="px-5 py-12 text-center">
            <Building className="w-10 h-10 text-iw-muted/30 mx-auto mb-3" />
            <p className="text-iw-muted text-sm">Nenhum campo cadastrado.</p>
          </div>
        ) : (
          <ul className="divide-y divide-iw-border">
            {linhas.map(({ campo, sede, igreja }) => (
              <li key={campo.id} className="px-5 py-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <p className="text-sm font-bold text-iw-navy">{campo.name}</p>
                    <p className="text-xs text-iw-muted mt-0.5">
                      Sede: {sede ? sede.name : <span className="text-iw-warning">não cadastrada</span>}
                    </p>

                    {sede && !igreja && (
                      <p className="flex items-center gap-1 text-[11px] text-iw-warning mt-1.5">
                        <AlertCircle className="w-3 h-3" />
                        Sede sem endereço/contato preenchido ainda
                      </p>
                    )}

                    {igreja && (
                      <div className="flex flex-wrap gap-x-4 gap-y-0.5 mt-1.5 text-xs text-iw-muted">
                        {igreja.pastor_name && <span>{igreja.pastor_name}</span>}
                        {igreja.church_phone && (
                          <span className="inline-flex items-center gap-1">
                            <Phone className="w-3 h-3" /> {igreja.church_phone}
                          </span>
                        )}
                        {igreja.email && (
                          <span className="inline-flex items-center gap-1">
                            <Mail className="w-3 h-3" /> {igreja.email}
                          </span>
                        )}
                        {(igreja.city || igreja.state) && (
                          <span>{[igreja.city, igreja.state].filter(Boolean).join(" - ")}</span>
                        )}
                      </div>
                    )}
                  </div>

                  {souGlobalAdmin && (
                    <div className="flex items-center gap-1.5 shrink-0">
                      <Link
                        href={`/dashboard/configuracoes/acessos/campos/${campo.id}/editar`}
                        className="inline-flex items-center gap-1 text-xs font-semibold text-iw-blue hover:text-iw-navy transition-colors px-3 py-1.5 rounded-lg hover:bg-iw-blue/8"
                      >
                        <Pencil className="w-3 h-3" />
                        Editar
                      </Link>
                      <form action={deleteCampoFormAction.bind(null, campo.id)}>
                        <button
                          type="submit"
                          className="text-xs font-semibold text-iw-error hover:text-iw-error/80 transition-colors px-3 py-1.5 rounded-lg hover:bg-iw-error-bg"
                        >
                          Excluir
                        </button>
                      </form>
                    </div>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
