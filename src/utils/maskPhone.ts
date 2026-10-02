// ============================================================
// Máscara de telefone — 25/09/2026, pedido do Joaquim: o sistema vai abrir
// acesso pra igrejas de outros países, e até agora TODOS os formulários
// tinham a mesma função `maskPhone` colada em cada arquivo (11+ cópias),
// só formatando número brasileiro fixo em 10/11 dígitos — sem "+", sem
// código de país, e sem nenhum jeito de digitar um número estrangeiro
// formatado. Esta é a versão única e compartilhada: sem "+" continua
// exatamente como sempre (compatibilidade com todo dado já digitado);
// com "+" reconhece o Brasil (+55) e reproduz o formato pedido
// ("+55 11 9 6742-8655"), e agrupa outros países de forma legível e
// genérica (não é uma biblioteca de validação por país — libphonenumber-js
// resolveria isso direito, mas não está instalada e não dava pra confirmar
// que builda sem rodar `npm install`;ヲ trocar por ela mais pra frente é
// uma melhoria segura, não urgente).
//
// Todo formulário que tinha sua própria cópia de `maskPhone` deve importar
// daqui a partir de agora — nunca redeclarar a função localmente de novo.
// ============================================================

export function maskPhone(raw: string): string {
  const comMais = raw.trim().startsWith("+");
  const digitos = raw.replace(/\D/g, "").slice(0, 15); // E.164 permite até 15 dígitos

  if (!comMais) {
    // Sem "+" — padrão brasileiro de sempre, sem mudanças.
    const v = digitos.slice(0, 11);
    if (v.length > 10) return `(${v.slice(0, 2)}) ${v.slice(2, 7)}-${v.slice(7)}`;
    if (v.length > 6) return `(${v.slice(0, 2)}) ${v.slice(2, 6)}-${v.slice(6)}`;
    if (v.length > 2) return `(${v.slice(0, 2)}) ${v.slice(2)}`;
    return v.length ? `(${v}` : "";
  }

  if (!digitos) return "+";

  // Brasil com "+55" — formato pedido explicitamente.
  if (digitos.startsWith("55")) {
    const ddd = digitos.slice(2, 4);
    const numero = digitos.slice(4);
    let out = "+55";
    if (ddd) out += ` ${ddd}`;
    if (numero.length > 8) out += ` ${numero.slice(0, 1)} ${numero.slice(1, 5)}-${numero.slice(5, 9)}`;
    else if (numero.length > 4) out += ` ${numero.slice(0, -4)}-${numero.slice(-4)}`;
    else if (numero.length > 0) out += ` ${numero}`;
    return out;
  }

  // Outro país — código (até 3 dígitos) + resto agrupado de 3 em 3
  // (último bloco com 4), formatação legível e genérica.
  const cc = digitos.slice(0, Math.min(3, digitos.length));
  const resto = digitos.slice(cc.length);
  const blocos: string[] = [];
  let i = 0;
  while (i < resto.length) {
    const tamanho = resto.length - i <= 4 ? resto.length - i : 3;
    blocos.push(resto.slice(i, i + tamanho));
    i += tamanho;
  }
  return `+${cc}${blocos.length ? " " + blocos.join(" ") : ""}`;
}
