"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { signOutAction } from "@/app/actions";
import { ShieldAlert, Clock, RefreshCw } from "lucide-react";

// Tempo de inatividade antes de deslogar (ms)
const INACTIVITY_LIMIT = 30 * 60 * 1000; // 30 minutos
const WARNING_BEFORE   =  5 * 60 * 1000; //  5 minutos antes do logout

const EVENTS = ["mousemove", "mousedown", "keydown", "touchstart", "scroll", "click"];

export default function AutoLogout() {
  const timerRef        = useRef<ReturnType<typeof setTimeout> | null>(null);
  const warningTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [showWarning, setShowWarning] = useState(false);
  const [countdown, setCountdown]     = useState(WARNING_BEFORE / 1000);
  const countdownRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const clearAll = () => {
    if (timerRef.current)        clearTimeout(timerRef.current);
    if (warningTimerRef.current) clearTimeout(warningTimerRef.current);
    if (countdownRef.current)    clearInterval(countdownRef.current);
  };

  const doLogout = useCallback(async () => {
    clearAll();
    await signOutAction();
  }, []);

  const startWarningCountdown = useCallback(() => {
    setShowWarning(true);
    setCountdown(WARNING_BEFORE / 1000);
    countdownRef.current = setInterval(() => {
      setCountdown((c) => {
        if (c <= 1) {
          clearInterval(countdownRef.current!);
          doLogout();
          return 0;
        }
        return c - 1;
      });
    }, 1000);
  }, [doLogout]);

  const resetTimer = useCallback(() => {
    clearAll();
    setShowWarning(false);
    setCountdown(WARNING_BEFORE / 1000);

    // Aviso: 5 min antes do logout
    warningTimerRef.current = setTimeout(() => {
      startWarningCountdown();
    }, INACTIVITY_LIMIT - WARNING_BEFORE);

    // Logout após 30 min
    timerRef.current = setTimeout(() => {
      doLogout();
    }, INACTIVITY_LIMIT);
  }, [doLogout, startWarningCountdown]);

  const continueSession = () => {
    resetTimer();
  };

  useEffect(() => {
    resetTimer();
    EVENTS.forEach((e) => window.addEventListener(e, resetTimer, { passive: true }));
    return () => {
      clearAll();
      EVENTS.forEach((e) => window.removeEventListener(e, resetTimer));
    };
  }, [resetTimer]);

  if (!showWarning) return null;

  const minutes = Math.floor(countdown / 60);
  const seconds = countdown % 60;
  const timeStr = minutes > 0
    ? `${minutes}:${String(seconds).padStart(2, "0")}`
    : `${seconds}s`;

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 backdrop-blur-sm animate-in fade-in duration-300">
      <div className="bg-white rounded-2xl shadow-2xl border border-iw-border w-full max-w-sm mx-4 overflow-hidden">

        {/* Header */}
        <div className="bg-iw-warning/10 border-b border-iw-warning/20 px-6 py-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-iw-warning/20 flex items-center justify-center shrink-0">
            <ShieldAlert className="w-5 h-5 text-iw-warning" />
          </div>
          <div>
            <p className="font-bold text-iw-navy text-sm">Sessão prestes a expirar</p>
            <p className="text-xs text-iw-muted">Inatividade detectada</p>
          </div>
        </div>

        {/* Body */}
        <div className="px-6 py-5 space-y-4">
          <p className="text-sm text-iw-muted leading-relaxed">
            Você ficou inativo por <strong className="text-iw-navy">25 minutos</strong>. Por segurança, sua sessão será encerrada automaticamente em:
          </p>

          {/* Countdown */}
          <div className="flex items-center justify-center gap-2 py-3 bg-iw-bg rounded-xl">
            <Clock className="w-5 h-5 text-iw-warning" />
            <span className="text-3xl font-black text-iw-navy tabular-nums">
              {timeStr}
            </span>
          </div>

          <p className="text-xs text-iw-muted text-center">
            Clique em <strong>Continuar</strong> para manter a sessão ativa.
          </p>
        </div>

        {/* Actions */}
        <div className="px-6 pb-5 flex gap-3">
          <button
            onClick={continueSession}
            className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-iw-blue text-white text-sm font-semibold hover:bg-iw-navy transition-colors"
          >
            <RefreshCw className="w-4 h-4" />
            Continuar sessão
          </button>
          <form action={signOutAction}>
            <button
              type="submit"
              className="px-4 py-2.5 rounded-xl border border-iw-border text-iw-muted text-sm font-medium hover:border-iw-error hover:text-iw-error transition-colors"
            >
              Sair agora
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
