"use client";

import { useEffect, useState, useTransition } from "react";
import Link from "next/link";
import { Trash2, Loader2 } from "lucide-react";
import PublicHeader from "@/components/public/PublicHeader";
import PublicFooter from "@/components/public/PublicFooter";
import { Button, Label, TextInput, SelectInput } from "@/components/ui";
import { useCarrinho } from "@/utils/useCarrinho";
import { removerDoCarrinho, atualizarQuantidade } from "@/utils/carrinho";
import { createClient } from "@/utils/supabase/client";
import { finalizarCompraAction } from "../checkout/actions";

interface Endereco {
  cep: string;
  rua: string;
  numero: string;
  complemento: string;
  bairro: string;
  cidade: string;
  uf: string;
}

const ENDERECO_VAZIO: Endereco = {
  cep: "",
  rua: "",
  numero: "",
  complemento: "",
  bairro: "",
  cidade: "",
  uf: "",
};

// ── Telefone — DDI + máscara por país ──────────────────────────
// "0" = dígito. Ao trocar o país, a máscara muda junto.

const PAISES_TELEFONE = [
  { ddi: "+55", nome: "Brasil", mascara: "(00) 0 0000-0000", digitos: 11 },
  { ddi: "+1", nome: "Estados Unidos", mascara: "(000) 000-0000", digitos: 10 },
  { ddi: "+351", nome: "Portugal", mascara: "000 000 000", digitos: 9 },
  { ddi: "+54", nome: "Argentina", mascara: "00 0000-0000", digitos: 10 },
];

function aplicarMascaraTelefone(digitos: string, mascara: string) {
  let saida = "";
  let di = 0;
  for (let i = 0; i < mascara.length && di < digitos.length; i++) {
    if (mascara[i] === "0") {
      saida += digitos[di];
      di++;
    } else {
      saida += mascara[i];
    }
  }
  return saida;
}

function aplicarMascaraCep(digitos: string) {
  if (digitos.length <= 5) return digitos;
  return `${digitos.slice(0, 5)}-${digitos.slice(5, 8)}`;
}

