"use client";

import { useFormStatus } from "react-dom";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui";

export default function RecuperarSenhaButton() {
  const { pending } = useFormStatus();
  const t = useTranslations("auth.recuperarSenha");
  return (
    <Button type="submit" fullWidth size="lg" loading={pending}>
      {t("enviarLink")}
    </Button>
  );
}
