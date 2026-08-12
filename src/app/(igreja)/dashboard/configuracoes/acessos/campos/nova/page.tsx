import { Building } from "lucide-react";
import CampoForm from "../CampoForm";
import PageHeader from "@/components/layout/PageHeader";

export default function NovoCampoPage() {
  return (
    <div className="max-w-3xl mx-auto space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <PageHeader
        icon={Building}
        title="Novo Campo"
        description="Cria o Campo, a Sede e a igreja da Sede juntos."
        backHref="/dashboard/configuracoes/acessos/campos"
        backLabel="Voltar para Campos / Ministérios"
      />

      <CampoForm submitLabel="Cadastrar Campo" />
    </div>
  );
}