export default function CarrinhoPage() {
  const { itens, recarregar } = useCarrinho();
  const [isPending, startTransition] = useTransition();
  const [endereco, setEndereco] = useState<Endereco>(ENDERECO_VAZIO);
  const [erro, setErro] = useState<string | null>(null);
  const [loadingCep, setLoadingCep] = useState(false);

  const [ddi, setDdi] = useState("+55");
  const [telefoneDigitos, setTelefoneDigitos] = useState("");

  const [usuario, setUsuario] = useState<{ nome: string | null; email: string | null } | null>(
    null
  );
  const [carregandoUsuario, setCarregandoUsuario] = useState(true);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(async ({ data }) => {
      if (!data.user) {
        setCarregandoUsuario(false);
        return;
      }
      const { data: perfil } = await supabase
        .from("profiles")
        .select("full_name")
        .eq("id", data.user.id)
        .single();
      setUsuario({ nome: perfil?.full_name ?? null, email: data.user.email ?? null });
      setCarregandoUsuario(false);
    });
  }, []);

  const temItemFisico = itens.some((i) => i.tipo === "MATERIAL_FISICO");
  const totalCentavos = itens.reduce((soma, i) => soma + i.precoCentavos * i.quantidade, 0);

  const paisAtual = PAISES_TELEFONE.find((p) => p.ddi === ddi) ?? PAISES_TELEFONE[0];
  const telefoneFormatado = aplicarMascaraTelefone(telefoneDigitos, paisAtual.mascara);

  async function handleBlurCep() {
    const cepLimpo = endereco.cep.replace(/\D/g, "");
    if (cepLimpo.length !== 8) return;
    setLoadingCep(true);
    try {
      const res = await fetch(`https://viacep.com.br/ws/${cepLimpo}/json/`);
      const data = await res.json();
      if (!data.erro) {
        setEndereco((prev) => ({
          ...prev,
          rua: (data.logradouro ?? prev.rua).toUpperCase(),
          bairro: (data.bairro ?? prev.bairro).toUpperCase(),
          cidade: (data.localidade ?? prev.cidade).toUpperCase(),
          uf: (data.uf ?? prev.uf).toUpperCase(),
        }));
      }
    } catch {
      // silencioso — usuário preenche manualmente se a busca falhar
    } finally {
      setLoadingCep(false);
    }
  }

  function handleFinalizar() {
    setErro(null);

    if (itens.length === 0) return;

    if (temItemFisico) {
      const obrigatorios: (keyof Endereco)[] = ["cep", "rua", "numero", "bairro", "cidade", "uf"];
      const faltando = obrigatorios.some((campo) => !endereco[campo].trim());
      if (faltando) {
        setErro("Preencha o endereço de entrega completo (complemento é opcional).");
        return;
      }
    }

    const formData = new FormData();
    formData.set(
      "itens",
      JSON.stringify(itens.map((i) => ({ productId: i.productId, quantidade: i.quantidade })))
    );
    if (temItemFisico) formData.set("endereco", JSON.stringify(endereco));
    if (telefoneDigitos) formData.set("telefone", `${ddi} ${telefoneFormatado}`);

    startTransition(() => {
      finalizarCompraAction(formData);
    });
  }

  return (
    <div className="w-full min-h-screen bg-iw-surface text-iw-navy flex flex-col">
      <PublicHeader />

      <main className="flex-1 max-w-6xl mx-auto w-full px-6 py-10">
        <h1 className="text-2xl font-black tracking-tight mb-6">Meu Carrinho</h1>

        {erro && (
          <div className="mb-4 p-3 rounded-lg bg-iw-error-bg border border-iw-error text-iw-error text-sm">
            {erro}
          </div>
        )}

        {itens.length === 0 ? (
          <div className="bg-iw-bg border border-iw-border rounded-2xl p-10 text-center">
            <p className="text-iw-muted text-sm mb-4">Seu carrinho está vazio.</p>
            <Link href="/loja" className="text-iw-gold font-semibold hover:underline">
              Ver catálogo
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            {/* ── Coluna esquerda: dados cadastrais ── */}
            <div className="lg:col-span-7 bg-iw-bg border border-iw-border rounded-2xl p-6">
              <h2 className="font-extrabold text-sm text-iw-navy mb-4">Dados cadastrais</h2>

              {!carregandoUsuario && usuario && (
                <div className="grid grid-cols-2 gap-4 mb-5">
                  <div className="col-span-2">
                    <Label htmlFor="nome-comprador">Nome</Label>
                    <TextInput
                      id="nome-comprador"
                      value={usuario.nome ?? "Não informado no cadastro"}
                      disabled
                    />
                  </div>
                  <div className="col-span-2">
                    <Label htmlFor="email-comprador">E-mail</Label>
                    <TextInput id="email-comprador" value={usuario.email ?? ""} disabled />
                  </div>
                </div>
              )}

              {!carregandoUsuario && !usuario && (
                <div className="mb-5 p-4 rounded-lg bg-iw-gold/10 border border-iw-gold/40">
                  <p className="text-sm text-iw-navy font-semibold mb-1">
                    Você ainda não tem uma conta no portal.
                  </p>
                  <p className="text-xs text-iw-muted mb-3">
                    Não precisa ser aluno para comprar — crie uma conta rápida (nome, e-mail e
                    senha) para finalizar a compra de livros, apostilas e materiais da loja.
                  </p>
                  <div className="flex flex-wrap gap-3">
                    <Link
                      href="/cadastro?redirectTo=%2Floja%2Fcarrinho"
                      className="bg-iw-gold hover:opacity-90 text-white font-bold text-sm px-5 py-2.5 rounded-lg transition-opacity"
                    >
                      Criar conta
                    </Link>
                    <Link
                      href="/login?redirectTo=%2Floja%2Fcarrinho"
                      className="border border-iw-navy/30 hover:border-iw-navy text-iw-navy font-semibold text-sm px-5 py-2.5 rounded-lg transition-colors"
                    >
                      Já tenho conta — Entrar
                    </Link>
                  </div>
                </div>
              )}

              <div className="mb-5">
                <Label htmlFor="telefone">Telefone / WhatsApp</Label>
                <div className="flex gap-2">
                  <SelectInput
                    aria-label="País"
                    value={ddi}
                    onChange={(e) => {
                      setDdi(e.target.value);
                      setTelefoneDigitos("");
                    }}
                    className="w-28 shrink-0"
                  >
                    {PAISES_TELEFONE.map((p) => (
                      <option key={p.ddi} value={p.ddi}>
                        {p.ddi}
                      </option>
                    ))}
                  </SelectInput>
                  <TextInput
                    id="telefone"
                    value={telefoneFormatado}
                    placeholder={aplicarMascaraTelefone("", paisAtual.mascara) || "número"}
                    onChange={(e) => {
                      const digitos = e.target.value.replace(/\D/g, "").slice(0, paisAtual.digitos);
                      setTelefoneDigitos(digitos);
                    }}
                  />
                </div>
              </div>

              {temItemFisico && (
                <>
                  <h3 className="font-extrabold text-sm text-iw-navy mb-4 mt-6">
                    Endereço de entrega
                  </h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="cep" required>CEP</Label>
                      <TextInput
                        id="cep"
                        value={endereco.cep}
                        maxLength={9}
                        placeholder={loadingCep ? "Buscando..." : "00000-000"}
                        rightAddon={loadingCep ? <Loader2 className="w-4 h-4 animate-spin" /> : undefined}
                        onChange={(e) => {
                          const digitos = e.target.value.replace(/\D/g, "").slice(0, 8);
                          setEndereco({ ...endereco, cep: aplicarMascaraCep(digitos) });
                        }}
                        onBlur={handleBlurCep}
                      />
                    </div>
                    <div>
                      <Label htmlFor="uf" required>UF</Label>
                      <TextInput
                        id="uf"
                        maxLength={2}
                        value={endereco.uf}
                        onChange={(e) =>
                          setEndereco({ ...endereco, uf: e.target.value.toUpperCase() })
                        }
                      />
                    </div>
                    <div className="col-span-2">
                      <Label htmlFor="rua" required>Rua</Label>
                      <TextInput
                        id="rua"
                        uppercase
                        value={endereco.rua}
                        onChange={(e) => setEndereco({ ...endereco, rua: e.target.value })}
                      />
                    </div>
                    <div>
                      <Label htmlFor="numero" required>Número</Label>
                      <TextInput
                        id="numero"
                        uppercase
                        value={endereco.numero}
                        onChange={(e) => setEndereco({ ...endereco, numero: e.target.value })}
                      />
                    </div>
                    <div>
                      <Label htmlFor="complemento">Complemento</Label>
                      <TextInput
                        id="complemento"
                        uppercase
                        value={endereco.complemento}
                        onChange={(e) => setEndereco({ ...endereco, complemento: e.target.value })}
                      />
                    </div>
                    <div>
                      <Label htmlFor="bairro" required>Bairro</Label>
                      <TextInput
                        id="bairro"
                        uppercase
                        value={endereco.bairro}
                        onChange={(e) => setEndereco({ ...endereco, bairro: e.target.value })}
                      />
                    </div>
                    <div>
                      <Label htmlFor="cidade" required>Cidade</Label>
                      <TextInput
                        id="cidade"
                        uppercase
                        value={endereco.cidade}
                        onChange={(e) => setEndereco({ ...endereco, cidade: e.target.value })}
                      />
                    </div>
                  </div>
                </>
              )}
            </div>

            {/* ── Coluna direita: resumo da compra ── */}
            <div className="lg:col-span-5 bg-iw-bg border border-iw-border rounded-2xl p-6 lg:sticky lg:top-24">
              <h2 className="font-extrabold text-sm text-iw-navy mb-4">Resumo da compra</h2>

              <ul className="divide-y divide-iw-border border border-iw-border rounded-xl overflow-hidden mb-5 max-h-64 overflow-y-auto">
                {itens.map((item) => (
                  <li
                    key={item.productId}
                    className="flex items-center justify-between gap-3 px-4 py-3"
                  >
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-sm text-iw-navy truncate">{item.titulo}</p>
                      <p className="text-xs text-iw-muted">
                        R$ {(item.precoCentavos / 100).toFixed(2).replace(".", ",")} cada
                      </p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <input
                        type="number"
                        min={1}
                        value={item.quantidade}
                        onChange={(e) => {
                          atualizarQuantidade(item.productId, Number(e.target.value));
                          recarregar();
                        }}
                        className="w-12 text-center border border-iw-border rounded-lg py-1 text-sm"
                      />
                      <button
                        onClick={() => {
                          removerDoCarrinho(item.productId);
                          recarregar();
                        }}
                        aria-label="Remover item"
                        className="text-iw-error hover:opacity-70 transition-opacity"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </li>
                ))}
              </ul>

              <div className="flex items-center justify-between mb-5">
                <span className="font-bold text-iw-navy">Total</span>
                <span className="font-black text-xl text-iw-navy">
                  R$ {(totalCentavos / 100).toFixed(2).replace(".", ",")}
                </span>
              </div>

              <Button fullWidth size="lg" loading={isPending} onClick={handleFinalizar}>
                Finalizar Compra (Mercado Pago)
              </Button>

              <p className="text-center text-base text-iw-muted mt-4">
                Você precisa estar logado para finalizar. Se ainda não tem
                conta,{" "}
                <Link href="/cadastro?redirectTo=%2Floja%2Fcarrinho" className="text-iw-gold font-semibold hover:underline">
                  crie uma aqui
                </Link>
                .
              </p>
            </div>
          </div>
        )}
      </main>

      <PublicFooter minimal />
    </div>
  );
}
