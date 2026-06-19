"use client";

/**
 * Input — CyberOS UI Framework v1.0 × portal-teologico-os
 *
 * Exports : Label | FieldWrapper | TextInput | PasswordInput | SelectInput
 * Extras  : error / hint states, leftAddon, rightAddon, forwardRef em todos
 */

import { forwardRef, useState } from "react";
import type { InputHTMLAttributes, SelectHTMLAttributes, LabelHTMLAttributes, ReactNode } from "react";
import { Eye, EyeOff } from "lucide-react";
import { cn } from "@/utils/cn";

// ── Shared base classes ────────────────────────────────────────

const INPUT_BASE =
  "w-full bg-iw-surface border text-iw-navy text-sm " +
  "placeholder-iw-muted rounded-[var(--radius-md)] " +
  "px-3 py-2.5 outline-none transition-all duration-150 " +
  "focus:ring-2 focus:ring-iw-blue/30 focus:border-iw-blue " +
  "disabled:opacity-50 disabled:cursor-not-allowed";

const INPUT_NORMAL  = "border-iw-border hover:border-iw-sky";
const INPUT_ERROR   = "border-iw-error focus:ring-iw-error/25 focus:border-iw-error";

// ── Label ─────────────────────────────────────────────────────

export interface LabelProps extends LabelHTMLAttributes<HTMLLabelElement> {
  required? : boolean;
  children  : ReactNode;
}

export function Label({ required, children, className, ...rest }: LabelProps) {
  return (
    <label
      className={cn("block text-xs font-semibold text-iw-navy mb-1.5", className)}
      {...rest}
    >
      {children}
      {required && <span className="ml-0.5 text-iw-error">*</span>}
    </label>
  );
}

// ── FieldWrapper ──────────────────────────────────────────────

export interface FieldWrapperProps {
  label?    : string;
  htmlFor?  : string;
  required? : boolean;
  error?    : string;
  hint?     : string;
  children  : ReactNode;
  className?: string;
}

export function FieldWrapper({
  label,
  htmlFor,
  required,
  error,
  hint,
  children,
  className,
}: FieldWrapperProps) {
  return (
    <div className={cn("flex flex-col gap-0", className)}>
      {label && (
        <Label htmlFor={htmlFor} required={required}>
          {label}
        </Label>
      )}
      {children}
      {error ? (
        <p className="mt-1 text-xs text-iw-error font-medium">{error}</p>
      ) : hint ? (
        <p className="mt-1 text-xs text-iw-muted">{hint}</p>
      ) : null}
    </div>
  );
}

// ── TextInput ─────────────────────────────────────────────────

export interface TextInputProps extends InputHTMLAttributes<HTMLInputElement> {
  error?      : string;
  leftAddon?  : ReactNode;
  rightAddon? : ReactNode;
}

export const TextInput = forwardRef<HTMLInputElement, TextInputProps>(
  ({ error, leftAddon, rightAddon, className, ...rest }, ref) => (
    <div className="relative flex items-center">
      {leftAddon && (
        <span className="absolute left-3 flex items-center pointer-events-none text-iw-muted">
          {leftAddon}
        </span>
      )}
      <input
        ref={ref}
        className={cn(
          INPUT_BASE,
          error ? INPUT_ERROR : INPUT_NORMAL,
          leftAddon  && "pl-9",
          rightAddon && "pr-9",
          className
        )}
        {...rest}
      />
      {rightAddon && (
        <span className="absolute right-3 flex items-center pointer-events-none text-iw-muted">
          {rightAddon}
        </span>
      )}
    </div>
  )
);
TextInput.displayName = "TextInput";

// ── PasswordInput ─────────────────────────────────────────────

export interface PasswordInputProps extends Omit<InputHTMLAttributes<HTMLInputElement>, "type"> {
  error?: string;
}

export const PasswordInput = forwardRef<HTMLInputElement, PasswordInputProps>(
  ({ error, className, ...rest }, ref) => {
    const [visible, setVisible] = useState(false);
    return (
      <div className="relative flex items-center">
        <input
          ref={ref}
          type={visible ? "text" : "password"}
          className={cn(
            INPUT_BASE,
            error ? INPUT_ERROR : INPUT_NORMAL,
            "pr-10",
            className
          )}
          {...rest}
        />
        <button
          type="button"
          tabIndex={-1}
          onClick={() => setVisible((v) => !v)}
          className="absolute right-3 text-iw-muted hover:text-iw-navy transition-colors"
          aria-label={visible ? "Ocultar senha" : "Mostrar senha"}
        >
          {visible ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
        </button>
      </div>
    );
  }
);
PasswordInput.displayName = "PasswordInput";

// ── SelectInput ───────────────────────────────────────────────

export interface SelectInputProps extends SelectHTMLAttributes<HTMLSelectElement> {
  error?    : string;
  children  : ReactNode;
}

export const SelectInput = forwardRef<HTMLSelectElement, SelectInputProps>(
  ({ error, children, className, ...rest }, ref) => (
    <select
      ref={ref}
      className={cn(
        INPUT_BASE,
        "appearance-none cursor-pointer",
        error ? INPUT_ERROR : INPUT_NORMAL,
        className
      )}
      {...rest}
    >
      {children}
    </select>
  )
);
SelectInput.displayName = "SelectInput";
