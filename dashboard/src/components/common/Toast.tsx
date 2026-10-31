import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import { ToastMessage } from '../../types';
import { CheckCircle2, AlertCircle, AlertTriangle, Info, X } from 'lucide-react';

interface ToastContextType {
  addToast: (type: ToastMessage['type'], title: string, message?: string, duration?: number) => void;
  removeToast: (id: string) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export const ToastProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const addToast = useCallback((type: ToastMessage['type'], title: string, message?: string, duration = 4000) => {
    const id = `toast-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    const newToast: ToastMessage = { id, type, title, message, duration };

    setToasts((prev) => [...prev, newToast]);

    if (duration > 0) {
      setTimeout(() => {
        removeToast(id);
      }, duration);
    }
  }, [removeToast]);

  return (
    <ToastContext.Provider value={{ addToast, removeToast }}>
      {children}
      <div className="fixed bottom-5 right-5 z-50 flex flex-col gap-2.5 max-w-md pointer-events-none">
        {toasts.map((toast) => {
          let borderClass = 'border-slate-700 bg-slate-850';
          let IconComp = Info;
          let iconColor = 'text-blue-400';

          if (toast.type === 'success') {
            borderClass = 'border-emerald-500/40 bg-slate-900 shadow-emerald-950/20';
            IconComp = CheckCircle2;
            iconColor = 'text-emerald-400';
          } else if (toast.type === 'error') {
            borderClass = 'border-rose-500/40 bg-slate-900 shadow-rose-950/20';
            IconComp = AlertCircle;
            iconColor = 'text-rose-400';
          } else if (toast.type === 'warning') {
            borderClass = 'border-amber-500/40 bg-slate-900 shadow-amber-950/20';
            IconComp = AlertTriangle;
            iconColor = 'text-amber-400';
          }

          return (
            <div
              key={toast.id}
              className={`pointer-events-auto flex items-start gap-3 p-4 rounded-xl border shadow-xl backdrop-blur-md transition-all duration-200 transform translate-y-0 ${borderClass}`}
              role="alert"
            >
              <IconComp className={`${iconColor} shrink-0 mt-0.5`} size={18} />
              <div className="flex-1 min-w-0">
                <h4 className="text-sm font-semibold text-slate-100">{toast.title}</h4>
                {toast.message && <p className="text-xs text-slate-400 mt-0.5 leading-relaxed">{toast.message}</p>}
              </div>
              <button
                onClick={() => removeToast(toast.id)}
                className="text-slate-400 hover:text-slate-200 p-1 -mr-1 -mt-1 rounded-md transition-colors"
                aria-label="Close"
              >
                <X size={14} />
              </button>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
};

export const useToast = () => {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
};
