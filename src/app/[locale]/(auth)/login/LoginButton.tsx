"use client";

import { useFormStatus } from "react-dom";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui";

export default function LoginButton() {
  const { pending } = useFormStatus();
  const t = useTranslations("auth.login");
  return (
    <Button type="submit" fullWidth size="lg" loading={pending} className="text-lg text-black">
      {t("entrar")}
    </Button>
  );
}
