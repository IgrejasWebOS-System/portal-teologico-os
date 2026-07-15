"use client";

import { useState } from "react";
import { Check, ShoppingCart } from "lucide-react";
import { Button } from "@/components/ui";
import { adicionarAoCarrinho, type TipoProduto } from "@/utils/carrinho";

interface Props {
  productId: string;
  titulo: string;
  precoCentavos: number;
  tipo: TipoProduto;
}

export default function AdicionarAoCarrinhoBotao({ productId, titulo, precoCentavos, tipo }: Props) {
  const [adicionado, setAdicionado] = useState(false);

  function handleClick() {
    adicionarAoCarrinho({ productId, titulo, precoCentavos, tipo });
    setAdicionado(true);
    setTimeout(() => setAdicionado(false), 1500);
  }

  return (
    <Button
      size="sm"
      variant={adicionado ? "secondary" : "primary"}
      leftIcon={adicionado ? <Check /> : <ShoppingCart />}
      onClick={handleClick}
      fullWidth
    >
      {adicionado ? "Adicionado!" : "Adicionar ao carrinho"}
    </Button>
  );
}
