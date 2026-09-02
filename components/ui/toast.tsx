"use client";

import { useState, useEffect, useCallback, createContext, useContext } from "react";
import { CheckCircle2, AlertCircle, Info, X } from "lucide-react";

// ---------------------------------------------------------------------------
// Lightweight Toast System — no external dependencies
// ---------------------------------------------------------------------------

type ToastType = "success" | "error" | "info";

type Toast = {
  id: string;
  message: string;
  type: ToastType;
};

type ToastContextType = {
  toast: (message: string, type?: ToastType) => void;
};

const ToastContext = createContext<ToastContextType>({ toast: () => {} });

export function useToast() {
  return useContext(ToastContext);
}

// Global toast function for use outside React components
let globalToast: (message: string, type?: ToastType) => void = () => {};

export function showToast(message: string, type: ToastType = "info") {
  globalToast(message, type);
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const addToast = useCallback((message: string, type: ToastType = "info") => {
    const id = `toast-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4000);
  }, []);

  useEffect(() => {
    globalToast = addToast;
    return () => { globalToast = () => {}; };
  }, [addToast]);

  const removeToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  const icons = {
    success: <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />,
    error: <AlertCircle className="h-4 w-4 text-red-400 shrink-0" />,
    info: <Info className="h-4 w-4 text-indigo-400 shrink-0" />,
  };

  const borders = {
    success: "border-emerald-500/30",
    error: "border-red-500/30",
    info: "border-indigo-500/30",
  };

  return (
    <ToastContext.Provider value={{ toast: addToast }}>
      {children}
      {/* Toast container */}
      <div className="fixed top-4 right-4 z-[100] flex flex-col gap-2 pointer-events-none">
        {toasts.map((t) => (
          <div
            key={t.id}
            className={`pointer-events-auto flex items-start gap-3 rounded-xl border ${borders[t.type]} bg-zinc-900/95 backdrop-blur-xl px-4 py-3 shadow-2xl animate-in slide-in-from-right-5 fade-in duration-300 max-w-sm`}
          >
            {icons[t.type]}
            <p className="text-sm text-zinc-200 leading-relaxed flex-1">{t.message}</p>
            <button
              onClick={() => removeToast(t.id)}
              className="text-zinc-600 hover:text-zinc-300 transition shrink-0"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}
