"use client";

import { useFormStatus } from "react-dom";
import { Button } from "@/components/ui";

export default function CadastroButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" fullWidth size="lg" loading={pending}>
      Criar minha conta
    </Button>
  );
}
