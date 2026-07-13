/**
 * Card — CyberOS UI Framework v1.0 × portal-teologico-os
 *
 * Variantes : base | elevated | interactive | warning | danger
 * Slots     : CardHeader, CardBody, CardFooter
 * Extras    : StatCard (acents: blue | gold | success | error)
 */

import type { HTMLAttributes, ReactNode } from "react";
import { cn } from "@/utils/cn";

// ── Tipos ─────────────────────────────────────────────────────

export type CardVariant = "base" | "elevated" | "interactive" | "warning" | "danger";

export interface CardProps extends HTMLAttributes<HTMLDivElement> {
  variant?  : CardVariant;
  children  : ReactNode;
  className?: string;
}

// ── Variantes ─────────────────────────────────────────────────

const VARIANT: Record<CardVariant, string> = {
  base:
    "bg-iw-surface border border-iw-border shadow-[var(--shadow-sm)]",

  elevated:
    "bg-iw-surface border border-iw-border shadow-[var(--shadow-md)]",

  interactive:
    "bg-iw-surface border border-iw-border shadow-[var(--shadow-sm)] " +
    "cursor-pointer hover:border-iw-blue/40 hover:shadow-[var(--shadow-md)] " +
    "transition-all duration-150",

  warning:
    "bg-iw-warning-bg border border-iw-warning/30 shadow-[var(--shadow-sm)]",

  danger:
    "bg-iw-error-bg border border-iw-error/30 shadow-[var(--shadow-sm)]",
};

// ── Card base ─────────────────────────────────────────────────

export function Card({ variant = "base", children, className, ...rest }: CardProps) {
  return (
    <div
      className={cn(
        "rounded-[var(--radius-xl)] p-6",
        VARIANT[variant],
        className
      )}
      {...rest}
    >
      {children}
    </div>
  );
}

// ── Slots ─────────────────────────────────────────────────────

interface SlotProps {
  children  : ReactNode;
  className?: string;
}

export function CardHeader({ children, className }: SlotProps) {
  return (
    <div className={cn("mb-4 pb-4 border-b border-iw-border flex items-center justify-between gap-3", className)}>
      {children}
    </div>
  );
}

export function CardBody({ children, className }: SlotProps) {
  return (
    <div className={cn("min-h-0", className)}>
      {children}
    </div>
  );
}

export function CardFooter({ children, className }: SlotProps) {
  return (
    <div className={cn("mt-4 pt-4 border-t border-iw-border flex items-center gap-3", className)}>
      {children}
    </div>
  );
}

// ── StatCard ──────────────────────────────────────────────────

interface StatCardProps {
  title    : string;
  value    : string | number;
  subtitle?: string;
  icon     : ReactNode;
  accent?  : "blue" | "gold" | "success" | "error";
}

const ACCENT = {
  blue:    { bg: "bg-iw-blue/10",    icon: "text-iw-blue",    border: "border-iw-blue/20"    },
  gold:    { bg: "bg-iw-gold/10",    icon: "text-iw-gold",    border: "border-iw-gold/20"    },
  success: { bg: "bg-iw-success/10", icon: "text-iw-success", border: "border-iw-success/20" },
  error:   { bg: "bg-iw-error/10",   icon: "text-iw-error",   border: "border-iw-error/20"   },
};

export function StatCard({ title, value, subtitle, icon, accent = "blue" }: StatCardProps) {
  const a = ACCENT[accent];
  return (
    <div
      className={cn(
        "bg-iw-surface rounded-[var(--radius-xl)] border shadow-[var(--shadow-sm)] p-6",
        a.border
      )}
    >
      <div className="flex items-start gap-4">
        <div className={cn("flex items-center justify-center w-12 h-12 rounded-[var(--radius-lg)] shrink-0", a.bg)}>
          <span className={cn("w-6 h-6", a.icon)}>{icon}</span>
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-xs font-semibold text-iw-muted uppercase tracking-wider">
            {title}
          </p>
          <p className="text-3xl font-black text-iw-navy mt-1 leading-none">
            {value}
          </p>
          {subtitle && (
            <p className="text-xs text-iw-muted mt-1">{subtitle}</p>
          )}
        </div>
      </div>
    </div>
  );
}
