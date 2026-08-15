"use client";

import { useFormStatus } from "react-dom";
import { Button } from "@/components/ui";

export default function LoginButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" fullWidth size="lg" loading={pending} className="text-lg text-black">
      Entrar
    </Button>
  );
}
