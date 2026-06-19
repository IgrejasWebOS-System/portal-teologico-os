/**
 * Badge — CyberOS UI Framework v1.0 × portal-teologico-os
 *
 * Variantes : default | primary | success | warning | danger | gold
 * Tamanhos  : sm | md
 */

import type { HTMLAttributes, ReactNode } from "react";
import { cn } from "@/utils/cn";

// ── Tipos ─────────────────────────────────────────────────────

export type BadgeVariant = "default" | "primary" | "success" | "warning" | "danger" | "gold";
export type BadgeSize    = "sm" | "md";

export interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  variant?  : BadgeVariant;
  size?     : BadgeSize;
  children  : ReactNode;
}

// ── Estilos ────────────────────────────────────────────────────

const VARIANT: Record<BadgeVariant, string> = {
  default : "bg-iw-bg text-iw-muted border-iw-border",
  primary : "bg-iw-blue/10 text-iw-blue border-iw-blue/20",
  success : "bg-iw-success/10 text-iw-success border-iw-success/20",
  warning : "bg-iw-warning-bg text-iw-warning border-iw-warning/30",
  danger  : "bg-iw-error-bg text-iw-error border-iw-error/30",
  gold    : "bg-iw-gold/10 text-iw-gold border-iw-gold/25",
};

const SIZE: Record<BadgeSize, string> = {
  sm: "text-[10px] px-2   py-0.5 gap-1",
  md: "text-xs    px-2.5 py-1   gap-1.5",
};

// ── Componente ────────────────────────────────────────────────

export function Badge({ variant = "default", size = "md", children, className, ...rest }: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center font-semibold border rounded-[var(--radius-full)]",
        VARIANT[variant],
        SIZE[size],
        className
      )}
      {...rest}
    >
      {children}
    </span>
  );
}

export default Badge;
