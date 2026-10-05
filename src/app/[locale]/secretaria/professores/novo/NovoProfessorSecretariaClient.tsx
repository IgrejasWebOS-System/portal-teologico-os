"use client";

// ============================================================
// Wrapper client pro ProfessorForm (dashboard/configuracoes/professores/
// ProfessorForm.tsx) na Área da Secretaria — 04/10/2026, Etapa 7.
// O form em si (campos, validação, chamada a addProfessorAction) é
// 100% reaproveitado, sem duplicar nada; só o pós-save muda: em vez de
// voltar pra /dashboard/configuracoes/professores (lista do admin
// global), volta pra /secretaria/professores (própria lista do
// secretário), via a prop onSaved que o ProfessorForm já suporta.
// ============================================================

import { useRouter } from "next/navigation";
import ProfessorForm from "../../../(igreja)/dashboard/configuracoes/professores/ProfessorForm";

type Props = React.ComponentProps<typeof ProfessorForm>;

export default function NovoProfessorSecretariaClient(props: Omit<Props, "onSaved">) {
  const router = useRouter();
  return (
    <ProfessorForm
      {...props}
      onSaved={(message) => {
        router.push("/secretaria/professores" + (message ? `?msg=${encodeURIComponent(message)}` : ""));
        router.refresh();
      }}
    />
  );
}
