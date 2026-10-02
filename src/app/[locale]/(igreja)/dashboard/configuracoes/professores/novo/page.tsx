import { redirect } from "next/navigation";

// A tela de cadastro agora é única (15/09/2026) — ver
// /professores/novo/membro. Esta rota só existe pra não quebrar link
// antigo/favorito; redireciona direto pra lá.
export default function NovoProfessorRedirectPage() {
  redirect("/dashboard/configuracoes/professores/novo/membro");
}
