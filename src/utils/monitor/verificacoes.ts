import { createAdminClient } from "@/utils/supabase/admin";

// ============================================================
// Monitoramento de saúde do Supabase (06/10/2026, pedido do Joaquim).
// Cada verificação devolve: severidade, o que aconteceu, a causa técnica
// provável e o PROCEDIMENTO a adotar. Usado pela tela
// /admin/saude-sistema (sob demanda) e pela rota de cron
// /api/cron/saude-supabase (diária, com alerta por e-mail).
// Server-only: usa o cliente service_role.
// ============================================================

export type Severidade = "OK" | "INFO" | "AVISO" | "CRITICO";

export interface Verificacao {
  codigo: string;
  titulo: string;
  severidade: Severidade;
  resumo: string;
  causa?: string;
  procedimento?: string;
}

export interface BackupRegistro {
  id: string;
  registrado_em: string;
  rotulo: string | null;
  arquivo: string | null;
  tamanho_bytes: number | null;
  sha256: string | null;
  entradas: number | null;
}

interface Metricas {
  tamanho_banco_bytes: number;
  conexoes_ativas: number;
  conexoes_maximo: number;
  tabelas_sem_rls: string[];
  maiores_tabelas: { tabela: string; bytes: number }[];
  convites_alunos_falhos: number;
  convites_professores_falhos: number;
  admins_globais: number;
  perfis_total: number;
}

export interface ResultadoMonitor {
  geradoEm: string;
  ambiente: string;
  verificacoes: Verificacao[];
  metricas: Metricas | null;
  backups: BackupRegistro[];
}

const HORAS_BACKUP_AVISO = 24;
const HORAS_BACKUP_CRITICO = 48;
// Plano Free do Supabase: 500 MB de banco. Ajustável por env se o plano mudar.
const LIMITE_BANCO_MB = Number(process.env.MONITOR_LIMITE_BANCO_MB || 500);

function mb(bytes: number) {
  return (bytes / 1024 / 1024).toLocaleString("pt-BR", { maximumFractionDigits: 1 });
}

function nomeAmbiente(): string {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
  if (url.includes("toduvwtzklntyptcodkf")) return "PRODUÇÃO";
  if (url.includes("cjxdroyyplpknygtcdgr")) return "STAGING";
  return "DESCONHECIDO";
}

