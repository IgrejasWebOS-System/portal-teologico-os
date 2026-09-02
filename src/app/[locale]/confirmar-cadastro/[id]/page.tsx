import { createAdminClient } from "@/utils/supabase/admin";
import ConfirmarCadastroForm from "./ConfirmarCadastroForm";

export const metadata = { title: "Confirmar Cadastro — CETADP" };

interface PageProps {
  params: Promise<{ id: string }>;
}

// ============================================================
// Rota pública (sem login) — o aluno chega aqui escaneando o QR
// Code gerado em /admin/matriculas/ficha-rapida. Usa o client admin
// porque não há sessão de usuário; o "token" de acesso é o próprio
// id (uuid, não adivinhável) da ficha — mesmo espírito de link de
// convite usado no resto do app. Uma vez confirmada (status sai de
// FICHA_PENDENTE), o link para de aceitar novo envio.
// ============================================================

export default async function ConfirmarCadastroPage({ params }: PageProps) {
  const { id } = await params;
  const admin = createAdminClient();

  const { data: aluno } = await admin
    .from("ead_alunos")
    .select("id, nome_completo, cpf, matricula, curso_pretendido, status, telefone")
    .eq("id", id)
    .maybeSingle();

  if (!aluno) {
    return (
      <div className="min-h-screen flex items-center justify-center px-6 text-center">
        <p className="text-iw-navy">Link inválido ou ficha não encontrada.</p>
      </div>
    );
  }

  if (aluno.status !== "FICHA_PENDENTE") {
    return (
      <div className="min-h-screen flex items-center justify-center px-6 text-center">
        <div className="max-w-sm space-y-2">
          <p className="text-iw-navy font-bold">Cadastro já confirmado</p>
          <p className="text-sm text-iw-muted">
            {aluno.nome_completo}, sua matrícula {aluno.matricula} já foi concluída. Se algo estiver
            errado, procure a secretaria do CETADP.
          </p>
        </div>
      </div>
    );
  }

  // Página pública (sem sessão) — settings_schooling/settings_professions
  // só têm SELECT liberado pra `authenticated`, então busca aqui com o
  // client admin (bypassa RLS) e passa pronto pro form, em vez de deixar
  // o client tentar buscar direto (ficaria vazio pra usuário anônimo).
  const [{ data: escolaridades }, { data: profissoes }] = await Promise.all([
    admin.from("settings_schooling").select("id, name").order("name"),
    admin.from("settings_professions").select("id, name").order("name"),
  ]);

  return (
    <ConfirmarCadastroForm
      aluno={aluno}
      escolaridades={escolaridades ?? []}
      profissoes={profissoes ?? []}
    />
  );
}
