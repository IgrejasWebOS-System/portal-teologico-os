"use client";

import { useFormStatus } from "react-dom";
import { Button } from "@/components/ui";

export default function RecuperarSenhaButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" fullWidth size="lg" loading={pending}>
      Enviar link de recuperação
    </Button>
  );
}