export async function executarVerificacoes(): Promise<ResultadoMonitor> {
  const verificacoes: Verificacao[] = [];
  let metricas: Metricas | null = null;
  let backups: BackupRegistro[] = [];

  let admin: ReturnType<typeof createAdminClient>;
  try {
    admin = createAdminClient();
  } catch (e) {
    return {
      geradoEm: new Date().toISOString(),
      ambiente: nomeAmbiente(),
      verificacoes: [
        {
          codigo: "CONFIG_SERVIDOR",
          titulo: "Configuração do servidor",
          severidade: "CRITICO",
          resumo: "O servidor não conseguiu criar a conexão administrativa com o Supabase.",
          causa: e instanceof Error ? e.message : "Variáveis de ambiente ausentes.",
          procedimento:
            "No painel da Vercel (Settings > Environment Variables), confira NEXT_PUBLIC_SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY no ambiente Production e faça um novo deploy.",
        },
      ],
      metricas: null,
      backups: [],
    };
  }

  // ── 1. Banco acessível + métricas ────────────────────────────
  const inicio = Date.now();
  const { data: saude, error: erroSaude } = await admin.rpc("monitor_saude_banco");
  const latenciaMs = Date.now() - inicio;

  if (erroSaude || !saude) {
    verificacoes.push({
      codigo: "BANCO_INACESSIVEL",
      titulo: "Banco de dados",
      severidade: "CRITICO",
      resumo: "Não foi possível consultar o banco de dados.",
      causa: `Erro técnico: ${erroSaude?.message ?? "resposta vazia"}. Causas comuns: projeto pausado por inatividade (plano Free), manutenção ou instabilidade do Supabase, limite de conexões esgotado, ou a função monitor_saude_banco (migration 133) não aplicada neste banco.`,
      procedimento:
        "1) Abra https://status.supabase.com e veja se há incidente. 2) No painel do Supabase, confirme o status do projeto (Restore, se estiver pausado). 3) Se o erro citar 'monitor_saude_banco', aplique a migration 133. 4) Se persistir, acione o suporte do Supabase com o horário do erro.",
    });
  } else {
    metricas = saude as Metricas;
    verificacoes.push({
      codigo: "BANCO_INACESSIVEL",
      titulo: "Banco de dados",
      severidade: latenciaMs > 2500 ? "AVISO" : "OK",
      resumo:
        latenciaMs > 2500
          ? `Banco respondeu, porém lento (${latenciaMs} ms).`
          : `Banco respondendo normalmente (${latenciaMs} ms).`,
      causa:
        latenciaMs > 2500
          ? "Latência alta: pico de uso, consultas pesadas ou instabilidade de rede/região."
          : undefined,
      procedimento:
        latenciaMs > 2500
          ? "Confira Reports > Database no painel do Supabase (CPU, memória, consultas lentas) e repita a verificação em alguns minutos."
          : undefined,
    });
  }

  // ── 2. Auth acessível ────────────────────────────────────────
  try {
    const { error: erroAuth } = await admin.auth.admin.listUsers({ page: 1, perPage: 1 });
    verificacoes.push({
      codigo: "AUTH_INACESSIVEL",
      titulo: "Autenticação (login)",
      severidade: erroAuth ? "CRITICO" : "OK",
      resumo: erroAuth ? "O serviço de login não respondeu." : "Serviço de login respondendo.",
      causa: erroAuth ? `Erro técnico: ${erroAuth.message}. Ninguém consegue entrar enquanto o Auth estiver fora.` : undefined,
      procedimento: erroAuth
        ? "Veja https://status.supabase.com (componente Auth) e, no painel, Authentication > Logs. Se a chave de serviço foi rotacionada, atualize SUPABASE_SERVICE_ROLE_KEY na Vercel e faça novo deploy."
        : undefined,
    });
  } catch (e) {
    verificacoes.push({
      codigo: "AUTH_INACESSIVEL",
      titulo: "Autenticação (login)",
      severidade: "CRITICO",
      resumo: "O serviço de login não respondeu.",
      causa: `Erro técnico: ${e instanceof Error ? e.message : "desconhecido"}.`,
      procedimento: "Veja https://status.supabase.com e Authentication > Logs no painel do Supabase.",
    });
  }

  // ── 3. Backups registrados ───────────────────────────────────
  const { data: bks, error: erroBk } = await admin
    .from("monitor_backups")
    .select("id, registrado_em, rotulo, arquivo, tamanho_bytes, sha256, entradas")
    .order("registrado_em", { ascending: false })
    .limit(10);
  backups = (bks ?? []) as BackupRegistro[];

  if (erroBk) {
    verificacoes.push({
      codigo: "BACKUP_RECENTE",
      titulo: "Backup do banco",
      severidade: "AVISO",
      resumo: "Não foi possível ler o registro de backups.",
      causa: `Erro técnico: ${erroBk.message}. A tabela monitor_backups (migration 133) pode não existir neste banco.`,
      procedimento: "Aplique a migration 133_monitoramento_saude_sistema.sql neste ambiente.",
    });
  } else if (backups.length === 0) {
    verificacoes.push({
      codigo: "BACKUP_RECENTE",
      titulo: "Backup do banco",
      severidade: "CRITICO",
      resumo: "Nenhum backup registrado.",
      causa:
        "No plano Free o Supabase não faz backup automático: o único backup é o dump manual do backup-manager-v2.ps1. Nenhum foi registrado (ou o script ainda não reporta ao painel).",
      procedimento:
        "Rode: powershell -ExecutionPolicy Bypass -File C:\\Projetos\\portal-teologico-os-staging\\scripts\\backup-manager-v2.ps1 — e confirme 'CONCLUIDO SEM FALHAS'. Considere o plano Pro do Supabase (backup diário automático).",
    });
  } else {
    const horas = (Date.now() - new Date(backups[0].registrado_em).getTime()) / 3_600_000;
    const sev: Severidade = horas >= HORAS_BACKUP_CRITICO ? "CRITICO" : horas >= HORAS_BACKUP_AVISO ? "AVISO" : "OK";
    verificacoes.push({
      codigo: "BACKUP_RECENTE",
      titulo: "Backup do banco",
      severidade: sev,
      resumo:
        sev === "OK"
          ? `Último backup há ${Math.floor(horas)} h.`
          : `Último backup há ${Math.floor(horas)} h (limite: ${HORAS_BACKUP_AVISO} h).`,
      causa:
        sev === "OK"
          ? undefined
          : "O backup é manual (plano Free, sem backup automático) e ninguém o executou no prazo. Se o banco for perdido agora, os dados desde o último backup não serão recuperáveis.",
      procedimento:
        sev === "OK"
          ? undefined
          : "Rode o backup-manager-v2.ps1 (PowerShell) e confirme 'CONCLUIDO SEM FALHAS'. Guarde a senha da cópia criptografada. Considere agendar a execução diária ou migrar para o plano Pro.",
    });
  }

  if (metricas) {
    // ── 4. Tamanho do banco ────────────────────────────────────
    const usadoMb = metricas.tamanho_banco_bytes / 1024 / 1024;
    const pct = (usadoMb / LIMITE_BANCO_MB) * 100;
    const sevTam: Severidade = pct >= 90 ? "CRITICO" : pct >= 75 ? "AVISO" : "OK";
    verificacoes.push({
      codigo: "TAMANHO_BANCO",
      titulo: "Espaço do banco",
      severidade: sevTam,
      resumo: `${mb(metricas.tamanho_banco_bytes)} MB de ${LIMITE_BANCO_MB} MB (${pct.toFixed(1)}%).`,
      causa:
        sevTam === "OK"
          ? undefined
          : `O banco está perto do limite do plano (${LIMITE_BANCO_MB} MB). Ao estourar, o Supabase pode colocar o projeto em modo somente leitura. Maiores tabelas: ${metricas.maiores_tabelas
              .map((t) => `${t.tabela} (${mb(t.bytes)} MB)`)
              .join(", ")}.`,
      procedimento:
        sevTam === "OK"
          ? undefined
          : "Remova dados desnecessários (tabelas de backup antigas, arquivos em colunas), rode VACUUM FULL nas maiores e/ou migre para o plano Pro. Faça backup antes de apagar qualquer dado.",
    });

    // ── 5. Conexões ────────────────────────────────────────────
    const pctCon = (metricas.conexoes_ativas / metricas.conexoes_maximo) * 100;
    const sevCon: Severidade = pctCon >= 95 ? "CRITICO" : pctCon >= 80 ? "AVISO" : "OK";
    verificacoes.push({
      codigo: "CONEXOES",
      titulo: "Conexões ao banco",
      severidade: sevCon,
      resumo: `${metricas.conexoes_ativas} de ${metricas.conexoes_maximo} conexões em uso (${pctCon.toFixed(0)}%).`,
      causa:
        sevCon === "OK"
          ? undefined
          : "Muitas conexões abertas ao mesmo tempo (pico de acessos, scripts ou dumps rodando, ou conexões não liberadas). Ao esgotar, novas requisições falham com 'too many connections'.",
      procedimento:
        sevCon === "OK"
          ? undefined
          : "Aguarde alguns minutos; feche scripts/pg_dump em execução; use o pooler (porta 6543) em integrações externas. Se for recorrente, avalie um plano com mais conexões.",
    });

    // ── 6. Tabelas sem RLS ─────────────────────────────────────
    const semRls = metricas.tabelas_sem_rls ?? [];
    verificacoes.push({
      codigo: "TABELAS_SEM_RLS",
      titulo: "Segurança das tabelas (RLS)",
      severidade: semRls.length > 0 ? "CRITICO" : "OK",
      resumo:
        semRls.length > 0
          ? `${semRls.length} tabela(s) pública(s) sem RLS: ${semRls.join(", ")}.`
          : "Todas as tabelas do schema public têm RLS ligado.",
      causa:
        semRls.length > 0
          ? "Tabela no schema public sem Row Level Security pode ser lida (e até alterada) por qualquer pessoa que tenha a chave pública (anon) do site, via API REST."
          : undefined,
      procedimento:
        semRls.length > 0
          ? "Crie uma migration numerada com: ALTER TABLE public.<tabela> ENABLE ROW LEVEL SECURITY; (e as policies necessárias) — ou apague a tabela se for sobra de backup. Teste no staging antes de produção."
          : undefined,
    });

    // ── 7. Convites de acesso que falharam ─────────────────────
    const falhos = (metricas.convites_alunos_falhos ?? 0) + (metricas.convites_professores_falhos ?? 0);
    verificacoes.push({
      codigo: "CONVITES_FALHOS",
      titulo: "E-mails de acesso",
      severidade: falhos > 0 ? "AVISO" : "OK",
      resumo:
        falhos > 0
          ? `${falhos} convite(s) de acesso não entregue(s) (${metricas.convites_alunos_falhos} aluno(s), ${metricas.convites_professores_falhos} professor(es)).`
          : "Nenhum convite de acesso com falha.",
      causa:
        falhos > 0
          ? "O e-mail de convite não saiu: limite de envios do Supabase Auth (plano Free), e-mail cadastrado incorreto, ou o provedor recusou a mensagem."
          : undefined,
      procedimento:
        falhos > 0
          ? "Em Alunos/Professores use 'Reenviar link' (confira o e-mail na janela). Se for limite de envios, aguarde e reenvie aos poucos; considere configurar SMTP próprio no Supabase (Authentication > SMTP)."
          : undefined,
    });

    // ── 8. Administradores globais ─────────────────────────────
    verificacoes.push({
      codigo: "ADMINS_GLOBAIS",
      titulo: "Administradores globais",
      severidade: metricas.admins_globais === 0 ? "CRITICO" : "OK",
      resumo: `${metricas.admins_globais} administrador(es) global(is) cadastrado(s).`,
      causa:
        metricas.admins_globais === 0
          ? "Nenhum usuário nível 0 em admin_roles: ninguém consegue administrar o sistema."
          : undefined,
      procedimento:
        metricas.admins_globais === 0
          ? "Restaure o registro em admin_roles (nível 0, domínio AMBOS) para uma conta autorizada, ou restaure o backup mais recente."
          : undefined,
    });
  }

  return {
    geradoEm: new Date().toISOString(),
    ambiente: nomeAmbiente(),
    verificacoes,
    metricas,
    backups,
  };
}
