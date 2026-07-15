"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { Trash2 } from "lucide-react";
import PublicHeader from "@/components/public/PublicHeader";
import PublicFooter from "@/components/public/PublicFooter";
import { Button, Label, TextInput } from "@/components/ui";
import { useCarrinho } from "@/utils/useCarrinho";
import { removerDoCarrinho, atualizarQuantidade } from "@/utils/carrinho";
import { finalizarCompraAction } from "../checkout/actions";

interface Endereco {
  rua: string;
  numero: string;
  complemento: string;
  bairro: string;
  cidade: string;
  uf: string;
  cep: string;
}

const ENDERECO_VAZIO: Endereco = {
  rua: "",
  numero: "",
  complemento: "",
  bairro: "",
  cidade: "",
  uf: "",
  cep: "",
};

export default function CarrinhoPage() {
  const { itens, recarregar } = useCarrinho();
  const [isPending, startTransition] = useTransition();
  const [endereco, setEndereco] = useState<Endereco>(ENDERECO_VAZIO);
  const [erro, setErro] = useState<string | null>(null);

  const temItemFisico = itens.some((i) => i.tipo === "MATERIAL_FISICO");
  const totalCentavos = itens.reduce((soma, i) => soma + i.precoCentavos * i.quantidade, 0);

  function handleFinalizar() {
    setErro(null);

    if (itens.length === 0) return;

    if (temItemFisico) {
      const obrigatorios: (keyof Endereco)[] = ["rua", "numero", "bairro", "cidade", "uf", "cep"];
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

    startTransition(() => {
      finalizarCompraAction(formData);
    });
  }

  return (
    <div className="w-full min-h-screen bg-iw-surface text-iw-navy flex flex-col">
      <PublicHeader />

      <main className="flex-1 max-w-3xl mx-auto w-full px-6 py-12">
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
          <>
            <ul className="divide-y divide-iw-border bg-iw-bg border border-iw-border rounded-2xl overflow-hidden mb-8">
              {itens.map((item) => (
                <li
                  key={item.productId}
                  className="flex items-center justify-between gap-4 px-5 py-4"
                >
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-sm text-iw-navy truncate">{item.titulo}</p>
                    <p className="text-xs text-iw-muted">
                      R$ {(item.precoCentavos / 100).toFixed(2).replace(".", ",")} cada
                    </p>
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    <input
                      type="number"
                      min={1}
                      value={item.quantidade}
                      onChange={(e) => {
                        atualizarQuantidade(item.productId, Number(e.target.value));
                        recarregar();
                      }}
                      className="w-14 text-center border border-iw-border rounded-lg py-1.5 text-sm"
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

            {temItemFisico && (
              <div className="bg-iw-bg border border-iw-border rounded-2xl p-6 mb-8">
                <h2 className="font-extrabold text-sm text-iw-navy mb-4">
                  Endereço de entrega
                </h2>
                <div className="grid grid-cols-2 gap-4">
                  <div className="col-span-2">
                    <Label htmlFor="rua" required>Rua</Label>
                    <TextInput
                      id="rua"
                      value={endereco.rua}
                      onChange={(e) => setEndereco({ ...endereco, rua: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label htmlFor="numero" required>Número</Label>
                    <TextInput
                      id="numero"
                      value={endereco.numero}
                      onChange={(e) => setEndereco({ ...endereco, numero: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label htmlFor="complemento">Complemento</Label>
                    <TextInput
                      id="complemento"
                      value={endereco.complemento}
                      onChange={(e) => setEndereco({ ...endereco, complemento: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label htmlFor="bairro" required>Bairro</Label>
                    <TextInput
                      id="bairro"
                      value={endereco.bairro}
                      onChange={(e) => setEndereco({ ...endereco, bairro: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label htmlFor="cidade" required>Cidade</Label>
                    <TextInput
                      id="cidade"
                      value={endereco.cidade}
                      onChange={(e) => setEndereco({ ...endereco, cidade: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label htmlFor="uf" required>UF</Label>
                    <TextInput
                      id="uf"
                      maxLength={2}
                      value={endereco.uf}
                      onChange={(e) => setEndereco({ ...endereco, uf: e.target.value.toUpperCase() })}
                    />
                  </div>
                  <div>
                    <Label htmlFor="cep" required>CEP</Label>
                    <TextInput
                      id="cep"
                      value={endereco.cep}
                      onChange={(e) => setEndereco({ ...endereco, cep: e.target.value })}
                    />
                  </div>
                </div>
              </div>
            )}

            <div className="flex items-center justify-between mb-6">
              <span className="font-bold text-iw-navy">Total</span>
              <span className="font-black text-xl text-iw-navy">
                R$ {(totalCentavos / 100).toFixed(2).replace(".", ",")}
              </span>
            </div>

            <Button fullWidth size="lg" loading={isPending} onClick={handleFinalizar}>
              Finalizar Compra (Mercado Pago)
            </Button>

            <p className="text-center text-xs text-iw-muted mt-4">
              Você precisa estar logado para finalizar. Se ainda não tem
              conta,{" "}
              <Link href="/cadastro" className="text-iw-gold font-semibold hover:underline">
                crie uma aqui
              </Link>
              .
            </p>
          </>
        )}
      </main>

      <PublicFooter />
    </div>
  );
}
