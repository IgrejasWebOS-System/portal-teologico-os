import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

const withNextIntl = createNextIntlPlugin("./src/i18n/request.ts");

const nextConfig: NextConfig = {
  // Libera o dev server (assets internos + HMR via WebSocket) pra ser
  // acessado pelo IP de rede local, não só localhost — necessário pra
  // testar em celular pelo mesmo Wi-Fi (ver NEXT_PUBLIC_APP_URL no
  // .env.local). Sem isso, a página carrega mas o React não hidrata
  // direito nesse IP (HMR fica falhando em loop no console), quebrando
  // interações como o upload de foto. Se o IP da máquina mudar, atualizar
  // aqui também.
  allowedDevOrigins: ["192.168.15.10"],
  experimental: {
    serverActions: {
      // Padrão do Next é 1 MB — pequeno demais pra Server Action que recebe
      // foto do aluno (input file/câmera) + assinatura em base64 no mesmo
      // FormData (ver confirmar-cadastro/[id]/actions.ts). Mesmo com a foto
      // comprimida no navegador antes de enviar, deixa uma folga.
      bodySizeLimit: "8mb",
    },
    // Desativado em 19/09/2026: cache persistente do Turbopack pro `next
    // dev` (default true desde o Next 16.1), gravado em
    // .next/dev/cache/turbopack. Causou pelo menos duas rodadas de 404
    // fantasma em rotas dinâmicas existentes (ex.:
    // configuracoes/professores/editar/[id]) durante testes reais nesta
    // sessão, sempre coincidindo com a mensagem "Finished filesystem
    // cache database compaction" no terminal — é um problema conhecido
    // desse recurso ainda recente, não um bug do app. Limpar `.next`
    // manualmente não resolve de forma confiável porque o próprio cache
    // se recorrompe ao reconstruir. Reavaliar religar quando o recurso
    // amadurecer em versões futuras do Next.
    turbopackFileSystemCacheForDev: false,
  },
};

export default withNextIntl(nextConfig);
