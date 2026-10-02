import { ShieldAlert } from "lucide-react";

// 27/09/2026, achado em teste (Joaquim): o gate de /professor reaproveitava
// este componente com a mensagem fixa "exclusiva da secretaria" — texto
// errado pra quem tomou "Acesso restrito" tentando entrar como professor
// (a área não é da secretaria, é do professor; a mensagem certa é "seu
// usuário não está cadastrado como professor"). Mensagem agora é
// parametrizável, com o texto de secretaria como padrão (mantém o
// comportamento de todo mundo que já usava este componente sem passar nada).
export default function AcessoRestrito({
  mensagem = "Esta área é exclusiva da secretaria do CETADP. Fale com um administrador do sistema se você acredita que deveria ter acesso.",
}: {
  mensagem?: string;
}) {
  return (
    <div className="max-w-lg mx-auto mt-16 bg-iw-surface border border-iw-error/30 rounded-2xl p-8 text-center">
      <ShieldAlert className="w-10 h-10 text-iw-error mx-auto mb-3" />
      <h1 className="text-lg font-bold text-iw-navy mb-1">Acesso restrito</h1>
      <p className="text-iw-muted text-sm">{mensagem}</p>
    </div>
  );
}
