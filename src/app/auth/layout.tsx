// ============================================================
// Layout raiz da pasta /auth/* (fora de [locale] — ver comentário
// em src/proxy.ts sobre precisaPularIntl e src/app/auth/callback/page.tsx).
//
// Por que este arquivo existe (bug encontrado em 20/09/2026, teste
// real do Joaquim com convite de professor por e-mail):
// - Este projeto NÃO tem um src/app/layout.tsx na raiz. Quem fornece
//   as tags <html>/<body> é src/app/[locale]/layout.tsx.
// - /auth/callback fica FORA de [locale] de propósito (ver proxy.ts —
//   colocá-lo dentro de [locale] já causou um 404 real em produção
//   em 19/09/2026, então NÃO mexer nisso de novo).
// - Sem nenhum layout no caminho de /auth/callback, o Next.js não
//   tem de onde herdar <html>/<body> e quebra com o erro "Missing
//   <html> and <body> tags in the root layout" — foi exatamente o
//   erro que apareceu na tela ao clicar no link de convite (o fluxo
//   seguia adiante mesmo assim porque o useEffect do client component
//   roda de qualquer forma, mas o erro não deveria aparecer).
//
// Este layout resolve isso SEM tocar em src/app/[locale]/layout.tsx
// (que continua sendo o único a fornecer <html>/<body> para todas as
// rotas normais do site) — ele só cobre a sub-árvore /auth/*, que é
// autossuficiente (página de transição, sem fontes/FAQ/providers do
// site).
// ============================================================

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="pt-BR">
      <body>{children}</body>
    </html>
  );
}
