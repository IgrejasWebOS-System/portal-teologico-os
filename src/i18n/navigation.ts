import { createNavigation } from "next-intl/navigation";
import { routing } from "./routing";

// Versões de Link/redirect/useRouter que já sabem qual idioma está
// ativo — usar estas no lugar de "next/link" e "next/navigation" em
// qualquer componente/página que precise navegar dentro do site.
// Isso evita que alguém navegando em /en-US/... caia de volta em
// português ao clicar num link interno.
export const { Link, redirect, usePathname, useRouter, getPathname } =
  createNavigation(routing);
