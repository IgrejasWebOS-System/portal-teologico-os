// ============================================================
// OBSOLETO — desativado em 12/09/2026, ver
// staging/governance/ERROS-COMUNS-IA.md.
//
// Este script era um one-off de 02/09/2026 pra limpar contas órfãs
// especificamente no Auth de PRODUÇÃO, sem nenhuma trava de ambiente
// (diferente de zerar-staging.mjs / limpar-tentativas-teste.mjs, que
// recusam rodar fora da branch staging). A lista de e-mails também usa
// o formato antigo com ponto (aluno.basico@...), que não é mais o
// formato usado pelas contas de teste atuais (alunobasico@..., sem
// ponto) — ou seja, hoje ele não faria nada útil mesmo que rodasse.
//
// Ninguém deve rodar este arquivo. Pra limpar dados de teste, use:
//   - node --env-file=.env.local scripts/zerar-staging.mjs
//     (reset completo + recria as contas de teste do zero)
//   - node --env-file=.env.local scripts/limpar-tentativas-teste.mjs
//     (limpa só as tentativas de Teste/Prova/Simulado, mantém login)
// Ver staging/governance/QA-PROCEDIMENTO-TESTES.md pra saber qual usar.
//
// Este arquivo fica só como registro histórico (não apaguei fisicamente
// porque não tenho acesso a terminal nesta sessão pra fazer `git rm` —
// se quiser removê-lo de vez, pode rodar isso na pasta staging:
//   git rm scripts/limpar-usuarios-teste.mjs
//   git commit -m "chore(scripts): remove script obsoleto de limpeza de producao"
// ============================================================

console.error(
  "Este script foi desativado — era um one-off de producao, obsoleto e sem trava de ambiente.\n" +
  "Use scripts/zerar-staging.mjs ou scripts/limpar-tentativas-teste.mjs em vez disso.\n" +
  "Ver staging/governance/QA-PROCEDIMENTO-TESTES.md."
);
process.exit(1);
