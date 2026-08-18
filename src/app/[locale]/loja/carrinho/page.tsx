"use client";

import { useEffect, useState, useTransition } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
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
  { ddi: "+55", key: "brasil", mascara: "(00) 0 0000-0000", digitos: 11 },
  { ddi: "+1", key: "estadosUnidos", mascara: "(000) 000-0000", digitos: 10 },
  { ddi: "+351", key: "portugal", mascara: "000 000 000", digitos: 9 },
  { ddi: "+54", key: "argentina", mascara: "00 0000-0000", digitos: 10 },
] as const;

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
  const locale = useLocale();
  const t = useTranslations("loja.carrinho");
  const tPaises = useTranslations("loja.paises");
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
        setErro(t("erroEndereco"));
        return;
      }
    }

    const formData = new FormData();
    // Chamada direta da Server Action via JS (não <form action>), então o
    // locale vem do hook useLocale() do next-intl, não de campo oculto.
    formData.set("locale", locale);
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
    <div className="w-full min-h-screen bg-iw-surface text-iw-navy flex flex-col iw-scope-preto">
      <PublicHeader />

      <main className="flex-1 max-w-6xl mx-auto w-full px-6 py-10">
        <h1 className="text-2xl font-black tracking-tight mb-6">{t("titulo")}</h1>

        {erro && (
          <div className="mb-4 p-3 rounded-lg bg-iw-error-bg border border-iw-error text-iw-error text-sm">
            {erro}
          </div>
        )}

        {itens.length === 0 ? (
          <div className="bg-iw-bg border border-iw-border rounded-2xl p-10 text-center">
            <p className="text-iw-muted text-sm mb-4">{t("vazio")}</p>
            <Link href="/loja" className="text-iw-gold font-semibold hover:underline">
              {t("verCatalogo")}
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            {/* ── Coluna esquerda: dados cadastrais ── */}
            <div className="lg:col-span-7 bg-iw-bg border border-iw-border rounded-2xl p-6">
              <h2 className="font-extrabold text-sm text-iw-navy mb-4">{t("dadosCadastrais")}</h2>

              {!carregandoUsuario && usuario && (
                <div className="grid grid-cols-2 gap-4 mb-5">
                  <div className="col-span-2">
                    <Label htmlFor="nome-comprador">{t("nome")}</Label>
                    <TextInput
                      id="nome-comprador"
                      value={usuario.nome ?? t("naoInformado")}
                      disabled
                    />
                  </div>
                  <div className="col-span-2">
                    <Label htmlFor="email-comprador">{t("email")}</Label>
                    <TextInput id="email-comprador" value={usuario.email ?? ""} disabled />
                  </div>
                </div>
              )}

              {!carregandoUsuario && !usuario && (
                <div className="mb-5 p-4 rounded-lg bg-iw-gold/10 border border-iw-gold/40">
                  <p className="text-sm text-iw-navy font-semibold mb-1">
                    {t("semConta.titulo")}
                  </p>
                  <p className="text-xs text-iw-muted mb-3">
                    {t("semConta.texto")}
                  </p>
                  <div className="flex flex-wrap gap-3">
                    <Link
                      href="/cadastro?redirectTo=%2Floja%2Fcarrinho"
                      className="bg-[#E88D0C] hover:opacity-90 text-white font-bold text-sm px-5 py-2.5 rounded-lg transition-opacity border border-black"
                    >
                      {t("semConta.criarConta")}
                    </Link>
                    <Link
                      href="/login?redirectTo=%2Floja%2Fcarrinho"
                      className="border border-iw-navy/30 hover:border-iw-navy text-iw-navy font-semibold text-sm px-5 py-2.5 rounded-lg transition-colors"
                    >
                      {t("semConta.jaTenhoConta")}
                    </Link>
                  </div>
                </div>
              )}

              <div className="mb-5">
                <Label htmlFor="telefone">{t("telefone")}</Label>
                <div className="flex gap-2">
                  <SelectInput
                    aria-label={t("paisTelefone")}
                    value={ddi}
                    onChange={(e) => {
                      setDdi(e.target.value);
                      setTelefoneDigitos("");
                    }}
                    className="w-28 shrink-0"
                  >
                    {PAISES_TELEFONE.map((p) => (
                      <option key={p.ddi} value={p.ddi} title={tPaises(p.key)}>
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
                    {t("enderecoEntrega")}
                  </h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="cep" required>{t("cep")}</Label>
                      <TextInput
                        id="cep"
                        value={endereco.cep}
                        maxLength={9}
                        placeholder={loadingCep ? t("buscandoCep") : "00000-000"}
                        rightAddon={loadingCep ? <Loader2 className="w-4 h-4 animate-spin" /> : undefined}
                        onChange={(e) => {
                          const digitos = e.target.value.replace(/\D/g, "").slice(0, 8);
                          setEndereco({ ...endereco, cep: aplicarMascaraCep(digitos) });
                        }}
                        onBlur={handleBlurCep}
                      />
                    </div>
                    <div>
                      <Label htmlFor="uf" required>{t("uf")}</Label>
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
                      <Label htmlFor="rua" required>{t("rua")}</Label>
                      <TextInput
                        id="rua"
                        uppercase
                        value={endereco.rua}
                        onChange={(e) => setEndereco({ ...endereco, rua: e.target.value })}
                      />
                    </div>
                    <div>
                      <Label htmlFor="numero" required>{t("numero")}</Label>
                      <TextInput
                        id="numero"
                        uppercase
                        value={endereco.numero}
                        onChange={(e) => setEndereco({ ...endereco, numero: e.target.value })}
                      />
                    </div>
                    <div>
                      <Label htmlFor="complemento">{t("complemento")}</Label>
                      <TextInput
                        id="complemento"
                        uppercase
                        value={endereco.complemento}
                        onChange={(e) => setEndereco({ ...endereco, complemento: e.target.value })}
                      />
                    </div>
                    <div>
                      <Label htmlFor="bairro" required>{t("bairro")}</Label>
                      <TextInput
                        id="bairro"
                        uppercase
                        value={endereco.bairro}
                        onChange={(e) => setEndereco({ ...endereco, bairro: e.target.value })}
                      />
                    </div>
                    <div>
                      <Label htmlFor="cidade" required>{t("cidade")}</Label>
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
              <h2 className="font-extrabold text-sm text-iw-navy mb-4">{t("resumoCompra")}</h2>

              <ul className="divide-y divide-iw-border border border-iw-border rounded-xl overflow-hidden mb-5 max-h-64 overflow-y-auto">
                {itens.map((item) => (
                  <li
                    key={item.productId}
                    className="flex items-center justify-between gap-3 px-4 py-3"
                  >
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-sm text-iw-navy truncate">{item.titulo}</p>
                      <p className="text-xs text-iw-muted">
                        R$ {(item.precoCentavos / 100).toFixed(2).replace(".", ",")} {t("cada")}
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
                        className="w-12 text-center border border-black rounded-lg py-1 text-sm"
                      />
                      <button
                        onClick={() => {
                          removerDoCarrinho(item.productId);
                          recarregar();
                        }}
                        aria-label={t("removerItem")}
                        className="text-iw-error hover:opacity-70 transition-opacity"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </li>
                ))}
              </ul>

              <div className="flex items-center justify-between mb-5">
                <span className="font-bold text-iw-navy">{t("total")}</span>
                <span className="font-black text-xl text-iw-navy">
                  R$ {(totalCentavos / 100).toFixed(2).replace(".", ",")}
                </span>
              </div>

              <Button fullWidth size="lg" loading={isPending} onClick={handleFinalizar}>
                {t("finalizarCompra")}
              </Button>

              <p className="text-center text-base text-iw-muted mt-4">
                {t("loginAviso")}{" "}
                <Link href="/cadastro?redirectTo=%2Floja%2Fcarrinho" className="text-iw-gold font-semibold hover:underline">
                  {t("crieUmaAqui")}
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
