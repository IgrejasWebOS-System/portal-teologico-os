"use client";

import { useState, type ReactNode } from "react";

interface Props {
  internas: ReactNode;
  nacional: ReactNode;
}

export default function RegioesTabs({ internas, nacional }: Props) {
  const [aba, setAba] = useState<"internas" | "nacional">("internas");

  return (
    <div className="space-y-6">
      <div className="flex gap-1 border-b border-iw-border">
        <button
          type="button"
          onClick={() => setAba("internas")}
          className={`px-3.5 py-2 text-sm text-black transition-colors ${
            aba === "internas" ? "font-semibold border-b-2 border-iw-blue" : "hover:font-semibold"
          }`}
        >
          Regiões internas do Setor
        </button>
        <button
          type="button"
          onClick={() => setAba("nacional")}
          className={`px-3.5 py-2 text-sm text-black transition-colors ${
            aba === "nacional" ? "font-semibold border-b-2 border-iw-blue" : "hover:font-semibold"
          }`}
        >
          Cobertura nacional
        </button>
      </div>

      <div className={aba === "internas" ? "" : "hidden"}>{internas}</div>
      <div className={aba === "nacional" ? "" : "hidden"}>{nacional}</div>
    </div>
  );
}
