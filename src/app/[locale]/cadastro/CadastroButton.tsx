"use client";

import { useFormStatus } from "react-dom";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui";

export default function CadastroButton() {
  const { pending } = useFormStatus();
  const t = useTranslations("auth.cadastro");
  return (
    <Button type="submit" fullWidth size="lg" loading={pending}>
      {t("criarMinhaConta")}
    </Button>
  );
}
