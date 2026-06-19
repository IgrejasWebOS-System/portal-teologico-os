"use client";

/**
 * Button — CyberOS UI Framework v1.0 × portal-teologico-os
 *
 * Variantes : primary | secondary | outline | ghost | danger
 * Tamanhos  : sm | md | lg
 * Extras    : loading spinner, leftIcon, rightIcon, fullWidth, forwardRef
 */

import { forwardRef } from "react";
import type { ButtonHTMLAttributes, ReactNode } from "react";
import { Loader2 } from "lucide-react";
import { cn } from "@/utils/cn";

// ── Tipos ─────────────────────────────────────────────────────

export type ButtonVariant = "primary" | "secondary" | "outline" | "ghost" | "danger";
export type ButtonSize    = "sm" | "md" | "lg";

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?   : ButtonVariant;
  size?      : ButtonSize;
  loading?   : boolean;
  fullWidth? : boolean;
  leftIcon?  : ReactNode;
  rightIcon? : ReactNode;
  children   : ReactNode;
}

// ── Estilos mapeados aos tokens iw-* + DS shadows ─────────────

const VARIANT: Record<ButtonVariant, string> = {
  primary:
    "bg-iw-blue text-white border-transparent " +
    "hover:bg-iw-navy shadow-[var(--shadow-sm)] hover:shadow-[var(--shadow-md)] " +
    "focus-visible:ring-2 focus-visible:ring-iw-blue/50 focus-visible:ring-offset-1",

  secondary:
    "bg-iw-gold/15 text-iw-navy border border-iw-gold/35 " +
    "hover:bg-iw-gold/25 " +
    "focus-visible:ring-2 focus-visible:ring-iw-gold/40 focus-visible:ring-offset-1",

  outline:
    "bg-transparent text-iw-blue border border-iw-blue " +
    "hover:bg-iw-blue/8 " +
    "focus-visible:ring-2 focus-visible:ring-iw-blue/40 focus-visible:ring-offset-1",

  ghost:
    "bg-transparent text-iw-navy border-transparent " +
    "hover:bg-iw-bg " +
    "focus-visible:ring-2 focus-visible:ring-iw-border focus-visible:ring-offset-1",

  danger:
    "bg-iw-error text-white border-transparent " +
    "hover:bg-red-700 shadow-[var(--shadow-sm)] hover:shadow-[var(--shadow-md)] " +
    "focus-visible:ring-2 focus-visible:ring-iw-error/50 focus-visible:ring-offset-1",
};

const SIZE: Record<ButtonSize, string> = {
  sm: "text-xs  px-3  py-1.5 gap-1.5 rounded-[var(--radius-md)]",
  md: "text-sm  px-4  py-2.5 gap-2   rounded-[var(--radius-lg)]",
  lg: "text-base px-6 py-3   gap-2.5 rounded-[var(--radius-lg)]",
};

const ICON: Record<ButtonSize, string> = {
  sm: "w-3.5 h-3.5",
  md: "w-4   h-4",
  lg: "w-5   h-5",
};

// ── Componente ────────────────────────────────────────────────

const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      variant   = "primary",
      size      = "md",
      loading   = false,
      fullWidth = false,
      leftIcon,
      rightIcon,
      disabled,
      children,
      className,
      ...rest
    },
    ref
  ) => (
    <button
      ref={ref}
      disabled={disabled || loading}
      className={cn(
        "inline-flex items-center justify-center font-semibold border",
        "transition-all duration-150 outline-none active:scale-[.98]",
        "disabled:opacity-50 disabled:cursor-not-allowed disabled:active:scale-100",
        VARIANT[variant],
        SIZE[size],
        fullWidth && "w-full",
        className
      )}
      {...rest}
    >
      {loading ? (
        <Loader2 className={cn(ICON[size], "animate-spin shrink-0")} />
      ) : leftIcon ? (
        <span className={cn(ICON[size], "shrink-0 flex items-center justify-center")}>
          {leftIcon}
        </span>
      ) : null}

      <span>{children}</span>

      {!loading && rightIcon && (
        <span className={cn(ICON[size], "shrink-0 flex items-center justify-center")}>
          {rightIcon}
        </span>
      )}
    </button>
  )
);

Button.displayName = "Button";

export { Button };
export default Button;
